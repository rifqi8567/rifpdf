import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/lib/utils';

type PreviewState = {
  blob?: Blob;
  name?: string;
  sourceTool?: string;
  sourceLabel?: string;
};

function PdfFrame({ blob, name }: { blob: Blob; name: string }) {
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    setPreviewUrl(`${url}#toolbar=0&navpanes=0&scrollbar=0`);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [blob]);

  return (
    <div className="h-[72vh] overflow-hidden rounded-xl border border-border bg-white">
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

export default function ToolPreviewPage() {
  const navigate = useNavigate();
  const { toolId } = useParams();
  const location = useLocation();
  const state = (location.state || {}) as PreviewState;

  const blob = state.blob;
  const name = state.name || 'hasil-konversi.pdf';

  const title = useMemo(() => {
    if (state.sourceLabel) return state.sourceLabel;
    if (toolId === 'convert') return 'Preview Hasil Konversi';
    return 'Preview Dokumen';
  }, [state.sourceLabel, toolId]);

  if (!blob) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center px-4 py-10">
        <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div className="space-y-2">
              <h1 className="text-lg font-semibold">{title}</h1>
              <p className="text-sm text-muted-foreground">
                Tidak ada file preview yang dibawa ke halaman ini. Jalankan konversi dari halaman tool dulu.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Button variant="outline" onClick={() => navigate(`/dashboard/tools/${toolId || 'convert'}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Tool
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {name} · {formatFileSize(blob.size)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate(`/dashboard/tools/${toolId || 'convert'}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
          <Button
            variant="gradient"
            onClick={() => {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = name;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Unduh PDF
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-3">
        <PdfFrame blob={blob} name={name} />
      </div>
    </div>
  );
}
