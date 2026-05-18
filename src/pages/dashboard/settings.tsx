import { motion } from 'framer-motion';
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Key,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useThemeStore } from '@/store/theme-store';
import { cn } from '@/lib/utils';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function SettingsPage() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-3xl mx-auto">
      <motion.div {...fadeUp}>
        <h1 className="text-2xl font-bold">Pengaturan</h1>
        <p className="text-muted-foreground text-sm mt-1">Kelola akun dan preferensi Anda</p>
      </motion.div>

      {/* Profile */}
      <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-primary" /> Profil
            </CardTitle>
            <CardDescription>Informasi akun Anda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full gradient-bg flex items-center justify-center text-white text-xl font-bold">
                U
              </div>
              <div>
                <Button variant="outline" size="sm">Ganti Foto</Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Lengkap</label>
                <Input defaultValue="User Demo" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input defaultValue="user@demo.com" disabled />
              </div>
            </div>
            <Button variant="gradient" size="sm">
              <Save className="h-3.5 w-3.5" /> Simpan
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Appearance */}
      <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4 text-primary" /> Tampilan
            </CardTitle>
            <CardDescription>Sesuaikan tampilan aplikasi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {(['dark', 'light'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={cn(
                    'flex-1 rounded-xl border-2 p-4 text-center transition-all',
                    theme === t ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                  )}
                >
                  <div className={cn(
                    'h-16 rounded-lg mb-2',
                    t === 'dark' ? 'bg-[#0a0a1a]' : 'bg-[#fafafa] border border-gray-200'
                  )} />
                  <p className="text-sm font-medium capitalize">{t === 'dark' ? 'Gelap' : 'Terang'}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notifications */}
      <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4 text-primary" /> Notifikasi
            </CardTitle>
            <CardDescription>Atur preferensi notifikasi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Email notifikasi', description: 'Terima update via email' },
              { label: 'Push notifikasi', description: 'Notifikasi browser' },
              { label: 'Laporan mingguan', description: 'Ringkasan aktivitas mingguan' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-9 h-5 bg-border rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                </label>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Security */}
      <motion.div {...fadeUp} transition={{ delay: 0.4 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-primary" /> Keamanan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ganti Password</label>
              <Input type="password" placeholder="Password lama" />
              <Input type="password" placeholder="Password baru" />
            </div>
            <Button variant="outline" size="sm">
              <Key className="h-3.5 w-3.5" /> Update Password
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Language */}
      <motion.div {...fadeUp} transition={{ delay: 0.5 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-primary" /> Bahasa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {[
                { code: 'id', label: 'Indonesia', flag: '🇮🇩' },
                { code: 'en', label: 'English', flag: '🇺🇸' },
              ].map((lang) => (
                <button
                  key={lang.code}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all',
                    lang.code === 'id' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/30'
                  )}
                >
                  <span className="text-lg">{lang.flag}</span>
                  {lang.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Plan */}
      <motion.div {...fadeUp} transition={{ delay: 0.6 }}>
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">Paket Saat Ini</h3>
                <Badge variant="gradient">Free</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Upgrade untuk fitur dan kredit lebih banyak</p>
            </div>
            <Button variant="gradient">Upgrade ke Pro</Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
