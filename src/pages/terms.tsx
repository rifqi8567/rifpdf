import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/common/logo';
import { LegalReferences } from '@/components/common/legal-references';
import { LEGAL_LAST_UPDATED } from '@/config/legal';

const termsSections = [
  {
    id: 'acceptance',
    title: '1. Penerimaan ketentuan',
    body: 'Dengan membuat akun, masuk, mengunggah dokumen, atau menggunakan fitur DocuMind, Anda menyatakan telah membaca dan menyetujui Ketentuan Layanan ini. Jika Anda tidak setuju, Anda dapat berhenti menggunakan layanan.',
  },
  {
    id: 'service-functionality',
    title: '2. Fungsi layanan',
    body: 'DocuMind menyediakan alat untuk mengunggah, mengelola, mengonversi, membaca, merangkum, dan menganalisis dokumen dengan bantuan sistem otomatis dan AI. Fitur dapat berubah dari waktu ke waktu untuk meningkatkan keamanan, kinerja, dan kualitas layanan.',
  },
  {
    id: 'account-security',
    title: '3. Akun dan keamanan',
    body: 'Anda bertanggung jawab menjaga keamanan akun, kredensial login, serta aktivitas yang terjadi melalui akun Anda. Segera hentikan penggunaan atau ubah akses jika Anda menduga akun digunakan tanpa izin.',
  },
  {
    id: 'documents-user-rights',
    title: '4. Dokumen dan hak pengguna',
    body: 'Anda tetap memiliki hak atas dokumen yang Anda unggah. Dengan menggunakan layanan, Anda memberikan izin terbatas kepada DocuMind untuk memproses dokumen tersebut sejauh diperlukan untuk menjalankan fitur yang Anda minta, seperti konversi, ekstraksi teks, penyimpanan, dan analisis.',
  },
  {
    id: 'prohibited-use',
    title: '5. Penggunaan yang dilarang',
    body: 'Anda tidak boleh menggunakan layanan untuk mengunggah konten ilegal, melanggar hak cipta, menyebarkan malware, mencoba merusak sistem, mengambil data pengguna lain, melakukan penyalahgunaan kredensial, atau aktivitas lain yang bertentangan dengan hukum dan etika penggunaan sistem elektronik.',
  },
  {
    id: 'ai-results-accuracy',
    title: '6. Hasil AI dan batas akurasi',
    body: 'Ringkasan, jawaban, ekstraksi, dan hasil analisis AI dapat mengandung kesalahan atau ketidaktepatan. Anda perlu meninjau hasil sebelum menggunakannya untuk keputusan penting, terutama keputusan hukum, keuangan, akademik, medis, atau bisnis.',
  },
  {
    id: 'availability-service-changes',
    title: '7. Ketersediaan dan perubahan layanan',
    body: 'Kami berupaya menjaga layanan tetap tersedia, tetapi tidak menjamin layanan selalu bebas gangguan. Pemeliharaan, perubahan infrastruktur, pembatasan pihak ketiga, atau gangguan teknis dapat memengaruhi akses dan performa layanan.',
  },
  {
    id: 'liability-limits',
    title: '8. Pembatasan tanggung jawab',
    body: 'Sejauh diizinkan oleh hukum yang berlaku, DocuMind tidak bertanggung jawab atas kerugian tidak langsung, kehilangan data akibat tindakan pengguna, atau keputusan yang dibuat semata-mata berdasarkan hasil otomatis tanpa verifikasi mandiri.',
  },
  {
    id: 'access-termination',
    title: '9. Penghentian akses',
    body: 'Kami dapat membatasi atau menghentikan akses apabila terdapat indikasi pelanggaran ketentuan, risiko keamanan, permintaan hukum yang sah, atau penyalahgunaan layanan yang merugikan pengguna lain maupun sistem.',
  },
  {
    id: 'terms-changes',
    title: '10. Perubahan ketentuan',
    body: 'Ketentuan ini dapat diperbarui sesuai perkembangan fitur, kebutuhan operasional, dan perubahan hukum. Versi terbaru akan ditampilkan pada halaman ini dan berlaku sejak tanggal pembaruan yang tercantum.',
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex items-center justify-between gap-4">
          <Logo size="lg" />
          <Button variant="outline" asChild>
            <Link to="/register">
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Link>
          </Button>
        </div>

        <section className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">DocuMind AI</p>
            <h1 className="text-3xl font-bold sm:text-4xl">Ketentuan Layanan</h1>
            <p className="text-sm text-muted-foreground">
              Terakhir diperbarui: {LEGAL_LAST_UPDATED}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface-1 p-5 text-sm leading-7 text-muted-foreground">
            <p>
              Dokumen ini menjelaskan aturan penggunaan DocuMind. Bahasa di halaman ini dibuat
              agar mudah dipahami pengguna, bukan sebagai pengganti nasihat hukum profesional.
            </p>
          </div>

          <div className="grid gap-4">
            {termsSections.map((section) => (
              <article key={section.id} className="rounded-lg border border-border bg-card p-5">
                <h2 className="text-base font-semibold">{section.title}</h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{section.body}</p>
              </article>
            ))}
          </div>

          <LegalReferences>
            Ketentuan ini disusun dengan memperhatikan prinsip umum perlindungan hak pribadi dalam
            UUD 1945, khususnya hak atas perlindungan diri pribadi dan komunikasi/informasi, serta
            regulasi Indonesia yang relevan untuk layanan digital.
          </LegalReferences>
        </section>
      </div>
    </main>
  );
}
