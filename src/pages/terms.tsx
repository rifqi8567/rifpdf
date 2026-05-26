import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/common/logo';

export default function TermsPage() {
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
            <h1 className="text-3xl font-bold">Ketentuan Layanan</h1>
            <p className="text-sm text-muted-foreground">Terakhir diperbarui: 26 Mei 2026</p>
          </div>

          <div className="space-y-4 text-sm leading-7 text-muted-foreground">
            <p>
              Dengan menggunakan DocuMind, Anda setuju untuk menggunakan layanan ini secara wajar,
              tidak melanggar hukum, dan tidak mengunggah dokumen yang bukan hak Anda.
            </p>
            <p>
              Layanan dapat membantu memproses, mengonversi, menganalisis, dan mengelola dokumen.
              Hasil pemrosesan otomatis perlu ditinjau kembali oleh pengguna sebelum digunakan untuk
              keputusan penting.
            </p>
            <p>
              Kami dapat memperbarui fitur, batas penggunaan, dan ketentuan layanan dari waktu ke
              waktu agar layanan tetap aman dan stabil.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
