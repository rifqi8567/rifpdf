import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/common/logo';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center justify-between gap-4">
          <Logo size="lg" />
          <Button variant="outline" asChild>
            <Link to="/register">
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Link>
          </Button>
        </div>

        <section className="space-y-5">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Kebijakan Privasi</h1>
            <p className="text-sm text-muted-foreground">Terakhir diperbarui: 26 Mei 2026</p>
          </div>

          <div className="space-y-4 text-sm leading-7 text-muted-foreground">
            <p>
              DocuMind menyimpan informasi akun seperti email, nama, dan metadata profil untuk
              menjalankan autentikasi dan pengalaman pengguna.
            </p>
            <p>
              Dokumen yang Anda unggah digunakan untuk menyediakan fitur pemrosesan dokumen,
              termasuk konversi, ekstraksi teks, dan fitur AI yang Anda jalankan.
            </p>
            <p>
              Kami menjaga akses data berdasarkan akun pengguna dan tidak menyarankan Anda
              mengunggah dokumen yang sangat sensitif tanpa meninjau kebutuhan keamanan tambahan.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
