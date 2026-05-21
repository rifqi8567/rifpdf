import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileText, Loader2 } from 'lucide-react';
import { configuredSupabaseUrl, supabase } from '@/lib/supabase';

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

const logThumbnailDebug = (label: string, details: Record<string, unknown>) => {
  console.groupCollapsed(`[PDF Thumbnail Debug] ${label}`);
  console.log('Supabase URL:', configuredSupabaseUrl);
  console.log('Details:', details);
  console.groupEnd();
};

export function PdfThumbnail({ fileUrl }: PdfThumbnailProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    const fetchPdf = async () => {
      setPdfUrl(null);
      setError(false);

      const candidates = getStoragePathCandidates(fileUrl);
      const storagePath = candidates[0];

      logThumbnailDebug('start', {
        originalFileUrl: fileUrl,
        normalizedPath: normalizeStoragePath(fileUrl),
        candidates,
        selectedStoragePath: storagePath,
      });

      if (storagePath) {
        const { data, error } = await supabase.storage
          .from('documents')
          .download(storagePath);

        if (data) {
          objectUrl = URL.createObjectURL(data);
          if (cancelled) {
            URL.revokeObjectURL(objectUrl);
            return;
          }

          logThumbnailDebug('blob url generated', {
            fileUrl,
            storagePath,
            blobSize: data.size,
            blobType: data.type,
            candidates,
          });
          setPdfUrl(objectUrl);
          return;
        }

        logThumbnailDebug('download failed', {
          fileUrl,
          storagePath,
          error,
        });
      }

      logThumbnailDebug('failed', { fileUrl, candidates });
      console.error('THUMBNAIL DOWNLOAD ERROR:', { fileUrl, candidates });
      if (!cancelled) setError(true);
    };

    fetchPdf();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileUrl]);

  if (error || !pdfUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface-3">
        {error ? <FileText className="h-12 w-12 text-muted-foreground/30" /> : <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-white/5">
      <Document
        file={pdfUrl}
        onLoadSuccess={(pdf) => {
          logThumbnailDebug('render document loaded', {
            fileUrl,
            pages: pdf.numPages,
          });
        }}
        onLoadError={(loadError) => {
          logThumbnailDebug('render document failed', {
            fileUrl,
            error: loadError,
          });
          setError(true);
        }}
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
