import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import {
  ArrowRight,
  MessageSquare,
  FileText,
  Merge,
  Scissors,
  Minimize2,
  PenTool,
  RefreshCw,
  ScanLine,
  Sparkles,
  Shield,
  Zap,
  Globe,
  Star,
  Check,
  ChevronRight,
  UserRound,
  Code2,
  Braces,
  Palette,
  Database,
  Server,
  Lock,
  BrainCircuit,
  Layers3,
  Rocket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/common/logo';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { cn } from '@/lib/utils';

// ============================================
// Animation variants
// ============================================
const fadeUp: Variants = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const staggerContainer: Variants = {
  animate: { transition: { staggerChildren: 0.1 } },
};

// ============================================
// Header
// ============================================
function LandingHeader() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/5"
    >
      <div className="glass">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo size="md" />

          <nav className="hidden md:flex items-center gap-8">
            {['Fitur', 'Tools', 'Gratis', 'Tentang'].map((item) => (
              <a
                key={item}
                href={item === 'Gratis' ? '#gratis' : `#${item.toLowerCase()}`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Masuk
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="gradient" size="sm">
                Mulai Gratis
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.header>
  );
}

// ============================================
// Hero Section
// ============================================
function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid" />
      <div className="absolute inset-0 bg-radial-gradient" />
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-accent/10 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <motion.div initial="initial" animate="animate" variants={fadeUp} className="space-y-8">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex"
          >
            <Badge variant="outline" className="gap-2 px-4 py-1.5 text-sm border-primary/30 bg-primary/5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Platform AI PDF Terdepan di Indonesia
            </Badge>
          </motion.div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
            <span className="text-foreground">Kelola PDF dengan</span>
            <br />
            <span className="gradient-text">Kecerdasan AI</span>
          </h1>

          {/* Description */}
          <p className="mx-auto max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed">
            Chat, analisis, ringkasan, merge, split, compress, tanda tangan, konversi,
            dan OCR — semua dalam satu platform bertenaga AI.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button variant="gradient" size="xl" className="group min-w-[200px]">
                Mulai Gratis
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="outline" size="xl" className="min-w-[200px]">
                Lihat Demo
              </Button>
            </Link>
          </div>

          {/* Social Proof */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-4 w-4 fill-warning text-warning" />
              ))}
              <span className="ml-1">4.9/5</span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-border" />
            <span>10,000+ pengguna aktif</span>
            <div className="hidden sm:block h-4 w-px bg-border" />
            <span>1M+ PDF diproses</span>
          </div>
        </motion.div>

        {/* Hero visual — floating card */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mt-16 relative mx-auto max-w-4xl"
        >
          <div className="absolute inset-0 gradient-bg rounded-2xl opacity-20 blur-3xl" />
          <div className="relative rounded-2xl border border-white/10 bg-surface-1 p-1 shadow-2xl">
            <div className="rounded-xl bg-surface-2 overflow-hidden">
              {/* Mock dashboard */}
              <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/60" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                  <div className="h-3 w-3 rounded-full bg-green-500/60" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="rounded-md bg-surface-3 px-16 py-1 text-[11px] text-muted-foreground">
                    documind.ai/dashboard
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg gradient-bg flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="h-3 w-32 rounded bg-foreground/10" />
                    <div className="h-2 w-48 rounded bg-foreground/5 mt-2" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-lg border border-border bg-surface-3 p-4 space-y-2">
                      <div className="h-2 w-16 rounded bg-primary/20" />
                      <div className="h-6 w-12 rounded bg-foreground/10" />
                      <div className="h-1.5 w-full rounded bg-foreground/5" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 rounded-lg border border-border bg-surface-3 p-4 h-24" />
                  <div className="w-1/3 rounded-lg border border-border bg-surface-3 p-4 h-24" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================
// Features Section
// ============================================
const features = [
  {
    icon: MessageSquare,
    title: 'AI Chat PDF',
    description: 'Tanya jawab langsung dengan dokumen PDF menggunakan AI canggih.',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
  },
  {
    icon: Sparkles,
    title: 'Ringkasan AI',
    description: 'Dapatkan ringkasan otomatis dari dokumen panjang dalam hitungan detik.',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
  },
  {
    icon: ScanLine,
    title: 'OCR Scanner',
    description: 'Ekstrak teks dari gambar dan PDF scan dengan teknologi OCR terdepan.',
    color: 'text-green-400',
    bg: 'bg-green-400/10',
  },
  {
    icon: Merge,
    title: 'Merge PDF',
    description: 'Gabungkan beberapa file PDF menjadi satu dokumen dengan mudah.',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
  },
  {
    icon: Shield,
    title: 'Keamanan Tinggi',
    description: 'Data Anda terenkripsi dan diproses dengan standar keamanan enterprise.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
  },
  {
    icon: Zap,
    title: 'Multi AI Model',
    description: 'Routing AI pintar memilih model terbaik untuk setiap jenis tugas.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
  },
];

function FeaturesSection() {
  return (
    <section id="fitur" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-dots opacity-30" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.div variants={fadeUp}>
            <Badge variant="outline" className="mb-4">✨ Fitur Unggulan</Badge>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold mb-4">
            Semua yang Anda butuhkan untuk
            <br />
            <span className="gradient-text">mengelola PDF</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Dari AI chat hingga konversi, semua tools PDF dalam satu platform terintegrasi.
          </motion.p>
        </motion.div>

        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                className="glass-card group cursor-pointer overflow-hidden"
              >
                <Link to="/register" className="block p-6 h-full">
                  <div className={cn('inline-flex h-12 w-12 items-center justify-center rounded-xl mb-4', feature.bg)}>
                    <Icon className={cn('h-6 w-6', feature.color)} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  <div className="mt-4 flex items-center text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Pelajari lebih lanjut
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================
// Tools Section
// ============================================
const tools = [
  { icon: Merge, label: 'Merge', color: 'from-blue-500 to-blue-600' },
  { icon: Scissors, label: 'Split', color: 'from-green-500 to-green-600' },
  { icon: Minimize2, label: 'Compress', color: 'from-orange-500 to-orange-600' },
  { icon: PenTool, label: 'Sign', color: 'from-purple-500 to-purple-600' },
  { icon: RefreshCw, label: 'Convert', color: 'from-cyan-500 to-cyan-600' },
  { icon: ScanLine, label: 'OCR', color: 'from-pink-500 to-pink-600' },
  { icon: FileText, label: 'Analyze', color: 'from-indigo-500 to-indigo-600' },
  { icon: Globe, label: 'Translate', color: 'from-teal-500 to-teal-600' },
];

function ToolsSection() {
  return (
    <section id="tools" className="py-24 bg-surface-1">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.div variants={fadeUp}>
            <Badge variant="outline" className="mb-4">🛠️ PDF Tools</Badge>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold mb-4">
            <span className="gradient-text">10+ Tools PDF</span> dalam satu platform
          </motion.h2>
        </motion.div>

        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <motion.div
                key={tool.label}
                variants={fadeUp}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                className="glass-card flex flex-col cursor-pointer overflow-hidden"
              >
                <Link to="/register" className="p-6 flex flex-col items-center gap-3 h-full w-full">
                  <div className={cn('flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br', tool.color)}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <span className="text-sm font-medium">{tool.label} PDF</span>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

const freeFeatures = [
  'Semua tools PDF tersedia gratis',
  'AI Chat PDF dan ringkasan dokumen tersedia untuk semua akun',
  'OCR Scanner untuk PDF dan gambar',
  'Merge, split, compress, rotate, sign, dan convert',
  'Tanpa pembayaran dan tanpa hitungan jatah pakai',
];

function FreeAccessSection() {
  return (
    <section id="gratis" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-primary/25 bg-surface-2 p-8 shadow-glow lg:p-10"
        >
          <motion.div variants={fadeUp}>
            <Badge variant="outline" className="mb-4">Gratis Penuh</Badge>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl font-bold sm:text-4xl">
            Semua fitur DocuMind sekarang gratis.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-muted-foreground">
            Semua akun mendapat akses yang sama. Fokusnya sekarang simpel:
            upload dokumen, proses PDF, pakai AI, dan selesai.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8 grid gap-3 sm:grid-cols-2">
            {freeFeatures.map((feature) => (
              <div key={feature} className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-4">
                <Check className="h-5 w-5 shrink-0 text-success" />
                <span className="text-sm font-medium">{feature}</span>
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} className="mt-8">
            <Link to="/register">
              <Button variant="gradient" size="lg">
                Mulai Pakai Gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

const techStack = [
  {
    icon: Code2,
    title: 'React + TypeScript',
    description: 'Frontend dibuat dengan komponen React dan TypeScript supaya tampilan lebih rapi, aman, dan mudah dikembangkan.',
    color: 'text-sky-400',
    bg: 'bg-sky-400/10',
  },
  {
    icon: Palette,
    title: 'Tailwind CSS',
    description: 'Desain visual, layout responsif, dark mode, dan efek glass dibuat memakai utility class Tailwind CSS.',
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-400/10',
  },
  {
    icon: BrainCircuit,
    title: 'AI + PDF Engine',
    description: 'Fitur chat PDF, ringkasan, OCR, merge, split, dan konversi dibangun dengan alur pemrosesan dokumen modern.',
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
  },
  {
    icon: Database,
    title: 'Supabase',
    description: 'Autentikasi, data pengguna, dokumen, dan penyimpanan metadata didukung oleh Supabase.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
  },
  {
    icon: Server,
    title: 'Backend Worker',
    description: 'Proses berat seperti konversi dan ekstraksi dokumen dipisah ke service backend agar aplikasi tetap cepat.',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
  },
  {
    icon: Lock,
    title: 'Keamanan Data',
    description: 'Setiap alur dibuat dengan fokus pada akses akun, pengelolaan file, dan pemrosesan dokumen yang terkendali.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
  },
];

const aboutHighlights = [
  { icon: Rocket, label: 'Cepat dipakai', value: 'Tools siap untuk kerja harian' },
  { icon: Layers3, label: 'Satu platform', value: 'AI, OCR, dan PDF tools menyatu' },
  { icon: Braces, label: 'Modern stack', value: 'React, TypeScript, Tailwind, Supabase' },
];

function AboutOrbitalVisual() {
  return (
    <div className="relative mx-auto flex min-h-[420px] w-full max-w-lg items-center justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-surface-2/50 p-6 shadow-glow">
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="absolute left-8 top-8 h-24 w-24 rounded-full bg-info/10 blur-2xl" />
      <div className="absolute bottom-10 right-8 h-28 w-28 rounded-full bg-accent/10 blur-2xl" />

      <motion.div
        className="relative h-72 w-72"
        animate={{ rotateX: [58, 64, 58], rotateZ: [0, 360] }}
        transition={{ rotateZ: { duration: 28, repeat: Infinity, ease: 'linear' }, rotateX: { duration: 6, repeat: Infinity, ease: 'easeInOut' } }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {[0, 1, 2].map((ring) => (
          <div
            key={ring}
            className="absolute inset-0 rounded-full border border-primary/25"
            style={{ transform: `rotateX(${ring * 60}deg) rotateY(${ring * 25}deg)` }}
          />
        ))}

        {[
          { icon: Code2, label: 'TS', angle: 0, color: 'from-sky-400 to-blue-500' },
          { icon: BrainCircuit, label: 'AI', angle: 72, color: 'from-violet-400 to-fuchsia-500' },
          { icon: Database, label: 'DB', angle: 144, color: 'from-emerald-400 to-teal-500' },
          { icon: Server, label: 'API', angle: 216, color: 'from-amber-400 to-orange-500' },
          { icon: Lock, label: 'SEC', angle: 288, color: 'from-cyan-400 to-indigo-500' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="absolute left-1/2 top-1/2 h-16 w-16"
              style={{ transform: `translate(-50%, -50%) rotate(${item.angle}deg) translateX(128px) rotate(-${item.angle}deg)` }}
            >
              <motion.div
                className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-surface-3 shadow-card"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay: item.angle / 180 }}
              >
                <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br', item.color)}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </motion.div>
            </div>
          );
        })}

        <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2">
          <motion.div
            className="flex h-32 w-32 flex-col items-center justify-center rounded-[1.5rem] border border-primary/30 bg-surface-1/95 shadow-glow-lg"
            animate={{ rotateY: [0, 360] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <FileText className="h-10 w-10 text-primary" />
            <span className="mt-2 text-sm font-semibold">DocuMind</span>
            <span className="text-xs text-muted-foreground">AI PDF</span>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

function AboutSection() {
  return (
    <section id="tentang" className="relative overflow-hidden bg-surface-1 py-24">
      <div className="absolute inset-0 bg-dots opacity-20" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-80px' }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeUp}>
              <Badge variant="outline" className="mb-4 gap-2">
                <UserRound className="h-3.5 w-3.5 text-primary" />
                Tentang Pembuat
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              Dibuat oleh <span className="gradient-text">Muhammad Rifqi thufail fahmi</span> untuk membuat PDF terasa lebih pintar.
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              DocuMind adalah aplikasi web untuk membantu pengguna mengelola dokumen PDF dengan cepat:
              mulai dari chat dengan isi dokumen, membuat ringkasan, OCR, menggabungkan file, memisahkan halaman,
              kompresi, tanda tangan, sampai konversi dokumen.
            </motion.p>
            <motion.p variants={fadeUp} className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Bagian tampilannya dibuat dengan bahasa pemrograman TypeScript di atas React. Styling memakai Tailwind CSS,
              animasi memakai Framer Motion, sedangkan data dan autentikasi didukung Supabase serta service backend untuk
              pemrosesan PDF.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 grid gap-4 sm:grid-cols-3">
              {aboutHighlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl border border-border bg-card/50 p-4">
                    <Icon className="h-5 w-5 text-primary" />
                    <div className="mt-3 text-sm font-semibold">{item.label}</div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.value}</p>
                  </div>
                );
              })}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <AboutOrbitalVisual />
          </motion.div>
        </div>

        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-80px' }}
          variants={staggerContainer}
          className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {techStack.map((tech) => {
            const Icon = tech.icon;
            return (
              <motion.div key={tech.title} variants={fadeUp} className="glass-card p-6">
                <div className={cn('mb-4 flex h-12 w-12 items-center justify-center rounded-2xl', tech.bg)}>
                  <Icon className={cn('h-6 w-6', tech.color)} />
                </div>
                <h3 className="text-base font-semibold">{tech.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tech.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================
// Footer
// ============================================
function Footer() {
  return (
    <footer className="border-t border-border bg-surface-1 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Logo />
            <p className="text-sm text-muted-foreground max-w-xs">
              Platform AI PDF modern untuk produktivitas dokumen Anda.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Produk</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">AI Chat PDF</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">PDF Tools</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">OCR Scanner</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">API</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Perusahaan</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#tentang" className="hover:text-foreground transition-colors">Tentang</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Karir</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Kontak</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Cookie Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} DocuMind AI. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">Built with ❤️ in Indonesia</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ============================================
// Landing Page
// ============================================
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <LandingHeader />
      <HeroSection />
      <FeaturesSection />
      <ToolsSection />
      <FreeAccessSection />
      <AboutSection />
      <Footer />
    </div>
  );
}
