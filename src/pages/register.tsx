import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/common/logo';
import { cn } from '@/lib/utils';

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'exists'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setStatus('loading');

    try {
      const { supabase } = await import('@/lib/supabase');
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (signUpError) throw signUpError;
      
      // Jika sukses daftar, tampilkan popup sukses
      setStatus('success');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (err: unknown) {
      const e = err as Error;
      const msg = e.message || '';
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
        setStatus('exists');
      } else {
        setStatus('error');
        setErrorMessage(msg || 'Gagal untuk mendaftar. Silakan coba lagi.');
      }
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left — Orbital Animation */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden bg-surface-1">
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute top-1/3 right-1/3 h-72 w-72 rounded-full bg-accent/15 blur-[120px]" />
        <div className="absolute bottom-1/3 left-1/3 h-72 w-72 rounded-full bg-primary/15 blur-[120px]" />

        <div className="flex flex-col items-center gap-10">
          {/* Orbit area */}
          <div className="relative flex items-center justify-center" style={{ width: 300, height: 300 }}>

            {/* Ring orbit utama — pas di boundary container */}
            <div className="absolute inset-[10px] rounded-full border border-white/[0.08]" />
            {/* Ring orbit luar — dekoratif */}
            <div className="absolute inset-[-20px] rounded-full border border-white/[0.04]" />

            {/* Pulse glow */}
            <motion.div
              className="absolute inset-[10px] rounded-full border border-primary/20"
              animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* ===== CENTER ICON — DocuMind ===== */}
            {/* Pakai flex center dari parent, jadi pasti di tengah */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
              className="relative z-10"
            >
              <div className="absolute -inset-6 rounded-3xl gradient-bg opacity-20 blur-2xl" />
              <div className="relative flex h-[68px] w-[68px] items-center justify-center rounded-2xl gradient-bg shadow-glow-lg">
                <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="M9 15l2 2 4-4" opacity="0.8" />
                </svg>
              </div>
            </motion.div>

            {/* ===== ROTATING ICONS ===== */}
            {/* Container sama persis dengan parent (300x300), berputar dari tengah */}
            <motion.div
              className="absolute inset-0"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              {[
                { deg: 0,   label: 'Word',  image: '/word.png',   textColor: '#5B9BD5', delay: 0.4 },
                { deg: 90,  label: 'PPT',   image: '/ppt.png',    textColor: '#FF7F50', delay: 0.6 },
                { deg: 180, label: 'Excel', image: '/excel.png',  textColor: '#33C481', delay: 0.8 },
                { deg: 270, label: 'PDF',   image: '/pdf.png',    textColor: '#FF6B6B', delay: 1.0 },
              ].map((item) => {
                // Radius 130px — icon duduk di lingkaran radius ini
                const R = 130;
                const rad = (item.deg * Math.PI) / 180;
                // Posisi dari center container (150, 150)
                const x = 150 + R * Math.cos(rad);
                const y = 150 + R * Math.sin(rad);
                return (
                  <motion.div
                    key={item.label}
                    className="absolute"
                    style={{
                      top: y,
                      left: x,
                      marginTop: -38, // setengah dari tinggi total (icon 48 + label 14 + gap 4 ≈ 66, tapi kita center di icon)
                      marginLeft: -24, // setengah dari lebar icon (48/2)
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: item.delay, type: 'spring', stiffness: 260, damping: 18 }}
                  >
                    {/* Counter-rotate biar icon tetap tegak */}
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    >
                      <div className="flex flex-col items-center gap-1">
                        {/* Glow */}
                        <div
                          className="absolute -inset-2 rounded-xl blur-lg"
                          style={{ backgroundColor: item.textColor, opacity: 0.2 }}
                        />
                        {/* Icon Image */}
                        <img 
                          src={item.image} 
                          alt={item.label} 
                          className="relative h-12 w-12 object-contain drop-shadow-xl"
                        />
                        {/* Label */}
                        <span className="text-[10px] font-semibold" style={{ color: item.textColor }}>
                          {item.label}
                        </span>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Partikel berkilau — arah sebaliknya */}
            <motion.div
              className="absolute inset-0"
              animate={{ rotate: -360 }}
              transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
            >
              {[45, 135, 225, 315].map((deg) => {
                const R = 130;
                const rad = (deg * Math.PI) / 180;
                return (
                  <motion.div
                    key={deg}
                    className="absolute h-1.5 w-1.5 rounded-full bg-primary/40"
                    style={{
                      top: 150 + R * Math.sin(rad) - 3,
                      left: 150 + R * Math.cos(rad) - 3,
                    }}
                    animate={{ opacity: [0.2, 1, 0.2], scale: [0.5, 1.3, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, delay: deg / 400 }}
                  />
                );
              })}
            </motion.div>
          </div>

          {/* Teks di bawah */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
            className="text-center px-8"
          >
            <p className="text-lg font-semibold gradient-text mb-1">Semua Format Didukung</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Konversi Word, PowerPoint, Excel ke PDF dan sebaliknya dengan mudah
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 sm:px-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm space-y-8"
        >
          <div className="space-y-2">
            <Logo size="lg" />
            <h1 className="text-2xl font-bold mt-6">Buat akun baru</h1>
            <p className="text-muted-foreground text-sm">
              Mulai gunakan DocuMind AI secara gratis
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Lengkap</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="text" 
                  placeholder="John Doe" 
                  className="pl-9" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="email" 
                  placeholder="nama@email.com" 
                  className="pl-9" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 karakter"
                  className="pl-9 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button variant="gradient" size="lg" className="w-full group" type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Memproses...' : 'Buat Akun'}
              {status !== 'loading' && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            Dengan mendaftar, Anda menyetujui{' '}
            <a href="#" className="text-primary hover:underline">Ketentuan Layanan</a>
            {' '}dan{' '}
            <a href="#" className="text-primary hover:underline">Kebijakan Privasi</a>
          </p>

          <p className="text-center text-sm text-muted-foreground">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Masuk
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Pop up UI */}
      <AnimatePresence>
        {status !== 'idle' && status !== 'loading' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-card p-8 flex flex-col items-center text-center max-w-sm w-full shadow-2xl relative overflow-hidden"
            >
              {/* Background gradient blob for popup */}
              <div className={cn(
                "absolute -top-24 -right-24 h-48 w-48 rounded-full blur-[80px] opacity-20",
                status === 'success' ? 'bg-green-500' : status === 'exists' ? 'bg-yellow-500' : 'bg-red-500'
              )} />
              
              {status === 'success' ? (
                <div className="h-20 w-20 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                  >
                    <CheckCircle2 className="h-10 w-10" />
                  </motion.div>
                </div>
              ) : status === 'exists' ? (
                <div className="h-20 w-20 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                  >
                    <AlertCircle className="h-10 w-10" />
                  </motion.div>
                </div>
              ) : (
                <div className="h-20 w-20 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                  <motion.div
                    initial={{ scale: 0, x: [-10, 10, -10, 10, 0] }}
                    animate={{ scale: 1, x: 0 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                  >
                    <XCircle className="h-10 w-10" />
                  </motion.div>
                </div>
              )}
              
              <h3 className="text-xl font-bold mb-3 z-10">
                {status === 'success' ? 'Pendaftaran Berhasil!' : status === 'exists' ? 'Email Terdaftar!' : 'Pendaftaran Gagal'}
              </h3>
              <p className="text-muted-foreground text-sm mb-8 z-10">
                {status === 'success' 
                  ? 'Akun Anda berhasil dibuat. Mengarahkan ke halaman login dalam beberapa detik...' 
                  : status === 'exists' 
                    ? 'Email ini sudah digunakan oleh akun lain. Silakan gunakan email lain atau masuk ke akun Anda.' 
                    : errorMessage}
              </p>
              
              <div className="w-full space-y-3 z-10">
                {status === 'exists' && (
                  <Link to="/login" className="block w-full">
                    <Button variant="gradient" className="w-full">
                      Masuk ke Akun
                    </Button>
                  </Link>
                )}
                {status !== 'success' && (
                  <Button variant="outline" className="w-full" onClick={() => setStatus('idle')}>
                    Coba Lagi
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
