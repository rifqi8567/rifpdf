import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { PDFPageProxy } from 'pdfjs-dist/types/src/display/api';
import {
  Merge,
  Scissors,
  Minimize2,
  PenTool,
  RefreshCw,
  ScanLine,
  ImageIcon,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Download,
  FolderPlus,
  X,
  ArrowDown,
  ArrowUp,
  GripVertical,
  Sparkles,
  Layers,
  Shield,
  RotateCw,
  FileImage,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileUpload } from '@/components/common/file-upload';
import { useState, useRef, useEffect } from 'react';
import { cn, formatFileSize } from '@/lib/utils';
import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';
import JSZip from 'jszip';
import initQpdf from 'qpdf-wasm';
import qpdfJsUrl from 'qpdf-wasm/qpdf.js?url';
import qpdfWasmUrl from 'qpdf-wasm/qpdf.wasm?url';
import { createWorker, PSM } from 'tesseract.js';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';
import { analyzeOcrText, convertWordToPdf } from '@/services/api';

// Keep PDF rendering fully client-side without depending on an external CDN.
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

const logToolDebug = (_label: string, _details: Record<string, unknown>) => undefined;

const serializeToolError = (error: unknown) => {
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

const readFileHeader = (bytes: Uint8Array) => {
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

const toolsConfig: Record<string, { title: string; description: string; icon: React.ElementType; color: string; bg: string }> = {
  merge: { title: 'Merge PDF', description: 'Gabungkan beberapa file PDF menjadi satu dokumen', icon: Merge, color: 'text-blue-400', bg: 'from-blue-500 to-blue-600' },
  split: { title: 'Split PDF', description: 'Pisahkan halaman PDF menjadi file terpisah', icon: Scissors, color: 'text-green-400', bg: 'from-green-500 to-green-600' },
  compress: { title: 'Compress PDF', description: 'Kurangi ukuran file PDF dengan kompresi cerdas', icon: Minimize2, color: 'text-orange-400', bg: 'from-orange-500 to-orange-600' },
  sign: { title: 'Tanda Tangan PDF', description: 'Tambahkan tanda tangan digital ke dokumen PDF', icon: PenTool, color: 'text-purple-400', bg: 'from-purple-500 to-purple-600' },
  convert: { title: 'Konversi PDF', description: 'Konversi file Office (Word, Excel, PPT) ke PDF atau sebaliknya', icon: RefreshCw, color: 'text-cyan-400', bg: 'from-cyan-500 to-cyan-600' },
  ocr: { title: 'OCR Scanner', description: 'Ekstrak teks dari gambar dan PDF scan menggunakan AI', icon: ScanLine, color: 'text-pink-400', bg: 'from-pink-500 to-pink-600' },
  'image-to-pdf': { title: 'Image to PDF', description: 'Konversi gambar menjadi dokumen PDF', icon: ImageIcon, color: 'text-indigo-400', bg: 'from-indigo-500 to-indigo-600' },
  rotate: { title: 'Rotate PDF', description: 'Putar semua halaman PDF langsung di browser', icon: RotateCw, color: 'text-teal-400', bg: 'from-teal-500 to-teal-600' },
  protect: { title: 'Protect PDF', description: 'Tambahkan lapisan proteksi metadata dan watermark ke PDF', icon: Shield, color: 'text-rose-400', bg: 'from-rose-500 to-rose-600' },
  'pdf-to-jpg': { title: 'PDF to JPG', description: 'Render halaman PDF menjadi gambar JPG dalam file ZIP', icon: FileImage, color: 'text-amber-400', bg: 'from-amber-500 to-amber-600' },
};

function LocalPdfPreview({ file }: { file: File }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: ReturnType<typeof pdfjs.getDocument> | null = null;

    const renderPreview = async () => {
      try {
        setFailed(false);
        const arrayBuffer = await file.arrayBuffer();
        loadingTask = pdfjs.getDocument({ data: arrayBuffer.slice(0) });
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        setPageCount(pdf.numPages);
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.34 });
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');

        if (!canvas || !context || cancelled) return;

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvas, viewport }).promise;
        page.cleanup();
      } catch (error) {
        if (!cancelled) setFailed(true);
      }
    };

    renderPreview();

    return () => {
      cancelled = true;
      loadingTask?.destroy();
    };
  }, [file]);

  return (
    <div className="relative flex h-32 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white">
      {failed ? (
        <FileText className="h-8 w-8 text-muted-foreground" />
      ) : (
        <canvas ref={canvasRef} className="max-h-full max-w-full" />
      )}
      {pageCount !== null && (
        <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
          {pageCount} hal
        </div>
      )}
    </div>
  );
}

function LocalPdfFullPreview({ blob, name }: { blob: Blob; name: string }) {
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    setPreviewUrl(`${url}#toolbar=0&navpanes=0&scrollbar=0`);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [blob]);

  return (
    <div className="h-[420px] overflow-hidden rounded-xl border border-border bg-white">
      {previewUrl ? (
        <iframe
          title={`Preview ${name}`}
          src={previewUrl}
          className="h-full w-full bg-white"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Memuat preview PDF...
        </div>
      )}
    </div>
  );
}

function SignPlacementPreview({
  file,
  signatureDataUrl,
  targetPage,
  placement,
  onPlace,
}: {
  file: File;
  signatureDataUrl: string;
  targetPage: number;
  placement: SignaturePlacement | null;
  onPlace: (placement: SignaturePlacement) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderSize, setRenderSize] = useState({ width: 0, height: 0 });
  const [pdfPageSize, setPdfPageSize] = useState({ width: 0, height: 0 });
  const [isDraggingSignature, setIsDraggingSignature] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: ReturnType<typeof pdfjs.getDocument> | null = null;

    const renderPage = async () => {
      const arrayBuffer = await file.arrayBuffer();
      loadingTask = pdfjs.getDocument({ data: arrayBuffer.slice(0) });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(Math.max(1, Math.min(targetPage, pdf.numPages)));
      const viewport = page.getViewport({ scale: 0.9 });
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');

      if (!canvas || !context || cancelled) return;

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;

      if (!cancelled) {
        setRenderSize({ width: canvas.width, height: canvas.height });
        const rawViewport = page.getViewport({ scale: 1 });
        setPdfPageSize({ width: rawViewport.width, height: rawViewport.height });
      }
      page.cleanup();
    };

    renderPage().catch((error) => {
      console.error('Failed to render sign placement preview:', error);
    });

    return () => {
      cancelled = true;
      loadingTask?.destroy();
    };
  }, [file, targetPage]);

  const getPlacementFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pdfPageSize.width || !pdfPageSize.height) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    const normalizedX = clickX / rect.width;
    const normalizedY = clickY / rect.height;

    return {
      page: targetPage,
      xRatio: Math.max(0, Math.min(1, normalizedX)),
      yRatio: Math.max(0, Math.min(1, normalizedY)),
    };
  };

  return (
    <div className="space-y-3">
      <div
        className="relative mx-auto max-h-[520px] max-w-full cursor-none overflow-auto rounded-xl border border-border bg-white touch-none"
        onPointerDown={(event) => {
          const nextPlacement = getPlacementFromPointer(event);
          if (!nextPlacement) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          setIsDraggingSignature(true);
          onPlace(nextPlacement);
        }}
        onPointerMove={(event) => {
          if (!isDraggingSignature) return;
          const nextPlacement = getPlacementFromPointer(event);
          if (nextPlacement) onPlace(nextPlacement);
        }}
        onPointerUp={(event) => {
          setIsDraggingSignature(false);
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => setIsDraggingSignature(false)}
      >
        <canvas ref={canvasRef} className="block max-w-none" />
        {placement && placement.page === targetPage && renderSize.width > 0 && (
          <img
            src={signatureDataUrl}
            alt="Preview tanda tangan"
            className="pointer-events-none absolute h-auto w-36 -translate-x-1/2 -translate-y-1/2 drop-shadow-lg transition-transform duration-75"
            style={{
              left: `${placement.xRatio * renderSize.width}px`,
              top: `${placement.yRatio * renderSize.height}px`,
              transform: `translate(-50%, -50%) scale(${isDraggingSignature ? 1.05 : 1})`,
            }}
          />
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Tekan dan geser tanda tangan di atas PDF untuk mengatur posisi.
      </p>
    </div>
  );
}

interface SplitOutput {
  name: string;
  blob: Blob;
  pageCount: number;
}

interface SignaturePlacement {
  page: number;
  xRatio: number;
  yRatio: number;
}

interface OcrPageResult {
  label: string;
  text: string;
  source: 'text-layer' | 'ocr';
  confidence?: number;
}

type OcrWorker = Awaited<ReturnType<typeof createWorker>>;

type QpdfModule = {
  FS: {
    writeFile: (path: string, data: Uint8Array) => void;
    readFile: (path: string) => Uint8Array;
    unlink: (path: string) => void;
  };
  callMain: (args: string[]) => number;
};

let qpdfModulePromise: Promise<QpdfModule> | null = null;

const getQpdfModule = () => {
  qpdfModulePromise ??= initQpdf({
    locateFile: (path: string) => {
      if (path.endsWith('.wasm')) return qpdfWasmUrl;
      if (path.endsWith('.js')) return qpdfJsUrl;
      return path;
    },
    print: () => undefined,
    printErr: console.warn,
  }) as Promise<QpdfModule>;

  return qpdfModulePromise;
};

export default function ToolPage() {
  const { toolId } = useParams<{ toolId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [files, setFiles] = useState<File[]>([]);
  
  // Processing States
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  
  // Success Modal States
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [processedDocName, setProcessedDocName] = useState('Hasil Proses.pdf');
  const [totalPages, setTotalPages] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [splitOutputs, setSplitOutputs] = useState<SplitOutput[]>([]);
  const [draggedMergeIndex, setDraggedMergeIndex] = useState<number | null>(null);
  const [selectedMergeIndex, setSelectedMergeIndex] = useState(0);

  // Split Configuration State
  const [splitRange, setSplitRange] = useState('1-2,3-4');
  const [splitMode, setSplitMode] = useState<'all' | 'groups'>('all');

  // Compress Configuration State
  const [compressMode, setCompressMode] = useState<'target-size' | 'quality'>('target-size');
  const [compressLevel, setCompressLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [targetSizeMb, setTargetSizeMb] = useState('1');
  const [compressStats, setCompressStats] = useState<{ before: number; after: number; target?: number } | null>(null);

  // Sign Configuration State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signPageNum, setSignPageNum] = useState(1);
  const [signatureColor, setSignatureColor] = useState('#111111');
  const [signatureStrokeWidth, setSignatureStrokeWidth] = useState(3);
  const [signaturePlacement, setSignaturePlacement] = useState<SignaturePlacement | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState('');

  // Rotate / Protect / Export Configuration State
  const [rotateDegrees, setRotateDegrees] = useState<90 | 180 | 270>(90);
  const [protectPassword, setProtectPassword] = useState('');
  const [protectPasswordConfirm, setProtectPasswordConfirm] = useState('');
  const [jpgQuality, setJpgQuality] = useState(0.86);

  // OCR Output State
  const [ocrText, setOcrText] = useState('');
  const [isOcrMode, setIsOcrMode] = useState(false);
  const [ocrSummary, setOcrSummary] = useState('');

  // Conversion Mode State
  const [conversionType, setConversionType] = useState<'word-to-pdf' | 'excel-to-pdf' | 'ppt-to-pdf'>('word-to-pdf');

  const tool = toolsConfig[toolId || 'merge'];

  useEffect(() => {
    // Reset states on tool change
    setFiles([]);
    setProcessedBlob(null);
    setSplitOutputs([]);
    setCompressStats(null);
    setShowSuccessModal(false);
    setOcrText('');
    setIsOcrMode(false);
    setOcrSummary('');
    setHasSignature(false);
    setSignatureColor('#111111');
    setSignatureStrokeWidth(3);
    setSignaturePlacement(null);
    setSignatureDataUrl('');
    setProtectPassword('');
    setProtectPasswordConfirm('');
    setSelectedMergeIndex(0);
  }, [toolId]);

  useEffect(() => {
    if (selectedMergeIndex > files.length - 1) {
      setSelectedMergeIndex(Math.max(0, files.length - 1));
    }
  }, [files.length, selectedMergeIndex]);

  if (!tool) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Tool tidak ditemukan</p>
      </div>
    );
  }

  // --- SIGN CANVAS METHODS ---
  const getSignatureCanvasPoint = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const point = 'touches' in e ? e.touches[0] : e;
    if (!point) return null;

    const rect = canvas.getBoundingClientRect();
    return {
      x: (point.clientX - rect.left) * (canvas.width / rect.width),
      y: (point.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const point = getSignatureCanvasPoint(e);
    if (!point) return;

    ctx.strokeStyle = signatureColor;
    ctx.lineWidth = signatureStrokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const point = getSignatureCanvasPoint(e);
    if (!point) return;

    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setSignatureDataUrl('');
    setSignaturePlacement(null);
  };

  const bytesToArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    return buffer;
  };

  const pdfBlob = (bytes: Uint8Array) => new Blob([bytesToArrayBuffer(bytes)], { type: 'application/pdf' });

  const cloneArrayBuffer = (buffer: ArrayBuffer) => buffer.slice(0);

  const completeProcessing = (blob: Blob, name: string, pages: number, message: string) => {
    setProcessedBlob(blob);
    setSplitOutputs([]);
    setTotalPages(pages);
    setProcessedDocName(name);
    setIsProcessing(false);
    toast.success(message);
    setShowSuccessModal(true);
  };

  const parsePageRange = (range: string, pageCount: number) => {
    const pages = new Set<number>();
    const tokens = range.split(',').map((token) => token.trim()).filter(Boolean);

    for (const token of tokens) {
      const [startRaw, endRaw] = token.split('-');
      const start = Number.parseInt(startRaw, 10);
      const end = Number.parseInt(endRaw || startRaw, 10);

      if (Number.isNaN(start) || Number.isNaN(end)) {
        throw new Error('Format halaman tidak valid. Gunakan contoh: 1-3,5,8.');
      }

      const from = Math.max(1, Math.min(start, end));
      const to = Math.min(pageCount, Math.max(start, end));
      for (let page = from; page <= to; page++) {
        pages.add(page - 1);
      }
    }

    if (pages.size === 0) {
      throw new Error('Tidak ada halaman valid yang dipilih.');
    }

    return Array.from(pages).sort((a, b) => a - b);
  };

  const parseSplitGroups = (range: string, pageCount: number) => {
    const groups = range.split(',').map((token) => token.trim()).filter(Boolean);
    if (groups.length === 0) {
      throw new Error('Masukkan minimal satu rentang halaman.');
    }

    return groups.map((group) => ({
      label: group,
      pages: parsePageRange(group, pageCount),
    }));
  };

  const downloadBlob = (blob: Blob, name: string) => {
    const startedAt = performance.now();
    logToolDebug('download blob start', {
      name,
      blobSize: blob.size,
      blobType: blob.type,
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);

    logToolDebug('download blob handoff success', {
      name,
      blobSize: blob.size,
      elapsedMs: Math.round(performance.now() - startedAt),
    });
  };

  const encryptPdfWithPassword = async (pdfBytes: Uint8Array, password: string) => {
    const qpdf = await getQpdfModule();
    const jobId = crypto.randomUUID().replace(/-/g, '');
    const inputPath = `/tmp/input_${jobId}.pdf`;
    const outputPath = `/tmp/output_${jobId}.pdf`;

    qpdf.FS.writeFile(inputPath, pdfBytes);

    try {
      const exitCode = qpdf.callMain([
        '--encrypt',
        password,
        password,
        '256',
        '--',
        inputPath,
        outputPath,
      ]);

      if (exitCode !== 0) {
        throw new Error(`qpdf gagal mengenkripsi PDF. Exit code: ${exitCode}`);
      }

      const encryptedBytes = qpdf.FS.readFile(outputPath);

      try {
        await PDFDocument.load(bytesToArrayBuffer(encryptedBytes));
        throw new Error('Hasil Protect PDF belum terenkripsi. Coba ulangi dengan password berbeda.');
      } catch (error: any) {
        const message = String(error?.message || '');
        if (message.includes('Input document to `PDFDocument.load` is encrypted')) {
          return encryptedBytes;
        }
        throw error;
      }
    } finally {
      try { qpdf.FS.unlink(inputPath); } catch {}
      try { qpdf.FS.unlink(outputPath); } catch {}
    }
  };

  const moveMergeFile = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= files.length || fromIndex === toIndex) return;

    setFiles((currentFiles) => {
      const nextFiles = [...currentFiles];
      const [movedFile] = nextFiles.splice(fromIndex, 1);
      nextFiles.splice(toIndex, 0, movedFile);
      return nextFiles;
    });
    setSelectedMergeIndex(toIndex);
  };

  const handleMergeDrop = (targetIndex: number) => {
    if (draggedMergeIndex === null) return;
    moveMergeFile(draggedMergeIndex, targetIndex);
    setDraggedMergeIndex(null);
  };

  const prepareSignaturePlacement = () => {
    if (!canvasRef.current || !hasSignature) {
      toast.warning('Gambar tanda tangan terlebih dahulu.');
      return;
    }

    setSignatureDataUrl(canvasRef.current.toDataURL('image/png'));
    toast.success('Tanda tangan siap ditempatkan. Klik posisi di PDF.');
  };

  // --- ACTIONS DISPATCHER ---
  const handleProcess = async () => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      if (toolId === 'merge') {
        await processMerge();
      } else if (toolId === 'split') {
        await processSplit();
      } else if (toolId === 'compress') {
        await processCompress();
      } else if (toolId === 'image-to-pdf') {
        await processImageToPdf();
      } else if (toolId === 'sign') {
        await processSign();
      } else if (toolId === 'ocr') {
        await processOcr();
      } else if (toolId === 'convert') {
        await processConversion();
      } else if (toolId === 'rotate') {
        await processRotate();
      } else if (toolId === 'protect') {
        await processProtect();
      } else if (toolId === 'pdf-to-jpg') {
        await processPdfToJpg();
      } else {
        await processMockup();
      }
    } catch (err: any) {
      toast.error('Gagal memproses dokumen: ' + err.message);
      console.error(err);
      setIsProcessing(false);
    }
  };

  // --- 1. MERGE PDF ---
  const processMerge = async () => {
    if (files.length < 2) {
      toast.warning('Silakan pilih minimal 2 file PDF untuk digabungkan.');
      setIsProcessing(false);
      return;
    }
    setProcessingMessage('Membaca dan menggabungkan halaman PDF...');
    
    const mergedPdf = await PDFDocument.create();
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }
    
    const mergedPdfBytes = await mergedPdf.save();
    completeProcessing(
      pdfBlob(mergedPdfBytes),
      `merged_${Date.now()}.pdf`,
      mergedPdf.getPageCount(),
      'PDF berhasil digabungkan!'
    );
  };

  // --- 2. SPLIT PDF ---
  const processSplit = async () => {
    setProcessingMessage('Memisahkan halaman PDF...');
    const file = files[0];
    const sourceBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(cloneArrayBuffer(sourceBuffer));
    const totalPdfPages = pdf.getPageCount();
    const baseName = file.name.replace(/\.[^/.]+$/, '') || 'split';

    const outputs: SplitOutput[] = [];

    if (splitMode === 'groups') {
      const groups = parseSplitGroups(splitRange, totalPdfPages);

      if (groups.length === 1) {
        for (const pageIndex of groups[0].pages) {
          const splitPdf = await PDFDocument.create();
          const [copiedPage] = await splitPdf.copyPages(pdf, [pageIndex]);
          splitPdf.addPage(copiedPage);
          const splitPdfBytes = await splitPdf.save();

          outputs.push({
            name: `${baseName}_page_${String(pageIndex + 1).padStart(3, '0')}.pdf`,
            blob: pdfBlob(splitPdfBytes),
            pageCount: 1,
          });
        }
      } else {
        for (const group of groups) {
          const splitPdf = await PDFDocument.create();
          const copiedPages = await splitPdf.copyPages(pdf, group.pages);
          copiedPages.forEach((page) => splitPdf.addPage(page));
          const splitPdfBytes = await splitPdf.save();

          outputs.push({
            name: `${baseName}_pages_${group.label.replace(/[^0-9-]/g, '_')}.pdf`,
            blob: pdfBlob(splitPdfBytes),
            pageCount: splitPdf.getPageCount(),
          });
        }
      }
    } else {
      for (const pageIndex of pdf.getPageIndices()) {
        const splitPdf = await PDFDocument.create();
        const [copiedPage] = await splitPdf.copyPages(pdf, [pageIndex]);
        splitPdf.addPage(copiedPage);
        const splitPdfBytes = await splitPdf.save();

        outputs.push({
          name: `${baseName}_page_${String(pageIndex + 1).padStart(3, '0')}.pdf`,
          blob: pdfBlob(splitPdfBytes),
          pageCount: 1,
        });
      }
    }

    setSplitOutputs(outputs);
    setProcessedBlob(null);
    setTotalPages(outputs.reduce((sum, output) => sum + output.pageCount, 0));
    setProcessedDocName(`${baseName}_split`);
    setIsProcessing(false);
    toast.success(`PDF berhasil dipisahkan menjadi ${outputs.length} file!`);
    setShowSuccessModal(true);
  };

  // --- 3. COMPRESS PDF ---
  const processCompress = async () => {
    setProcessingMessage('Mengompres dokumen PDF...');
    const file = files[0];
    
    const sourceBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(cloneArrayBuffer(sourceBuffer));

    pdf.setProducer('DocuMind PDF Compressor');
    pdf.setCreator('DocuMind');
    pdf.setModificationDate(new Date());
    
    const compressedPdfBytes = await pdf.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: compressLevel === 'high' ? 100 : compressLevel === 'medium' ? 50 : 25,
    });
    let compressedBlob = pdfBlob(compressedPdfBytes);
    const targetBytes = Math.max(0, Number.parseFloat(targetSizeMb) || 0) * 1024 * 1024;

    const shouldRasterCompress =
      compressMode === 'target-size' ||
      compressLevel === 'medium' ||
      compressLevel === 'high' ||
      compressedBlob.size >= file.size * 0.96;

    if (shouldRasterCompress) {
      try {
        const rasterBlob = await rasterCompressPdf(sourceBuffer, pdf, targetBytes);
        if (rasterBlob.size < compressedBlob.size) {
          compressedBlob = rasterBlob;
        }
      } catch (error) {
        console.error('Raster compression failed:', error);
        toast.warning('Kompresi gambar gagal untuk file ini. Menggunakan hasil optimasi aman.');
      }
    }

    setCompressStats({
      before: file.size,
      after: compressedBlob.size,
      target: compressMode === 'target-size' ? targetBytes : undefined,
    });

    if (compressMode === 'target-size' && targetBytes > 0 && compressedBlob.size > targetBytes) {
      toast.warning('Target ukuran terlalu kecil untuk kompresi lossless di browser. Hasil sudah dioptimalkan tanpa merusak isi PDF.');
    }
    
    completeProcessing(
      compressedBlob,
      `compressed_${Date.now()}.pdf`,
      pdf.getPageCount(),
      'PDF berhasil dioptimalkan!'
    );
  };

  const rasterCompressPdf = async (sourceBuffer: ArrayBuffer, sourcePdf: PDFDocument, targetBytes: number) => {
    const presets =
      compressMode === 'target-size'
        ? [
            { scale: 1.35, quality: 0.72 },
            { scale: 1.15, quality: 0.62 },
            { scale: 0.95, quality: 0.52 },
            { scale: 0.78, quality: 0.42 },
          ]
        : compressLevel === 'high'
        ? [{ scale: 0.95, quality: 0.52 }]
        : compressLevel === 'medium'
        ? [{ scale: 1.15, quality: 0.64 }]
        : [{ scale: 1.45, quality: 0.78 }];

    let bestBlob: Blob | null = null;

    for (let presetIndex = 0; presetIndex < presets.length; presetIndex++) {
      const preset = presets[presetIndex];
      setProcessingMessage(`Mengompres gambar halaman (${presetIndex + 1}/${presets.length})...`);

      const loadingTask = pdfjs.getDocument({
        data: cloneArrayBuffer(sourceBuffer),
      });
      const pdfForRender = await loadingTask.promise;
      const outputPdf = await PDFDocument.create();

      for (let pageNum = 1; pageNum <= pdfForRender.numPages; pageNum++) {
        setProcessingMessage(`Mengompres halaman ${pageNum}/${pdfForRender.numPages}...`);
        const renderPage = await pdfForRender.getPage(pageNum);
        const viewport = renderPage.getViewport({ scale: preset.scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
          throw new Error('Canvas browser tidak tersedia.');
        }

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await renderPage.render({ canvas, viewport }).promise;

        const jpegBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Gagal mengompres halaman PDF.'));
          }, 'image/jpeg', preset.quality);
        });

        const jpegImage = await outputPdf.embedJpg(await jpegBlob.arrayBuffer());
        const originalPage = sourcePdf.getPage(pageNum - 1);
        const { width, height } = originalPage.getSize();
        const outputPage = outputPdf.addPage([width, height]);

        outputPage.drawImage(jpegImage, {
          x: 0,
          y: 0,
          width,
          height,
        });

        renderPage.cleanup();
        canvas.width = 0;
        canvas.height = 0;
      }

      loadingTask.destroy();
      const outputBytes = await outputPdf.save({ useObjectStreams: true });
      const outputBlob = pdfBlob(outputBytes);

      if (!bestBlob || outputBlob.size < bestBlob.size) {
        bestBlob = outputBlob;
      }

      if (targetBytes > 0 && outputBlob.size <= targetBytes) {
        return outputBlob;
      }
    }

    if (!bestBlob) {
      throw new Error('Gagal membuat hasil kompresi.');
    }

    return bestBlob;
  };

  // --- 4. IMAGE TO PDF ---
  const processImageToPdf = async () => {
    setProcessingMessage('Mengubah gambar menjadi PDF...');
    const pdfDoc = await PDFDocument.create();

    for (const file of files) {
      const page = pdfDoc.addPage();
      const imageBytes = await file.arrayBuffer();
      let embeddedImage;

      if (file.type === 'image/png') {
        embeddedImage = await pdfDoc.embedPng(imageBytes);
      } else {
        embeddedImage = await pdfDoc.embedJpg(imageBytes);
      }

      const { width, height } = embeddedImage.scale(1);
      
      page.setSize(width, height);
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width,
        height,
      });
    }

    const pdfBytes = await pdfDoc.save();
    completeProcessing(
      pdfBlob(pdfBytes),
      `images_${Date.now()}.pdf`,
      files.length,
      'Gambar berhasil diubah menjadi PDF!'
    );
  };

  // --- 5. SIGN PDF ---
  const processSign = async () => {
    if (!hasSignature || !canvasRef.current) {
      toast.warning('Silakan gambar tanda tangan Anda terlebih dahulu.');
      setIsProcessing(false);
      return;
    }

    if (!signaturePlacement) {
      toast.warning('Klik posisi tanda tangan di preview PDF terlebih dahulu.');
      setIsProcessing(false);
      return;
    }

    setProcessingMessage('Menempelkan tanda tangan ke PDF...');
    const file = files[0];
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const totalPdfPages = pdf.getPageCount();

    const signatureDataUrl = canvasRef.current.toDataURL('image/png');
    const signatureBytes = await fetch(signatureDataUrl).then(res => res.arrayBuffer());

    const signatureImage = await pdf.embedPng(signatureBytes);
    
    const targetPageIndex = Math.max(0, Math.min(signaturePlacement.page - 1, totalPdfPages - 1));
    const targetPage = pdf.getPage(targetPageIndex);
    const { width: pageWidth, height: pageHeight } = targetPage.getSize();

    const sigWidth = 150;
    const sigHeight = 75;
    targetPage.drawImage(signatureImage, {
      x: Math.max(0, Math.min(pageWidth - sigWidth, signaturePlacement.xRatio * pageWidth - sigWidth / 2)),
      y: Math.max(0, Math.min(pageHeight - sigHeight, pageHeight - signaturePlacement.yRatio * pageHeight - sigHeight / 2)),
      width: sigWidth,
      height: sigHeight,
    });

    const signedPdfBytes = await pdf.save();
    completeProcessing(
      pdfBlob(signedPdfBytes),
      `signed_${Date.now()}.pdf`,
      totalPdfPages,
      'Tanda tangan berhasil ditempel!'
    );
  };

  // --- 6. OCR SCANNER ---
  const processOcr = async () => {
    setProcessingMessage('Menyiapkan OCR Indonesia + Inggris...');
    setOcrText('');
    setOcrSummary('');

    let worker: OcrWorker | null = null;
    const pageResults: OcrPageResult[] = [];

    const getWorker = async () => {
      if (worker) return worker;

      try {
        worker = await createWorker(['ind', 'eng'], 1, {
          logger: (message) => {
            if (message.status === 'recognizing text') {
              setProcessingMessage(`Membaca teks OCR ${Math.round(message.progress * 100)}%...`);
            } else if (message.status) {
              setProcessingMessage(`Menyiapkan OCR: ${message.status}`);
            }
          },
        });
      } catch (error) {
        console.warn('Indonesian OCR data unavailable, falling back to English:', error);
        worker = await createWorker('eng', 1, {
          logger: (message) => {
            if (message.status === 'recognizing text') {
              setProcessingMessage(`Membaca teks OCR ${Math.round(message.progress * 100)}%...`);
            }
          },
        });
      }

      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
        preserve_interword_spaces: '1',
        user_defined_dpi: '300',
      });

      return worker;
    };

    try {
      for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex];
        setProcessingMessage(`Menganalisis ${file.name} (${fileIndex + 1}/${files.length})...`);

        if (file.type === 'application/pdf') {
          const results = await extractOcrFromPdf(file, getWorker);
          pageResults.push(...results);
        } else if (file.type.startsWith('image/')) {
          const activeWorker = await getWorker();
          const canvas = await prepareImageForOcr(file);
          const { data } = await activeWorker.recognize(canvas);
          pageResults.push({
            label: file.name,
            text: normalizeOcrText(data.text),
            source: 'ocr',
            confidence: data.confidence,
          });
          canvas.width = 0;
          canvas.height = 0;
        } else {
          pageResults.push({
            label: file.name,
            text: 'Format file belum didukung OCR. Gunakan PDF, JPG, PNG, atau WebP.',
            source: 'ocr',
          });
        }
      }

      const ocrPages = pageResults.filter((page) => page.source === 'ocr');
      const textLayerPages = pageResults.filter((page) => page.source === 'text-layer');
      const avgConfidence = averageConfidence(ocrPages);
      const structuredOutput = buildOcrOutput(pageResults);
      const rawOcrText = buildOcrPlainText(pageResults);
      const fileLabel = files.map((file) => file.name).join(', ');

      setProcessingMessage('AI sedang membaca hasil OCR dan membuat simpulan...');

      let finalOutput = structuredOutput;
      let usedAiAnalysis = false;

      try {
        const aiAnalysis = await analyzeOcrText(
          rawOcrText || structuredOutput,
          fileLabel
        );
        finalOutput = buildOcrAiOutput(aiAnalysis, structuredOutput, rawOcrText);
        usedAiAnalysis = true;
      } catch (error) {
        console.warn('AI OCR analysis failed, using local structured output:', error);
        toast.warning('AI belum bisa menganalisis OCR. Menampilkan hasil terstruktur lokal.');
      }

      setOcrText(finalOutput);
      setOcrSummary(
        [
          usedAiAnalysis ? 'Jawaban AI + hasil OCR siap' : 'Hasil OCR terstruktur siap',
          `${pageResults.length} bagian diproses`,
          textLayerPages.length > 0 ? `${textLayerPages.length} dari text layer PDF` : '',
          ocrPages.length > 0 ? `${ocrPages.length} dengan OCR scan` : '',
          avgConfidence !== null ? `akurasi OCR rata-rata ${avgConfidence}%` : '',
        ].filter(Boolean).join(' - ')
      );
      setIsOcrMode(true);
      toast.success('Pemindaian OCR selesai!');
    } finally {
      const activeWorker = worker as OcrWorker | null;
      await activeWorker?.terminate();
      setIsProcessing(false);
    }
    return;

    setProcessingMessage('AI sedang memindai dan membaca teks...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const sampleOcrText = `DOCUMIND AI — HASIL EKSTRAKSI TEKS OCR\n` + 
      `-----------------------------------------\n` +
      `File: ${files[0].name}\n` +
      `Tanggal Pindai: ${new Date().toLocaleString('id-ID')}\n\n` +
      `[Konten Ekstraksi]\n` +
      `1. PENDAHULUAN\n` +
      `Berdasarkan data analisis dokumen ini, dokumen memuat data penting berupa profil digital, transkrip, maupun berkas identitas resmi. Sistem mendeteksi teks valid dengan akurasi 98.4%.\n\n` +
      `2. INFORMASI DOKUMEN\n` +
      `- Nama Subjek: Muhammad Rifqi\n` +
      `- Jenis Dokumen: CV / Curriculuum Vitae\n` +
      `- Pendidikan: Rekayasa Perangkat Lunak, Politeknik Negeri.\n\n` +
      `OCR selesai diproses secara instan dan aman.`;

    setOcrText(sampleOcrText);
    setIsOcrMode(true);
    setIsProcessing(false);
    toast.success('Pemindaian OCR selesai!');
  };

  const extractOcrFromPdf = async (
    file: File,
    getWorker: () => Promise<OcrWorker>
  ): Promise<OcrPageResult[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer.slice(0) });
    const pdf = await loadingTask.promise;
    const results: OcrPageResult[] = [];

    try {
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        setProcessingMessage(`Membaca halaman PDF ${pageNum}/${pdf.numPages}...`);
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const textLayerText = normalizeOcrText(
          (textContent.items as Array<{ str?: string }>)
            .map((item) => item.str || '')
            .join(' ')
        );

        if (textLayerText.length >= 24) {
          results.push({
            label: `${file.name} - Halaman ${pageNum}`,
            text: textLayerText,
            source: 'text-layer',
          });
          page.cleanup();
          continue;
        }

        const activeWorker = await getWorker();
        const canvas = await renderPdfPageForOcr(page);
        setProcessingMessage(`OCR scan halaman ${pageNum}/${pdf.numPages}...`);
        const { data } = await activeWorker.recognize(canvas);
        results.push({
          label: `${file.name} - Halaman ${pageNum}`,
          text: normalizeOcrText(data.text),
          source: 'ocr',
          confidence: data.confidence,
        });

        page.cleanup();
        canvas.width = 0;
        canvas.height = 0;
      }
    } finally {
      loadingTask.destroy();
    }

    return results;
  };

  const renderPdfPageForOcr = async (page: PDFPageProxy) => {
    const viewport = page.getViewport({ scale: 2.4 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context) {
      throw new Error('Canvas browser tidak tersedia.');
    }

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, viewport }).promise;
    enhanceCanvasForOcr(canvas);

    return canvas;
  };

  const prepareImageForOcr = async (file: File) => {
    const bitmap = await createImageBitmap(file);
    const maxWidth = 2600;
    const upscale = bitmap.width < 1200 ? 2 : 1;
    const scale = Math.min(upscale, maxWidth / bitmap.width);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context) {
      bitmap.close();
      throw new Error('Canvas browser tidak tersedia.');
    }

    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    enhanceCanvasForOcr(canvas);
    return canvas;
  };

  const enhanceCanvasForOcr = (canvas: HTMLCanvasElement) => {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.35 + 128));
      const sharpened = contrasted > 178 ? 255 : contrasted < 68 ? 0 : contrasted;
      data[i] = sharpened;
      data[i + 1] = sharpened;
      data[i + 2] = sharpened;
      data[i + 3] = 255;
    }

    context.putImageData(imageData, 0, 0);
  };

  const normalizeOcrText = (text: string) =>
    text
      .replace(/\r/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

  const averageConfidence = (pages: OcrPageResult[]) => {
    const confidences = pages
      .map((page) => page.confidence)
      .filter((confidence): confidence is number => typeof confidence === 'number' && Number.isFinite(confidence));

    if (confidences.length === 0) return null;

    return Math.round(confidences.reduce((sum, value) => sum + value, 0) / confidences.length);
  };

  const splitOcrLines = (text: string) =>
    normalizeOcrText(text)
      .split('\n')
      .map((line) => line.replace(/^[\-*•\d.)\s]+/, '').replace(/\s{2,}/g, ' ').trim())
      .filter((line) => line.length > 0);

  const splitOcrSentences = (text: string) =>
    normalizeOcrText(text)
      .replace(/\n+/g, ' ')
      .split(/(?<=[.!?])\s+|;\s+/)
      .map((sentence) => sentence.replace(/\s{2,}/g, ' ').trim())
      .filter((sentence) => sentence.length > 12);

  const isLikelyHeading = (line: string) => {
    const cleanLine = line.replace(/[:\-–—]/g, '').trim();
    if (cleanLine.length < 3 || cleanLine.length > 64) return false;

    const letters = cleanLine.replace(/[^a-zA-Z]/g, '');
    const upperLetters = cleanLine.replace(/[^A-Z]/g, '');
    const upperRatio = letters.length > 0 ? upperLetters.length / letters.length : 0;

    return line.endsWith(':') || upperRatio > 0.72;
  };

  const isActionLine = (line: string) => {
    const lower = line.toLowerCase();
    return [
      'harus',
      'perlu',
      'wajib',
      'segera',
      'deadline',
      'tenggat',
      'tugas',
      'todo',
      'to do',
      'kirim',
      'submit',
      'upload',
      'bayar',
      'hubungi',
      'review',
      'revisi',
      'lengkapi',
      'tanda tangan',
      'follow up',
    ].some((keyword) => lower.includes(keyword));
  };

  const getKeyPoints = (pages: OcrPageResult[]) => {
    const seen = new Set<string>();
    const points: string[] = [];
    const candidates = pages.flatMap((page) => splitOcrLines(page.text));

    for (const line of candidates) {
      const normalized = line.toLowerCase();
      const looksImportant =
        line.includes(':') ||
        /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(line) ||
        /\b(rp|idr|usd)\b/i.test(line) ||
        /\b(nama|tanggal|nomor|no\.|alamat|email|telepon|total|judul|perihal)\b/i.test(line) ||
        (line.length >= 36 && line.length <= 160);

      if (!looksImportant || seen.has(normalized)) continue;

      seen.add(normalized);
      points.push(line);
      if (points.length >= 10) break;
    }

    return points;
  };

  const getActionItems = (pages: OcrPageResult[]) => {
    const seen = new Set<string>();
    const actions: string[] = [];

    for (const sentence of pages.flatMap((page) => splitOcrSentences(page.text))) {
      const normalized = sentence.toLowerCase();
      if (!isActionLine(sentence) || seen.has(normalized)) continue;

      seen.add(normalized);
      actions.push(sentence);
      if (actions.length >= 8) break;
    }

    return actions;
  };

  const formatPageText = (text: string) => {
    const lines = splitOcrLines(text);
    if (lines.length === 0) return '- Tidak ada teks terbaca pada bagian ini.';

    const formatted: string[] = [];
    let bulletCount = 0;

    for (const line of lines) {
      if (isLikelyHeading(line)) {
        if (formatted.length > 0) formatted.push('', '');
        formatted.push(line.replace(/:$/, '').toUpperCase());
        formatted.push('-'.repeat(Math.min(48, Math.max(12, line.length))));
        bulletCount = 0;
        continue;
      }

      const prefix = bulletCount < 30 ? '- ' : '  ';
      formatted.push(`${prefix}${line}`);
      formatted.push('');
      bulletCount += 1;
    }

    return formatted.join('\n').replace(/\n{4,}/g, '\n\n\n').trim();
  };

  const formatSectionTitle = (title: string) => [
    '',
    title,
    '='.repeat(title.length),
    '',
  ].join('\n');

  const formatBulletList = (items: string[]) =>
    items
      .map((item) => `- ${item}`)
      .join('\n\n');

  const formatNumberedList = (items: string[]) =>
    items
      .map((item, index) => `${index + 1}. ${item}`)
      .join('\n\n');

  const formatMetaBlock = (items: string[]) =>
    items
      .map((item) => `  ${item}`)
      .join('\n');

  const buildOcrPlainText = (pages: OcrPageResult[]) =>
    pages
      .map((page, index) => {
        const method = page.source === 'text-layer' ? 'Text layer PDF' : 'OCR scan';
        const confidence = typeof page.confidence === 'number'
          ? ` | Akurasi ${Math.round(page.confidence)}%`
          : '';

        return [
          `[Bagian ${index + 1}] ${page.label}`,
          `Metode: ${method}${confidence}`,
          normalizeOcrText(page.text),
        ].join('\n');
      })
      .join('\n\n---\n\n')
      .trim();

  const buildOcrAiOutput = (aiAnalysis: string, structuredOutput: string, rawOcrText: string) =>
    [
      'JAWABAN & SIMPULAN AI',
      '=====================',
      '',
      normalizeOcrText(aiAnalysis),
      '',
      formatSectionTitle('HASIL OCR TERSTRUKTUR'),
      structuredOutput,
      '',
      formatSectionTitle('TEKS MENTAH OCR'),
      rawOcrText || 'Tidak ada teks mentah yang berhasil diekstrak.',
    ].join('\n').replace(/\n{4,}/g, '\n\n\n').trim();

  const buildOcrOutput = (pages: OcrPageResult[]) => {
    if (pages.length === 0) {
      return 'Tidak ada teks yang berhasil diekstrak.';
    }

    const keyPoints = getKeyPoints(pages);
    const actionItems = getActionItems(pages);
    const ocrPages = pages.filter((page) => page.source === 'ocr');
    const textLayerPages = pages.filter((page) => page.source === 'text-layer');
    const avgConfidence = averageConfidence(ocrPages);

    const summary = [
      'HASIL OCR TERSTRUKTUR',
      '=====================',
      formatSectionTitle('RINGKASAN DOKUMEN'),
      formatMetaBlock([
        `Total bagian/halaman diproses : ${pages.length}`,
        `Dibaca dari text layer PDF    : ${textLayerPages.length}`,
        `Dibaca dengan OCR scan        : ${ocrPages.length}`,
        `Rata-rata akurasi OCR         : ${avgConfidence !== null ? `${avgConfidence}%` : 'tidak tersedia'}`,
      ]),
      formatSectionTitle('POIN PENTING'),
      keyPoints.length > 0
        ? formatBulletList(keyPoints)
        : '- Belum ada poin penting yang bisa dideteksi otomatis.\n\n- Cek detail ekstraksi di bagian bawah untuk review manual.',
      formatSectionTitle('TO-DO / TINDAK LANJUT'),
      actionItems.length > 0
        ? formatNumberedList(actionItems)
        : '1. Review kembali teks hasil OCR.\n\n2. Koreksi bagian yang kurang jelas atau salah terbaca.\n\n3. Salin atau unduh hasil akhir jika sudah sesuai.',
      formatSectionTitle('DETAIL EKSTRAKSI PER HALAMAN'),
    ].join('\n');

    const details = pages
      .map((page, index) => {
        const confidence = typeof page.confidence === 'number'
          ? `\nAkurasi OCR: ${Math.round(page.confidence)}%`
          : '';
        const method = page.source === 'text-layer' ? 'Text layer PDF' : 'OCR scan';
        const text = formatPageText(page.text);

        return [
          `HALAMAN / BAGIAN ${index + 1}`,
          '-'.repeat(18 + String(index + 1).length),
          `Nama    : ${page.label}`,
          `Metode  : ${method}${confidence ? confidence.replace('\n', '\n') : ''}`,
          '',
          text,
        ].join('\n');
      })
      .join('\n\n\n');

    return `${summary}\n\n${details}`;
  };

  // --- 7. ROTATE PDF ---
  const processRotate = async () => {
    setProcessingMessage('Memutar halaman PDF di browser...');
    const file = files[0];
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);

    pdf.getPages().forEach((page) => {
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees((currentRotation + rotateDegrees) % 360));
    });

    const rotatedPdfBytes = await pdf.save({ useObjectStreams: true });
    completeProcessing(
      pdfBlob(rotatedPdfBytes),
      `rotated_${Date.now()}.pdf`,
      pdf.getPageCount(),
      'PDF berhasil diputar!'
    );
  };

  // --- 8. PROTECT PDF (CLIENT-SIDE HARDENING) ---
  const processProtect = async () => {
    if (protectPassword.length < 4) {
      toast.warning('Password minimal 4 karakter.');
      setIsProcessing(false);
      return;
    }

    if (protectPassword !== protectPasswordConfirm) {
      toast.warning('Konfirmasi password belum sama.');
      setIsProcessing(false);
      return;
    }

    setProcessingMessage('Menambahkan watermark dan metadata proteksi...');
    const file = files[0];
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const font = await pdf.embedFont(StandardFonts.HelveticaBold);
    const pages = pdf.getPages();

    pdf.setTitle(file.name.replace(/\.[^/.]+$/, ''));
    pdf.setSubject('Protected by DocuMind client-side PDF tools');
    pdf.setProducer('DocuMind AI');
    pdf.setModificationDate(new Date());

    const protectionLabel = protectPassword.trim()
      ? `Protected copy - key hint: ${protectPassword.trim().slice(0, 4)}****`
      : 'Protected copy';

    for (const page of pages) {
      const { width, height } = page.getSize();
      page.drawText(protectionLabel, {
        x: Math.max(24, width - 260),
        y: 24,
        size: 9,
        font,
        color: rgb(0.65, 0.12, 0.18),
        opacity: 0.55,
      });
      page.drawText('DOCUMIND PROTECTED', {
        x: width / 2 - 150,
        y: height / 2,
        size: 28,
        font,
        color: rgb(0.7, 0.12, 0.2),
        opacity: 0.12,
        rotate: degrees(35),
      });
    }

    const protectedPdfBytes = await pdf.save({ useObjectStreams: true });
    setProcessingMessage('Mengunci PDF dengan password...');
    const encryptedPdfBytes = await encryptPdfWithPassword(protectedPdfBytes, protectPassword);

    completeProcessing(
      pdfBlob(encryptedPdfBytes),
      `protected_${Date.now()}.pdf`,
      pdf.getPageCount(),
      'PDF berhasil dikunci dengan password!'
    );
  };

  // --- 9. PDF TO JPG ---
  const processPdfToJpg = async () => {
    setProcessingMessage('Merender halaman PDF menjadi JPG...');
    const file = files[0];
    const startedAt = performance.now();
    const baseName = file.name.replace(/\.[^/.]+$/, '') || 'document';
    let loadingTask: ReturnType<typeof pdfjs.getDocument> | null = null;

    logToolDebug('pdf-to-jpg start', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      jpgQuality,
      pdfjsVersion: pdfjs.version,
      workerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
      userAgent: navigator.userAgent,
    });

    try {
      logToolDebug('pdf-to-jpg read file start', {
        fileName: file.name,
      });

      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const header = readFileHeader(bytes);

      logToolDebug('pdf-to-jpg read file success', {
        fileName: file.name,
        byteLength: bytes.byteLength,
        header,
        elapsedMs: Math.round(performance.now() - startedAt),
      });

      if (!header.looksLikePdf) {
        throw new Error(`File yang dipilih bukan PDF valid. Header: ${header.text}`);
      }

      logToolDebug('pdf-to-jpg load pdf start', {
        fileName: file.name,
      });

      loadingTask = pdfjs.getDocument({
        data: arrayBuffer.slice(0),
        disableFontFace: true,
        useSystemFonts: true,
      });
      const pdf = await loadingTask.promise;

      logToolDebug('pdf-to-jpg load pdf success', {
        fileName: file.name,
        pageCount: pdf.numPages,
        elapsedMs: Math.round(performance.now() - startedAt),
      });

      const zip = new JSZip();

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        setProcessingMessage(`Merender halaman ${pageNum}/${pdf.numPages}...`);

        logToolDebug('pdf-to-jpg page start', {
          fileName: file.name,
          pageNum,
          pageCount: pdf.numPages,
        });

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
          throw new Error('Canvas browser tidak tersedia.');
        }

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        logToolDebug('pdf-to-jpg render start', {
          fileName: file.name,
          pageNum,
          viewport: {
            width: viewport.width,
            height: viewport.height,
          },
          canvas: {
            width: canvas.width,
            height: canvas.height,
          },
        });

        await page.render({ canvas, viewport }).promise;

        logToolDebug('pdf-to-jpg render success', {
          fileName: file.name,
          pageNum,
          elapsedMs: Math.round(performance.now() - startedAt),
        });

        const jpgBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Gagal membuat JPG dari halaman PDF.'));
          }, 'image/jpeg', jpgQuality);
        });

        const jpgName = `${baseName}_page_${String(pageNum).padStart(3, '0')}.jpg`;
        zip.file(jpgName, jpgBlob);

        logToolDebug('pdf-to-jpg page encoded', {
          fileName: file.name,
          pageNum,
          jpgName,
          jpgSize: jpgBlob.size,
          jpgType: jpgBlob.type,
          elapsedMs: Math.round(performance.now() - startedAt),
        });

        page.cleanup();
        canvas.width = 0;
        canvas.height = 0;
      }

      setProcessingMessage('Membuat file ZIP JPG...');
      logToolDebug('pdf-to-jpg zip start', {
        fileName: file.name,
        pageCount: pdf.numPages,
      });

      const zipBlob = await zip.generateAsync(
        { type: 'blob', compression: 'DEFLATE' },
        (metadata) => {
          if (metadata.percent === 100 || Math.round(metadata.percent) % 25 === 0) {
            logToolDebug('pdf-to-jpg zip progress', {
              percent: Math.round(metadata.percent),
              currentFile: metadata.currentFile,
            });
          }
        }
      );

      logToolDebug('pdf-to-jpg complete', {
        fileName: file.name,
        outputName: `${baseName}_jpg_pages.zip`,
        zipSize: zipBlob.size,
        pageCount: pdf.numPages,
        elapsedMs: Math.round(performance.now() - startedAt),
      });

      completeProcessing(
        zipBlob,
        `${baseName}_jpg_pages.zip`,
        pdf.numPages,
        'PDF berhasil diubah menjadi JPG!'
      );
    } catch (error) {
      const serializedError = serializeToolError(error);
      console.error(`PDF to JPG failed: ${serializedError.name}: ${serializedError.message}`, error);
      logToolDebug('pdf-to-jpg failed', {
        fileName: file.name,
        error: serializedError,
        elapsedMs: Math.round(performance.now() - startedAt),
      });
      throw error;
    } finally {
      loadingTask?.destroy();
    }
  };

  // --- 7. FILE CONVERSION ---
  const processConversion = async () => {
    const file = files[0];
    
    if (conversionType === 'word-to-pdf') {
      setProcessingMessage('Mengonversi file Word ke PDF via Gotenberg Engine...');

      // Call backend API for high fidelity Gotenberg conversion
      const outputBlob = await convertWordToPdf(file);
      
      // Load PDF to get the page count
      const arrayBuffer = await outputBlob.arrayBuffer();
      const loadedPdf = await PDFDocument.load(arrayBuffer);
      const pageCount = loadedPdf.getPageCount();
      
      const outputName = `${file.name.replace(/\.[^/.]+$/, '')}.pdf`;

      setProcessedBlob(outputBlob);
      setSplitOutputs([]);
      setTotalPages(pageCount);
      setProcessedDocName(outputName);
      setIsProcessing(false);
      toast.success('Konversi Word ke PDF berhasil!');
      navigate(`/dashboard/tools/${toolId}/preview`, {
        state: {
          blob: outputBlob,
          name: outputName,
          sourceTool: toolId,
          sourceLabel: 'Preview Hasil Word ke PDF',
        },
      });
    } else {
      // Excel / PPT to PDF - these formats need server-side engines for full fidelity
      toast.info('Konversi Excel/PPT ke PDF membutuhkan pemrosesan server. Fitur ini akan segera hadir!');
      setIsProcessing(false);
    }
  };

  // --- MOCKUP FOR OTHER TOOLS ---
  const processMockup = async () => {
    setProcessingMessage('Memproses dokumen...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const file = files[0];
    const blob = new Blob([await file.arrayBuffer()], { type: 'application/pdf' });
    
    setProcessedBlob(blob);
    setTotalPages(1);
    setProcessedDocName(`processed_${Date.now()}.pdf`);
    setIsProcessing(false);
    toast.success('Proses selesai!');
    setShowSuccessModal(true);
  };

  // --- SAVE TO DASHBOARD ---
  const handleSaveToDashboard = async () => {
    if (!processedBlob || !user) return;
    
    setIsSaving(true);
    try {
      const cleanName = processedDocName.trim().endsWith('.pdf') 
        ? processedDocName.trim() 
        : processedDocName.trim().endsWith('.doc')
        ? processedDocName.trim()
        : `${processedDocName.trim()}.pdf`;
        
      const filePath = `${user.id}/${Date.now()}_${cleanName.replace(/[^a-zA-Z0-9.\-]/g, '_')}`;
      
      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(filePath, processedBlob);
        
      if (storageError) throw storageError;
      
      const { error: dbError } = await supabase
        .from('documents')
        .insert([{
          user_id: user.id,
          name: cleanName,
          file_url: filePath,
          file_size: processedBlob.size,
          page_count: totalPages,
          status: 'ready'
        }]);
        
      if (dbError) throw dbError;
      
      toast.success('Dokumen berhasil disimpan ke Dashboard!');
      setShowSuccessModal(false);
      setFiles([]);
      setProcessedBlob(null);
      navigate('/dashboard/documents');
    } catch (err: any) {
      toast.error('Gagal menyimpan dokumen: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const triggerDownloadAgain = () => {
    if (!processedBlob) return;
    downloadBlob(processedBlob, processedDocName);
    toast.success('Unduhan dimulai.');
  };

  const downloadSplitOutput = (output: SplitOutput) => {
    downloadBlob(output.blob, output.name);
    toast.success(`Mengunduh ${output.name}`);
  };

  // Helper values for dynamic Upload Zone config
  const isImageToPdf = toolId === 'image-to-pdf';
  const isConvert = toolId === 'convert';
  const isOcr = toolId === 'ocr';

  const getAcceptedTypes = () => {
    if (isOcr) return ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (isImageToPdf) return ['image/png', 'image/jpeg', 'image/jpg'];
    if (isConvert) {
      if (conversionType === 'word-to-pdf') return ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (conversionType === 'excel-to-pdf') return ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (conversionType === 'ppt-to-pdf') return ['application/vnd.openxmlformats-officedocument.presentationml.presentation'];
      return ['application/pdf'];
    }
    return ['application/pdf'];
  };

  const getDropzoneAccept = (): Record<string, string[]> => {
    if (isOcr) return { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] };
    if (isImageToPdf) return { 'image/*': ['.png', '.jpg', '.jpeg'] };
    if (isConvert) {
      if (conversionType === 'word-to-pdf') return { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] };
      if (conversionType === 'excel-to-pdf') return { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] };
      if (conversionType === 'ppt-to-pdf') return { 'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'] };
      return { 'application/pdf': ['.pdf'] };
    }
    return { 'application/pdf': ['.pdf'] };
  };

  const getUploadLabel = () => {
    if (isOcr) return 'Drag & drop PDF scan atau gambar (JPG/PNG/WebP)';
    if (isImageToPdf) return 'Drag & drop file gambar (JPG/PNG)';
    if (isConvert) {
      if (conversionType === 'word-to-pdf') return 'Drag & drop file Word (.docx)';
      if (conversionType === 'excel-to-pdf') return 'Drag & drop file Excel (.xlsx)';
      if (conversionType === 'ppt-to-pdf') return 'Drag & drop file PowerPoint (.pptx)';
      return 'Drag & drop file PDF (.pdf)';
    }
    return 'Drag & drop file PDF';
  };

  const isPdfOutput = processedDocName.toLowerCase().endsWith('.pdf');
  const canSaveToDashboard = isPdfOutput || processedDocName.toLowerCase().endsWith('.doc');

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-8 relative">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className={cn('inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br', tool.bg)}>
          <tool.icon className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold">{tool.title}</h1>
        <p className="text-muted-foreground">{tool.description}</p>
      </motion.div>

      {/* OCR Result Presentation (If OCR Mode) */}
      <AnimatePresence>
        {isOcrMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-glow"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-pink-400" />
                  Hasil Ekstraksi Teks AI OCR
                </h3>
                {ocrSummary && (
                  <p className="mt-1 text-xs text-muted-foreground">{ocrSummary}</p>
                )}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(ocrText);
                    toast.success('Teks berhasil disalin ke clipboard!');
                  }}
                >
                  Salin Teks
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadBlob(new Blob([ocrText], { type: 'text/plain;charset=utf-8' }), `ocr_${Date.now()}.txt`)}
                >
                  <Download className="h-4 w-4" />
                  Unduh TXT
                </Button>
              </div>
            </div>
            <textarea
              className="h-[520px] w-full resize-y rounded-xl border border-border bg-surface-2 p-5 font-mono text-sm leading-7 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsOcrMode(false)}>Tutup</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tool-Specific Controls */}
      <AnimatePresence>
        {!isOcrMode && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="p-5 rounded-2xl bg-surface-2 border border-border space-y-6 shadow-sm"
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Pengaturan {tool.title}
            </h3>

            {/* CONVERSION CONTROLS */}
            {toolId === 'convert' && (
              <div className="space-y-4">
                <label className="text-sm font-medium block">Pilih Mode Arah Konversi:</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'word-to-pdf', label: 'Word ke PDF', ext: '.docx' },
                    { id: 'excel-to-pdf', label: 'Excel ke PDF', ext: '.xlsx' },
                    { id: 'ppt-to-pdf', label: 'PPT ke PDF', ext: '.pptx' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => {
                        setConversionType(mode.id as any);
                        setFiles([]);
                      }}
                      className={cn(
                        "p-3 rounded-xl border text-center transition-all duration-300 flex flex-col items-center justify-center gap-1 cursor-pointer",
                        conversionType === mode.id 
                          ? "bg-cyan-500/10 border-cyan-500 text-cyan-400 font-semibold shadow-glow-sm" 
                          : "bg-card hover:bg-surface-3 border-border text-muted-foreground"
                      )}
                    >
                      <span className="text-xs font-semibold">{mode.label}</span>
                      <span className="text-[10px] text-muted-foreground/80">{mode.ext}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* OCR CONTROLS */}
            {toolId === 'ocr' && (
              <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="font-semibold text-foreground">PDF digital</p>
                  <p className="mt-1 text-xs leading-5">Teks asli PDF diekstrak langsung tanpa OCR lambat.</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="font-semibold text-foreground">PDF scan</p>
                  <p className="mt-1 text-xs leading-5">Halaman dirender dan dibaca dengan OCR lokal di browser.</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="font-semibold text-foreground">Gambar</p>
                  <p className="mt-1 text-xs leading-5">Mendukung JPG, PNG, dan WebP dengan peningkatan kontras.</p>
                </div>
              </div>
            )}

            {/* SPLIT CONTROLS */}
            {toolId === 'split' && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="split-mode" 
                      checked={splitMode === 'all'} 
                      onChange={() => setSplitMode('all')}
                      className="accent-primary"
                    />
                    <span className="text-sm font-medium">Pisah semua halaman</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="split-mode" 
                      checked={splitMode === 'groups'} 
                      onChange={() => setSplitMode('groups')}
                      className="accent-primary"
                    />
                    <span className="text-sm font-medium">Custom grup halaman</span>
                  </label>
                </div>
                {splitMode === 'groups' && (
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">
                      Pisahkan pakai koma. Contoh `1-2,3-4` menjadi 2 PDF. Kalau hanya `1-2`, hasilnya page 1 dan page 2 terpisah.
                    </label>
                    <Input 
                      placeholder="Contoh: 1-3,4-6" 
                      value={splitRange} 
                      onChange={(e) => setSplitRange(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                )}
              </div>
            )}

            {/* COMPRESS CONTROLS */}
            {toolId === 'compress' && (
              <div className="space-y-5">
                <div className="space-y-3">
                  <label className="text-sm font-medium block">Target Kompresi:</label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setCompressMode('target-size')}
                      className={cn(
                        'rounded-xl border p-4 text-left transition-all',
                        compressMode === 'target-size'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card hover:bg-surface-3'
                      )}
                    >
                      <p className="text-sm font-semibold">Target ukuran file</p>
                      <p className="mt-1 text-xs text-muted-foreground">Contoh: jadikan sekitar 1 MB.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompressMode('quality')}
                      className={cn(
                        'rounded-xl border p-4 text-left transition-all',
                        compressMode === 'quality'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card hover:bg-surface-3'
                      )}
                    >
                      <p className="text-sm font-semibold">Prioritas kualitas</p>
                      <p className="mt-1 text-xs text-muted-foreground">Optimasi aman tanpa target ukuran tertentu.</p>
                    </button>
                  </div>
                </div>

                {compressMode === 'target-size' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium block">Ingin dijadikan berapa MB?</label>
                    <Input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={targetSizeMb}
                      onChange={(e) => setTargetSizeMb(e.target.value)}
                      className="max-w-[180px]"
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-sm font-medium block">Kekuatan Optimasi:</label>
                  <div className="grid grid-cols-3 gap-3">
                  {(['low', 'medium', 'high'] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setCompressLevel(level)}
                      className={cn(
                        "p-4 rounded-xl border border-border text-center transition-all duration-300 capitalize cursor-pointer",
                        compressLevel === level 
                          ? "bg-primary/10 border-primary text-primary font-semibold shadow-glow-sm" 
                          : "bg-card hover:bg-surface-3"
                      )}
                    >
                      <p className="text-sm">{level === 'high' ? 'Maksimal' : level === 'medium' ? 'Rekomendasi' : 'Ringan'}</p>
                    </button>
                  ))}
                  </div>
                </div>

                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">
                  Kompresi browser bersifat lossless. Jika PDF berisi gambar scan besar, target MB yang terlalu kecil butuh kompresi gambar/WASM khusus agar bisa turun drastis.
                </div>
              </div>
            )}

            {/* ROTATE CONTROLS */}
            {toolId === 'rotate' && (
              <div className="space-y-3">
                <label className="text-sm font-medium block">Sudut Rotasi:</label>
                <div className="grid grid-cols-3 gap-3">
                  {([90, 180, 270] as const).map((value) => (
                    <button
                      key={value}
                      onClick={() => setRotateDegrees(value)}
                      className={cn(
                        "p-4 rounded-xl border text-center transition-all duration-300 cursor-pointer",
                        rotateDegrees === value
                          ? "bg-teal-500/10 border-teal-500 text-teal-400 font-semibold shadow-glow-sm"
                          : "bg-card hover:bg-surface-3 border-border"
                      )}
                    >
                      <p className="text-sm">{value} derajat</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PROTECT CONTROLS */}
            {toolId === 'protect' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium block">Password untuk membuka PDF</label>
                  <Input
                    type="password"
                    placeholder="Minimal 4 karakter"
                    value={protectPassword}
                    onChange={(e) => setProtectPassword(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium block">Konfirmasi Password</label>
                  <Input
                    type="password"
                    placeholder="Ulangi password"
                    value={protectPasswordConfirm}
                    onChange={(e) => setProtectPasswordConfirm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs flex items-start gap-2">
                  <Shield className="h-4 w-4 mt-0.5 shrink-0" />
                  File diproses di browser: watermark ditambahkan, lalu PDF dikunci dengan enkripsi AES-256.
                </div>
              </div>
            )}

            {/* PDF TO JPG CONTROLS */}
            {toolId === 'pdf-to-jpg' && (
              <div className="space-y-3">
                <label className="text-sm font-medium block">Kualitas JPG:</label>
                <input
                  type="range"
                  min="0.6"
                  max="0.95"
                  step="0.05"
                  value={jpgQuality}
                  onChange={(e) => setJpgQuality(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Ukuran kecil</span>
                  <span>{Math.round(jpgQuality * 100)}%</span>
                  <span>Kualitas tinggi</span>
                </div>
              </div>
            )}

            {/* SIGN (TANDA TANGAN) CONTROLS */}
            {toolId === 'sign' && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium block">Warna Pena</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={signatureColor}
                        onChange={(e) => setSignatureColor(e.target.value)}
                        className="h-10 w-12 cursor-pointer rounded-lg border border-border bg-card p-1"
                        aria-label="Pilih warna pena"
                      />
                      <div className="flex gap-2">
                        {['#111111', '#2563eb', '#dc2626', '#16a34a'].map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setSignatureColor(color)}
                            className={cn(
                              'h-8 w-8 rounded-full border transition-all',
                              signatureColor === color ? 'border-primary ring-2 ring-primary/40' : 'border-border'
                            )}
                            style={{ backgroundColor: color }}
                            aria-label={`Pilih warna ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium block">Ketebalan Pena</label>
                      <span className="text-xs text-muted-foreground">{signatureStrokeWidth}px</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="12"
                      step="1"
                      value={signatureStrokeWidth}
                      onChange={(e) => setSignatureStrokeWidth(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium block">Gambar Tanda Tangan Anda di Bawah:</label>
                  <div className="border border-border rounded-xl bg-card overflow-hidden">
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={200}
                      className="w-full h-[200px] cursor-crosshair bg-white"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">Tarik garis dengan mouse atau sentuhan layar</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={clearCanvas}>
                        Bersihkan
                      </Button>
                      <Button variant="gradient" size="sm" onClick={prepareSignaturePlacement} disabled={!hasSignature || files.length === 0}>
                        Tempatkan
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium block">Tanda Tangan pada Halaman:</label>
                  <Input
                    type="number"
                    min={1}
                    value={signPageNum}
                    onChange={(e) => {
                      setSignPageNum(parseInt(e.target.value) || 1);
                      setSignaturePlacement(null);
                    }}
                    className="max-w-[120px]"
                  />
                </div>

                {files[0] && signatureDataUrl && (
                  <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Atur Posisi Tanda Tangan</p>
                        <p className="text-xs text-muted-foreground">Tekan dan geser di halaman PDF untuk mengatur posisi tanda tangan.</p>
                      </div>
                      {signaturePlacement && (
                        <div className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                          Posisi dipilih
                        </div>
                      )}
                    </div>
                    <SignPlacementPreview
                      file={files[0]}
                      signatureDataUrl={signatureDataUrl}
                      targetPage={signPageNum}
                      placement={signaturePlacement}
                      onPlace={setSignaturePlacement}
                    />
                  </div>
                )}
              </div>
            )}

            {/* IMAGE TO PDF INFO */}
            {toolId === 'image-to-pdf' && (
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl text-xs flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Mendukung konversi banyak gambar sekaligus (PNG & JPG) menjadi halaman PDF terurut.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Zone */}
      {!isOcrMode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <FileUpload
            onFilesAccepted={(newFiles) => setFiles((prev) => [...prev, ...newFiles])}
            files={files}
            onRemoveFile={(index) => setFiles((prev) => prev.filter((_, i) => i !== index))}
            maxFiles={toolId === 'merge' || toolId === 'image-to-pdf' ? 20 : toolId === 'ocr' ? 10 : 1}
            acceptedTypes={getAcceptedTypes()}
            dropzoneAccept={getDropzoneAccept()}
            label={getUploadLabel()}
          />
        </motion.div>
      )}

      {/* Merge verification and ordering */}
      {toolId === 'merge' && files.length > 0 && !isOcrMode && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 rounded-2xl border border-border bg-surface-2 p-5"
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">
                Verifikasi Urutan Merge
              </h3>
              <p className="text-xs text-muted-foreground">
                PDF paling atas akan menjadi bagian pertama dokumen gabungan.
              </p>
            </div>
            <div className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              {files.length} file dipilih
            </div>
          </div>

          <div className="space-y-3">
            {files.map((file, index) => (
              <button
                key={`${file.name}-${file.lastModified}-${index}`}
                type="button"
                draggable
                onDragStart={() => setDraggedMergeIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleMergeDrop(index)}
                onDragEnd={() => setDraggedMergeIndex(null)}
                onClick={() => setSelectedMergeIndex(index)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-all',
                  draggedMergeIndex === index && 'border-primary opacity-60',
                  selectedMergeIndex === index
                    ? 'border-primary ring-1 ring-primary/40'
                    : 'border-border hover:border-primary/40'
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {index + 1}
                </div>

                <LocalPdfPreview file={file} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="truncate text-sm font-semibold">{file.name}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>

                <div className="flex shrink-0 flex-col gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      moveMergeFile(index, index - 1);
                    }}
                    disabled={index === 0}
                    aria-label="Naikkan urutan file"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      moveMergeFile(index, index + 1);
                    }}
                    disabled={index === files.length - 1}
                    aria-label="Turunkan urutan file"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Preview Isi Semua PDF
              </p>
              <p className="text-xs text-muted-foreground">
                Preview mengikuti urutan merge yang sedang aktif.
              </p>
            </div>

            {files.map((file, index) => (
              <div
                key={`full-preview-${file.name}-${file.lastModified}-${index}`}
                className={cn(
                  'space-y-3 rounded-xl border bg-card p-4 transition-all',
                  selectedMergeIndex === index ? 'border-primary ring-1 ring-primary/40' : 'border-border'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      Urutan {index + 1}: {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                  <Button
                    type="button"
                    variant={selectedMergeIndex === index ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedMergeIndex(index)}
                    className="shrink-0"
                  >
                    File {index + 1}
                  </Button>
                </div>
              <LocalPdfFullPreview blob={file} name={file.name} />
            </div>
          ))}
          </div>
        </motion.div>
      )}

      {/* Action Button */}
      {files.length > 0 && !isOcrMode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Button 
            variant="gradient" 
            size="xl" 
            className="group min-w-[200px]"
            onClick={handleProcess}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Memproses...
              </>
            ) : (
              <>
                {toolId === 'merge' ? 'Gabungkan Sesuai Urutan' : `Proses ${tool.title}`}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </motion.div>
      )}

      {/* Processing Overlay */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md"
          >
            <div className="text-center space-y-6 max-w-sm px-4">
              <div className="relative flex items-center justify-center">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
                <div className={cn('absolute h-8 w-8 rounded-lg bg-gradient-to-br flex items-center justify-center', tool.bg)}>
                  <tool.icon className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold">Sedang Memproses Dokumen</h3>
                <p className="text-sm text-muted-foreground animate-pulse">{processingMessage}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className={cn(
                'bg-card border border-border shadow-2xl rounded-2xl w-full overflow-hidden relative',
                splitOutputs.length > 0 ? 'max-w-5xl' : 'max-w-md'
              )}
            >
              <button 
                onClick={() => { setShowSuccessModal(false); setFiles([]); setProcessedBlob(null); setSplitOutputs([]); }}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="max-h-[86vh] overflow-y-auto p-6 text-center space-y-6 pt-10">
                <div className="mx-auto w-16 h-16 bg-success/15 rounded-full flex items-center justify-center text-success">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-foreground">Proses {tool.title} Selesai!</h3>
                  <p className="text-sm text-muted-foreground">
                    Silakan tentukan nama dokumen di bawah ini, lalu pilih aksi selanjutnya.
                  </p>
                </div>

                <div className="space-y-4 text-left border-t border-b border-border py-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Nama Dokumen Baru
                    </label>
                    <Input 
                      placeholder="Masukkan nama dokumen..."
                      value={processedDocName}
                      onChange={(e) => setProcessedDocName(e.target.value)}
                      className="bg-surface-2 border-border focus-visible:ring-primary"
                    />
                  </div>

                  {splitOutputs.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Hasil Split
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => splitOutputs.forEach(downloadSplitOutput)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Unduh Semua
                        </Button>
                      </div>

                      <div className="-mx-1 overflow-x-auto overscroll-x-contain pb-3">
                        <div className="flex gap-4 px-1">
                          {splitOutputs.map((output, index) => (
                            <div
                              key={`${output.name}-${index}`}
                              className="w-[320px] shrink-0 space-y-3 rounded-xl border border-border bg-surface-2 p-3"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                                    Hasil {index + 1}
                                  </p>
                                  <p className="truncate text-sm font-semibold">{output.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {output.pageCount} halaman · {formatFileSize(output.blob.size)}
                                  </p>
                                </div>
                                <Button
                                  variant="gradient"
                                  size="icon-sm"
                                  onClick={() => downloadSplitOutput(output)}
                                  className="shrink-0"
                                  aria-label={`Unduh ${output.name}`}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="[&>div]:h-[300px]">
                                <LocalPdfFullPreview blob={output.blob} name={output.name} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : processedBlob && (
                    <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-surface-2 border border-border flex items-center justify-between">
                      <div className="space-y-0.5 truncate">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Detail File</p>
                        <p className="text-xs text-foreground font-medium">{totalPages} halaman · {formatFileSize(processedBlob.size)}</p>
                      </div>
                    </div>
                    {isPdfOutput && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Preview Hasil Konversi
                        </p>
                        <div className="[&>div]:h-[420px]">
                          <LocalPdfFullPreview blob={processedBlob} name={processedDocName} />
                        </div>
                      </div>
                    )}
                    {compressStats && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg border border-border bg-surface-2 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sebelum</p>
                          <p className="text-sm font-semibold">{formatFileSize(compressStats.before)}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-surface-2 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sesudah</p>
                          <p className="text-sm font-semibold">{formatFileSize(compressStats.after)}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-surface-2 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Hemat</p>
                          <p className="text-sm font-semibold">
                            {Math.max(0, Math.round((1 - compressStats.after / compressStats.before) * 100))}%
                          </p>
                        </div>
                      </div>
                    )}
                    {compressStats?.target && compressStats.after > compressStats.target && (
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">
                        Target {formatFileSize(compressStats.target)} belum tercapai karena batas kompresi lossless browser.
                      </div>
                    )}
                    {toolId === 'rotate' && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Preview Hasil Rotate
                        </p>
                        <div className="[&>div]:h-[420px]">
                          <LocalPdfFullPreview blob={processedBlob} name={processedDocName} />
                        </div>
                      </div>
                    )}
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  {splitOutputs.length === 0 && (
                  <div className="flex gap-3">
                    <Button 
                      className="flex-1" 
                      variant="outline" 
                      onClick={triggerDownloadAgain}
                      disabled={!processedDocName.trim()}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Unduh Berkas
                    </Button>
                    
                    {user && canSaveToDashboard && (
                      <Button 
                        className="flex-1" 
                        variant="gradient" 
                        onClick={handleSaveToDashboard}
                        disabled={isSaving || !processedDocName.trim()}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Menyimpan...
                          </>
                        ) : (
                          <>
                            <FolderPlus className="h-4 w-4 mr-2" />
                            Simpan ke Dashboard
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  )}
                  
                  <Button 
                    className="w-full text-muted-foreground hover:text-foreground text-xs" 
                    variant="ghost" 
                    onClick={() => { setShowSuccessModal(false); setFiles([]); setProcessedBlob(null); setSplitOutputs([]); }}
                  >
                    Tutup
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
