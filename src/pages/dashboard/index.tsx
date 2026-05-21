import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Clock,
  FileText,
  FileImage,
  Loader2,
  MessageSquare,
  ScanLine,
  Sparkles,
  TrendingUp,
  Upload,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatFileSize } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import type { PDFDocument } from '@/types';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const quickActions = [
  { label: 'Upload PDF', icon: Upload, href: '/dashboard/documents', color: 'from-blue-500 to-blue-600' },
  { label: 'AI Chat', icon: MessageSquare, href: '/dashboard/chat', color: 'from-purple-500 to-purple-600' },
  { label: 'Merge PDF', icon: FileText, href: '/dashboard/tools/merge', color: 'from-orange-500 to-orange-600' },
  { label: 'PDF to JPG', icon: FileImage, href: '/dashboard/tools/pdf-to-jpg', color: 'from-amber-500 to-amber-600' },
  { label: 'OCR AI', icon: ScanLine, href: '/dashboard/tools/ocr', color: 'from-green-500 to-green-600' },
];

const aiModels = [
  { name: 'Ollama VPS', icon: 'Local', speed: 'Private' },
  { name: 'Gemini Flash', icon: 'Fast', speed: 'Fast' },
  { name: 'DeepSeek', icon: 'Cost', speed: 'Fast' },
  { name: 'GPT-4o', icon: 'Pro', speed: 'Medium' },
  { name: 'Qwen 2.5', icon: 'ID', speed: 'Medium' },
];

const formatRelativeTime = (dateValue: string) => {
  const timestamp = new Date(dateValue).getTime();
  if (!Number.isFinite(timestamp)) return '-';

  const diffMs = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return 'Baru saja';
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} menit lalu`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} jam lalu`;
  if (diffMs < 2 * day) return 'Kemarin';
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)} hari lalu`;

  return new Date(dateValue).toLocaleDateString('id-ID');
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [docs, setDocs] = useState<PDFDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);

  useEffect(() => {
    if (!user) {
      setDocs([]);
      setIsLoadingDocs(false);
      return;
    }

    let isMounted = true;

    const fetchDashboardDocs = async () => {
      setIsLoadingDocs(true);
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!isMounted) return;

      if (error) {
        console.error('Failed to load dashboard documents:', error);
        setDocs([]);
      } else {
        setDocs((data || []) as PDFDocument[]);
      }

      setIsLoadingDocs(false);
    };

    fetchDashboardDocs();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const readyDocs = docs.filter((doc) => doc.status === 'ready');
  const processingDocs = docs.filter((doc) => doc.status === 'processing' || doc.status === 'uploading');
  const totalPages = docs.reduce((sum, doc) => sum + (doc.page_count || 0), 0);
  const totalSize = docs.reduce((sum, doc) => sum + (doc.file_size || 0), 0);
  const recentDocs = docs.slice(0, 4);
  const creditsRemaining = user?.credits_remaining ?? 0;

  const stats = [
    {
      label: 'Dokumen',
      value: docs.length.toLocaleString('id-ID'),
      change: processingDocs.length > 0 ? `${processingDocs.length} diproses` : `${readyDocs.length} siap`,
      icon: FileText,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
    {
      label: 'Chat AI',
      value: readyDocs.length.toLocaleString('id-ID'),
      change: 'dokumen siap chat',
      icon: MessageSquare,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
    },
    {
      label: 'Kredit Tersisa',
      value: creditsRemaining.toLocaleString('id-ID'),
      change: user?.plan ? `Paket ${user.plan}` : 'belum dimuat',
      icon: Zap,
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/10',
    },
    {
      label: 'Halaman Diproses',
      value: totalPages.toLocaleString('id-ID'),
      change: formatFileSize(totalSize),
      icon: TrendingUp,
      color: 'text-green-400',
      bg: 'bg-green-400/10',
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold">Selamat datang!</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola dokumen PDF Anda dengan kecerdasan AI
          </p>
        </div>
        <Link to="/dashboard/documents">
          <Button variant="gradient" className="group">
            <Upload className="h-4 w-4" />
            Upload PDF
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Button>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <ScanLine className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">OCR AI Scanner aktif</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Scan PDF atau gambar, lalu AI otomatis membuat jawaban, simpulan, penjelasan rapi, dan tindak lanjut.
              </p>
            </div>
          </div>
          <Link to="/dashboard/tools/ocr" className="shrink-0">
            <Button variant="gradient">
              <ScanLine className="h-4 w-4" />
              Buka OCR AI
            </Button>
          </Link>
        </div>
      </motion.div>

      <motion.div initial="initial" animate="animate" variants={stagger} className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <motion.div key={stat.label} variants={fadeUp}>
            <Card className="hover:border-primary/20 hover:shadow-glow transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', stat.bg)}>
                    <stat.icon className={cn('h-5 w-5', stat.color)} />
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{stat.change}</Badge>
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <motion.div initial="initial" animate="animate" variants={stagger}>
        <h2 className="text-lg font-semibold mb-3">Aksi Cepat</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {quickActions.map((action) => (
            <motion.div key={action.label} variants={fadeUp}>
              <Link to={action.href}>
                <motion.div
                  whileHover={{ scale: 1.03, y: -3 }}
                  whileTap={{ scale: 0.97 }}
                  className="glass-card p-4 flex flex-col items-center gap-3 cursor-pointer"
                >
                  <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br', action.color)}>
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-sm font-medium">{action.label}</span>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Dokumen Terbaru</h2>
          <Link to="/dashboard/documents">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              Lihat semua
              <ArrowUpRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {isLoadingDocs && (
                <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memuat dokumen...
                </div>
              )}

              {!isLoadingDocs && recentDocs.length === 0 && (
                <div className="p-8 text-center">
                  <p className="text-sm font-medium">Belum ada dokumen</p>
                  <p className="mt-1 text-xs text-muted-foreground">Upload PDF pertama untuk mulai memakai AI Chat dan analisis dokumen.</p>
                  <Link to="/dashboard/documents" className="mt-4 inline-flex">
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4" />
                      Upload PDF
                    </Button>
                  </Link>
                </div>
              )}

              {!isLoadingDocs && recentDocs.map((doc, index) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.08 }}
                  className="flex items-center gap-4 p-4 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.page_count} halaman · {formatFileSize(doc.file_size)}</p>
                  </div>
                  <Badge variant={doc.status === 'ready' ? 'success' : doc.status === 'error' ? 'destructive' : 'warning'} className="hidden sm:inline-flex text-[10px]">
                    {doc.status === 'ready' ? 'Siap' : doc.status === 'error' ? 'Error' : 'Proses'}
                  </Badge>
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(doc.created_at)}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Models Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {aiModels.map((model) => (
                <div key={model.name} className="rounded-xl border border-border bg-surface-2 p-3 text-center space-y-1">
                  <div className="text-xs font-semibold text-primary">{model.icon}</div>
                  <p className="text-xs font-medium truncate">{model.name}</p>
                  <Badge variant="success" className="text-[9px]">{model.speed}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
