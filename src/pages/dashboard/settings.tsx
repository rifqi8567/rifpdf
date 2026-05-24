import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Key,
  Save,
  CheckCircle2,
  Sun,
  Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useThemeStore } from '@/store/theme-store';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getUserProfile, updateUserProfile } from '@/services/profile';
import { debugAction, debugError } from '@/lib/debug';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function SettingsPage() {
  const { theme, setTheme } = useThemeStore();
  const { user, setUser } = useAuthStore();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // States for Security and Language
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [language, setLanguage] = useState<'id' | 'en'>('id');
  
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Informasi profil Anda telah berhasil diperbarui.');

  useEffect(() => {
    // Ambil data user dari Supabase saat komponen di-mount
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        debugAction('settings', 'profile fetch start', { userId: session.user.id });
        const profile = await getUserProfile(session.user);
        debugAction('settings', 'profile fetch success', {
          userId: profile.id,
          hasAvatar: Boolean(profile.avatar_url),
        });
        
        setFullName(profile.full_name || user?.full_name || 'User Demo');
        setEmail(profile.email || user?.email || 'user@demo.com');
        setAvatarUrl(profile.avatar_url || user?.avatar_url || '');
        
        if (
          !user ||
          user.full_name !== profile.full_name ||
          user.avatar_url !== profile.avatar_url ||
          user.email !== profile.email ||
          user.plan !== profile.plan ||
          user.credits_remaining !== profile.credits_remaining
        ) {
          setUser(profile);
        }
      }
    };
    fetchUser();
  }, [user, setUser]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    debugAction('settings', 'profile photo selected', { file });

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 200; // Resize to max 200px to keep base64 small
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setAvatarUrl(dataUrl);
        debugAction('settings', 'profile photo resized', {
          fileName: file.name,
          originalWidth: img.width,
          originalHeight: img.height,
          width,
          height,
          dataUrlLength: dataUrl.length,
        });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    debugAction('settings', 'profile save start', {
      userId: user?.id,
      fullName,
      hasAvatar: Boolean(avatarUrl),
    });
    try {
      const currentUserId = user?.id || (await supabase.auth.getUser()).data.user?.id;
      if (!currentUserId) throw new Error('Sesi login tidak ditemukan.');

      await updateUserProfile(currentUserId, fullName, avatarUrl);
      debugAction('settings', 'profile save success', {
        userId: currentUserId,
        hasAvatar: Boolean(avatarUrl),
      });
      
      if (user) {
        setUser({ ...user, full_name: fullName, avatar_url: avatarUrl });
      }
      
      // Tampilkan popup animasi sukses
      setSuccessMessage('Informasi profil Anda telah berhasil diperbarui.');
      setShowSuccessPopup(true);
      setTimeout(() => setShowSuccessPopup(false), 3000);
      
    } catch (err: any) {
      debugError('settings', 'profile save failed', err, { userId: user?.id });
      toast.error(err.message || 'Gagal menyimpan profil.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password baru minimal 6 karakter.');
      debugAction('settings', 'password update blocked', { reason: 'too_short' }, 'warn');
      return;
    }
    
    setIsUpdatingPassword(true);
    debugAction('settings', 'password update start', { userId: user?.id });
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      debugAction('settings', 'password update success', { userId: user?.id });
      
      setNewPassword('');
      setSuccessMessage('Password Anda berhasil diperbarui!');
      setShowSuccessPopup(true);
      setTimeout(() => setShowSuccessPopup(false), 3000);
      
    } catch (err: any) {
      debugError('settings', 'password update failed', err, { userId: user?.id });
      toast.error(err.message || 'Gagal mengubah password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-5xl mx-auto w-full">
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
              <div className="relative h-16 w-16 rounded-full gradient-bg flex items-center justify-center text-white text-xl font-bold uppercase overflow-hidden shadow-inner">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  fullName?.[0] || email?.[0] || 'U'
                )}
              </div>
              <div>
                <Input 
                  type="file" 
                  id="avatar-upload" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handlePhotoUpload} 
                />
                <label htmlFor="avatar-upload">
                  <Button variant="outline" size="sm" asChild className="cursor-pointer">
                    <span>Ganti Foto</span>
                  </Button>
                </label>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Lengkap</label>
                <Input 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Masukkan nama Anda"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input value={email} disabled />
              </div>
            </div>
            <Button variant="gradient" size="sm" onClick={handleSaveProfile} disabled={isSaving}>
              <Save className="h-3.5 w-3.5" /> {isSaving ? 'Menyimpan...' : 'Simpan'}
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
                  <p className="text-sm font-medium capitalize flex items-center justify-center gap-2">
                    {t === 'dark' ? (
                      <><Moon className="h-4 w-4" /> Gelap</>
                    ) : (
                      <><Sun className="h-4 w-4" /> Terang</>
                    )}
                  </p>
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
              <Input 
                type="password" 
                placeholder="Password baru" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleUpdatePassword}
              disabled={isUpdatingPassword || !newPassword}
            >
              <Key className="h-3.5 w-3.5 mr-2" /> 
              {isUpdatingPassword ? 'Memperbarui...' : 'Update Password'}
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
                  onClick={() => {
                    debugAction('settings', 'language changed', { language: lang.code });
                    setLanguage(lang.code as 'id' | 'en');
                    toast.success(`Bahasa diubah ke ${lang.label}`);
                  }}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all',
                    language === lang.code ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/30'
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

      {/* Success Popup */}
      <AnimatePresence>
        {showSuccessPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="bg-card border border-border shadow-2xl rounded-2xl p-8 max-w-sm w-full text-center space-y-5"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.6, delay: 0.1 }}
                className="mx-auto w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center"
              >
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </motion.div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-foreground">Berhasil Disimpan!</h3>
                <p className="text-sm text-muted-foreground">
                  {successMessage}
                </p>
              </div>
              <Button 
                className="w-full mt-4" 
                variant="gradient" 
                onClick={() => setShowSuccessPopup(false)}
              >
                Tutup
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
