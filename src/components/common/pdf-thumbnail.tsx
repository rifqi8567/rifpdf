import { useState, useEffect, useRef } from 'react';
import { pdfjs } from 'react-pdf';
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const renderThumbnail = async () => {
      setIsLoading(true);
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
        const { data: blob, error: downloadError } = await supabase.storage
          .from('documents')
          .download(storagePath);

        if (blob) {
          logThumbnailDebug('blob url generated', {
            fileUrl,
            storagePath,
            blobSize: blob.size,
            blobType: blob.type,
            candidates,
          });

          const buffer = await blob.arrayBuffer();
          if (cancelled) return;

          const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
          const page = await pdf.getPage(1);
          if (cancelled) {
            pdf.destroy();
            return;
          }

          const canvas = canvasRef.current;
          const context = canvas?.getContext('2d');
          if (!canvas || !context) {
            pdf.destroy();
            throw new Error('Canvas thumbnail target is not available.');
          }

          const baseViewport = page.getViewport({ scale: 1 });
          const targetWidth = 400;
          const scale = targetWidth / baseViewport.width;
          const viewport = page.getViewport({ scale });
          const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

          canvas.width = Math.floor(viewport.width * pixelRatio);
          canvas.height = Math.floor(viewport.height * pixelRatio);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;

          context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
          context.clearRect(0, 0, viewport.width, viewport.height);

          await page.render({
            canvas,
            canvasContext: context,
            viewport,
          }).promise;

          pdf.destroy();
          if (cancelled) return;

          logThumbnailDebug('render document loaded', {
            fileUrl,
            pages: pdf.numPages,
          });
          setIsLoading(false);
          return;
        }

        logThumbnailDebug('download failed', {
          fileUrl,
          storagePath,
          error: downloadError,
        });
      }

      logThumbnailDebug('failed', { fileUrl, candidates });
      console.error('THUMBNAIL DOWNLOAD ERROR:', { fileUrl, candidates });
      if (!cancelled) {
        setError(true);
        setIsLoading(false);
      }
    };

    renderThumbnail().catch((renderError) => {
      logThumbnailDebug('render document failed', {
        fileUrl,
        error: renderError,
        message: renderError instanceof Error ? renderError.message : undefined,
        name: renderError instanceof Error ? renderError.name : undefined,
      });
      if (!cancelled) {
        setError(true);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface-3">
        <FileText className="h-12 w-12 text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex h-full w-full items-start justify-center overflow-hidden bg-white/5">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="min-h-full w-full object-cover"
      />
    </div>
  );
}
