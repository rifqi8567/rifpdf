import { useState, useEffect, useRef } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { debugAction } from '@/lib/debug';

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
  debugAction('thumbnail', label, details);
};

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    name: typeof error,
    message: String(error),
    raw: error,
  };
};

const readPdfHeader = (bytes: Uint8Array) => {
  const head = bytes.slice(0, 16);
  const text = Array.from(head)
    .map((byte) => (byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.'))
    .join('');
  const hex = Array.from(head)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join(' ');

  return {
    text,
    hex,
    looksLikePdf: text.startsWith('%PDF-'),
  };
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
      const startedAt = performance.now();

      logThumbnailDebug('start', {
        originalFileUrl: fileUrl,
        normalizedPath: normalizeStoragePath(fileUrl),
        candidates,
        selectedStoragePath: storagePath,
        pdfjsVersion: pdfjs.version,
        workerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
        userAgent: navigator.userAgent,
      });

      if (storagePath) {
        logThumbnailDebug('download start', {
          fileUrl,
          storagePath,
        });

        const { data: blob, error: downloadError } = await supabase.storage
          .from('documents')
          .download(storagePath);

        if (blob) {
          logThumbnailDebug('download success', {
            fileUrl,
            storagePath,
            blobSize: blob.size,
            blobType: blob.type,
            candidates,
            elapsedMs: Math.round(performance.now() - startedAt),
          });

          const buffer = await blob.arrayBuffer();
          if (cancelled) return;

          const bytes = new Uint8Array(buffer);
          const header = readPdfHeader(bytes);

          logThumbnailDebug('buffer ready', {
            fileUrl,
            storagePath,
            byteLength: bytes.byteLength,
            header,
          });

          if (!header.looksLikePdf) {
            throw new Error(`Downloaded file is not a PDF. Header: ${header.text}`);
          }

          logThumbnailDebug('pdf load start', {
            fileUrl,
            storagePath,
          });

          const pdf = await pdfjs.getDocument({
            data: bytes,
            disableFontFace: true,
            useSystemFonts: true,
          }).promise;

          logThumbnailDebug('pdf load success', {
            fileUrl,
            storagePath,
            pages: pdf.numPages,
            elapsedMs: Math.round(performance.now() - startedAt),
          });

          logThumbnailDebug('page load start', {
            fileUrl,
            pageNumber: 1,
          });

          const page = await pdf.getPage(1);

          logThumbnailDebug('page load success', {
            fileUrl,
            pageNumber: 1,
            rotate: page.rotate,
            ref: page.ref,
          });

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

          logThumbnailDebug('render start', {
            fileUrl,
            pageNumber: 1,
            baseViewport: {
              width: baseViewport.width,
              height: baseViewport.height,
            },
            viewport: {
              width: viewport.width,
              height: viewport.height,
              scale,
            },
            pixelRatio,
            canvas: {
              width: canvas.width,
              height: canvas.height,
              styleWidth: canvas.style.width,
              styleHeight: canvas.style.height,
            },
          });

          await page.render({
            canvas,
            viewport,
          }).promise;

          const pageCount = pdf.numPages;
          pdf.destroy();
          if (cancelled) return;

          logThumbnailDebug('render document loaded', {
            fileUrl,
            pages: pageCount,
            elapsedMs: Math.round(performance.now() - startedAt),
          });
          setIsLoading(false);
          return;
        }

        logThumbnailDebug('download failed', {
          fileUrl,
          storagePath,
          error: serializeError(downloadError),
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
      const serializedError = serializeError(renderError);
      const message = serializedError.message;
      const name = serializedError.name;

      console.error(`PDF thumbnail render failed: ${name}: ${message}`, renderError);
      logThumbnailDebug('render document failed', {
        fileUrl,
        error: serializedError,
        message,
        name,
        canvas: canvasRef.current
          ? {
              width: canvasRef.current.width,
              height: canvasRef.current.height,
              styleWidth: canvasRef.current.style.width,
              styleHeight: canvasRef.current.style.height,
            }
          : null,
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
