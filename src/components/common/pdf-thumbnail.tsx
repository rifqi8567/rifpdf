import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Setup worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfThumbnailProps {
  fileUrl: string;
}

export function PdfThumbnail({ fileUrl }: PdfThumbnailProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchUrl = async () => {
      const { data } = await supabase.storage.from('documents').createSignedUrl(fileUrl, 3600);
      if (data?.signedUrl) {
        setSignedUrl(data.signedUrl);
      } else {
        setError(true);
      }
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
