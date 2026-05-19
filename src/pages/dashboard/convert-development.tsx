import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Clock3,
  FileText,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const plannedItems = [
  'Konversi Word, Excel, dan PowerPoint ke PDF',
  'Preview hasil sebelum unduh',
  'Penyimpanan hasil ke dashboard dokumen',
];

export default function ConvertDevelopmentPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl items-center px-4 py-8 lg:px-6">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      >
        <div className="border-b border-border bg-surface-2 px-5 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Dashboard
            </Link>
          </Button>
        </div>

        <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6 p-6 sm:p-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20">
              <RefreshCw className="h-7 w-7" />
            </div>

            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                <Clock3 className="h-3.5 w-3.5" />
                Masih tahap pengembangan
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Fitur Konversi PDF belum tersedia
              </h1>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                Halaman konversi sedang dinonaktifkan sementara karena fitur ini masih dalam proses
                penyempurnaan. Tool PDF lain tetap bisa digunakan seperti biasa dari menu dashboard.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="gradient" asChild>
                <Link to="/dashboard/tools/merge">
                  <FileText className="h-4 w-4" />
                  Buka Tool PDF
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/dashboard/help">
                  Bantuan
                </Link>
              </Button>
            </div>
          </div>

          <div className="border-t border-border bg-background/40 p-6 sm:p-8 md:border-l md:border-t-0">
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Yang sedang disiapkan
                </p>
                <div className="mt-3 space-y-3">
                  {plannedItems.map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"
                    >
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <p className="text-sm text-foreground">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface-2 p-4">
                <div className="flex items-start gap-3">
                  <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Status implementasi</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Akses upload dan proses konversi dimatikan dulu agar pengguna tidak menjalankan
                      fitur yang hasilnya belum stabil.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
