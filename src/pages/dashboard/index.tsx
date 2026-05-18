import { motion } from 'framer-motion';
import {
  FileText,
  MessageSquare,
  Zap,
  TrendingUp,
  Upload,
  ArrowUpRight,
  Sparkles,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

// ---- Stats cards ----
const stats = [
  {
    label: 'Dokumen',
    value: '24',
    change: '+3 minggu ini',
    icon: FileText,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
  },
  {
    label: 'Chat AI',
    value: '156',
    change: '+28 minggu ini',
    icon: MessageSquare,
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
  },
  {
    label: 'Kredit Tersisa',
    value: '7',
    change: '3 terpakai',
    icon: Zap,
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
  },
  {
    label: 'Halaman Diproses',
    value: '1,234',
    change: '+89 minggu ini',
    icon: TrendingUp,
    color: 'text-green-400',
    bg: 'bg-green-400/10',
  },
];

// ---- Quick actions ----
const quickActions = [
  { label: 'Upload PDF', icon: Upload, href: '/dashboard/documents', color: 'from-blue-500 to-blue-600' },
  { label: 'AI Chat', icon: MessageSquare, href: '/dashboard/chat', color: 'from-purple-500 to-purple-600' },
  { label: 'Merge PDF', icon: FileText, href: '/dashboard/tools/merge', color: 'from-orange-500 to-orange-600' },
  { label: 'OCR Scan', icon: Sparkles, href: '/dashboard/tools/ocr', color: 'from-green-500 to-green-600' },
];

// ---- Recent documents (demo) ----
const recentDocs = [
  { name: 'Laporan Keuangan Q1 2026.pdf', pages: 48, date: '2 jam lalu', size: '2.4 MB' },
  { name: 'Kontrak Kerjasama PT ABC.pdf', pages: 12, date: '5 jam lalu', size: '890 KB' },
  { name: 'Proposal Project X.pdf', pages: 24, date: 'Kemarin', size: '1.6 MB' },
  { name: 'Resume - John Doe.pdf', pages: 2, date: '3 hari lalu', size: '340 KB' },
];

export default function DashboardPage() {
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold">Selamat datang! 👋</h1>
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

      {/* Stats Grid */}
      <motion.div
        initial="initial"
        animate="animate"
        variants={stagger}
        className="grid gap-4 grid-cols-2 lg:grid-cols-4"
      >
        {stats.map((stat) => (
          <motion.div key={stat.label} variants={fadeUp}>
            <Card className="hover:border-primary/20 hover:shadow-glow transition-all duration-300 cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
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

      {/* Quick Actions */}
      <motion.div
        initial="initial"
        animate="animate"
        variants={stagger}
      >
        <h2 className="text-lg font-semibold mb-3">Aksi Cepat</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

      {/* Recent Documents */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
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
              {recentDocs.map((doc, i) => (
                <motion.div
                  key={doc.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  className="flex items-center gap-4 p-4 hover:bg-secondary/30 transition-colors cursor-pointer"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.pages} halaman · {doc.size}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {doc.date}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Models Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Models Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { name: 'Gemini Flash', icon: '⚡', status: 'active', speed: 'Fast' },
                { name: 'Claude Sonnet', icon: '🧠', status: 'active', speed: 'Medium' },
                { name: 'DeepSeek', icon: '💰', status: 'active', speed: 'Fast' },
                { name: 'GPT-4o', icon: '🎯', status: 'active', speed: 'Medium' },
                { name: 'Qwen 2.5', icon: '🌏', status: 'active', speed: 'Medium' },
              ].map((model) => (
                <div key={model.name} className="rounded-xl border border-border bg-surface-2 p-3 text-center space-y-1">
                  <div className="text-xl">{model.icon}</div>
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
