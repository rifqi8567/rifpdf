import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/common/logo';
import { LegalReferences } from '@/components/common/legal-references';
import { LEGAL_LAST_UPDATED } from '@/config/legal';

const privacySections = [
  {
    id: 'data-collected',
    title: '1. Data yang kami kumpulkan',
    body: 'Kami dapat memproses data akun seperti nama, email, avatar, metode login, metadata profil, data sesi, serta preferensi penggunaan. Saat Anda mengunggah dokumen, layanan juga memproses nama file, ukuran file, konten dokumen, hasil ekstraksi teks, status pemrosesan, dan riwayat penggunaan fitur.',
  },
  {
    id: 'data-sources',
    title: '2. Sumber data',
    body: 'Data berasal dari informasi yang Anda berikan langsung, dokumen yang Anda unggah, interaksi Anda dengan fitur DocuMind, serta penyedia autentikasi seperti Google atau GitHub apabila Anda memilih masuk melalui OAuth.',
  },
  {
    id: 'processing-purposes',
    title: '3. Tujuan pemrosesan',
    body: 'Data digunakan untuk membuat dan mengamankan akun, menjalankan fitur dokumen, menyediakan hasil konversi dan analisis, menyimpan riwayat dokumen, menghitung kuota atau penggunaan, memperbaiki bug, menjaga keamanan, serta memenuhi kewajiban hukum apabila diperlukan.',
  },
  {
    id: 'processing-basis',
    title: '4. Dasar pemrosesan',
    body: 'Pemrosesan dilakukan berdasarkan persetujuan Anda, kebutuhan menjalankan layanan yang Anda gunakan, kepentingan sah untuk menjaga keamanan dan kualitas layanan, serta kewajiban hukum yang berlaku jika ada permintaan yang sah dari otoritas berwenang.',
  },
  {
    id: 'storage-security',
    title: '5. Penyimpanan dan pengamanan',
    body: 'Kami menerapkan pembatasan akses berbasis akun, kontrol autentikasi, dan pengaturan penyimpanan untuk mengurangi risiko akses tidak sah. Namun, tidak ada sistem elektronik yang sepenuhnya bebas risiko, sehingga Anda sebaiknya tidak mengunggah dokumen yang tidak perlu diproses.',
  },
  {
    id: 'third-party-processing',
    title: '6. Pemrosesan oleh pihak ketiga',
    body: 'Beberapa fitur dapat bergantung pada penyedia infrastruktur, autentikasi, penyimpanan, atau layanan AI. Data hanya dibagikan sejauh diperlukan untuk menjalankan fungsi yang Anda gunakan, menjaga keamanan, atau memenuhi persyaratan hukum.',
  },
  {
    id: 'retention-deletion',
    title: '7. Retensi dan penghapusan',
    body: 'Data disimpan selama akun aktif atau selama diperlukan untuk menyediakan layanan, menyelesaikan masalah teknis, memenuhi kewajiban hukum, dan menjaga catatan keamanan. Anda dapat menghapus dokumen dari akun jika fitur tersebut tersedia.',
  },
  {
    id: 'user-rights',
    title: '8. Hak pengguna',
    body: 'Sesuai hukum yang berlaku, Anda dapat meminta akses, koreksi, pembaruan, penghapusan, pembatasan pemrosesan, atau penjelasan terkait data pribadi yang kami proses. Permintaan dapat ditinjau sesuai identitas akun dan batasan teknis atau hukum.',
  },
  {
    id: 'transfer-processing-location',
    title: '9. Transfer dan lokasi pemrosesan',
    body: 'Data dapat diproses pada infrastruktur cloud atau penyedia layanan yang lokasinya berbeda dari lokasi Anda. Jika terjadi transfer data lintas wilayah, pemrosesan dilakukan sejauh diperlukan untuk menjalankan layanan dan dengan memperhatikan perlindungan yang wajar.',
  },
  {
    id: 'policy-changes',
    title: '10. Perubahan kebijakan',
    body: 'Kebijakan Privasi ini dapat diperbarui mengikuti perubahan fitur, teknologi, atau regulasi. Versi terbaru akan ditampilkan pada halaman ini dengan tanggal pembaruan yang jelas.',
  },
];

export default function PrivacyPage() {
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
            <h1 className="text-3xl font-bold sm:text-4xl">Kebijakan Privasi</h1>
            <p className="text-sm text-muted-foreground">
              Terakhir diperbarui: {LEGAL_LAST_UPDATED}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface-1 p-5 text-sm leading-7 text-muted-foreground">
            <p>
              Kebijakan ini menjelaskan bagaimana DocuMind mengumpulkan, menggunakan, menyimpan,
              melindungi, dan mengelola data pribadi serta dokumen yang diproses melalui layanan.
              Dokumen ini bersifat informatif dan bukan pengganti nasihat hukum profesional.
            </p>
          </div>

          <div className="grid gap-4">
            {privacySections.map((section) => (
              <article key={section.id} className="rounded-lg border border-border bg-card p-5">
                <h2 className="text-base font-semibold">{section.title}</h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{section.body}</p>
              </article>
            ))}
          </div>

          <LegalReferences>
            Kebijakan ini merujuk pada prinsip perlindungan diri pribadi dalam UUD 1945 dan
            regulasi Indonesia terkait data pribadi, sistem elektronik, dan transaksi elektronik.
          </LegalReferences>
        </section>
      </div>
    </main>
  );
}
