import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Keep PDF thumbnails on the same bundled worker used by the tool pages.
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface PdfThumbnailProps {
  fileUrl: string;
}

const normalizeStoragePath = (value: string) => {
  if (!value) return value;

  const path = value
    .replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/(?:public|sign)\/documents\//, '')
    .replace(/^\/?storage\/v1\/object\/(?:public|sign)\/documents\//, '')
    .replace(/^documents\//, '')
    .replace(/^\/+/, '')
    .split('?')[0];

  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
};

const getStoragePathCandidates = (value: string) => {
  const normalizedPath = normalizeStoragePath(value);
  const rawPath = value.split('?')[0].replace(/^\/+/, '');
  const candidates = [
    normalizedPath,
    normalizedPath ? `documents/${normalizedPath}` : '',
    rawPath,
  ];

  return Array.from(new Set(candidates.filter(Boolean)));
};

export function PdfThumbnail({ fileUrl }: PdfThumbnailProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchUrl = async () => {
      const candidates = getStoragePathCandidates(fileUrl);
      const publicPath = candidates[0];

      if (publicPath) {
        const { data } = supabase.storage.from('documents').getPublicUrl(publicPath);
        if (data.publicUrl) {
          setSignedUrl(data.publicUrl);
          return;
        }
      }

      console.error('THUMBNAIL PUBLIC URL ERROR:', { fileUrl, candidates });
      setError(true);
    };
    fetchUrl();
  }, [fileUrl]);

  if (error || !signedUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface-3">
        {error ? <FileText className="h-12 w-12 text-muted-foreground/30" /> : <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-white/5">
      <Document
        file={signedUrl}
        loading={
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
          </div>
        }
        error={
          <div className="flex h-full w-full items-center justify-center">
            <FileText className="h-12 w-12 text-muted-foreground/30" />
          </div>
        }
        className="h-full w-full"
      >
        <Page
          pageNumber={1}
          width={400}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className="w-full h-full [&>canvas]:!w-full [&>canvas]:!h-full [&>canvas]:!object-cover"
        />
      </Document>
    </div>
  );
}
