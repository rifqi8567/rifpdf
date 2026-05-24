import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  Info,
  BookOpen,
  MessageCircle,
  ChevronDown,
  UploadCloud,
  FileText,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } }
};

const faqs = [
  {
    q: "Apakah data dokumen saya aman?",
    a: "Sangat aman. Kami menggunakan sistem enkripsi berlapis dan Anda memiliki kontrol penuh atas dokumen yang diunggah. Dokumen tidak akan digunakan untuk melatih AI publik."
  },
  {
    q: "Bagaimana cara kerja fitur Chat dengan PDF?",
    a: "DocuMind akan mengekstrak teks dari PDF Anda, memprosesnya dengan AI canggih, dan ketika Anda bertanya, AI akan mencari informasi paling relevan dari dokumen Anda untuk memberikan jawaban yang akurat."
  },
  {
    q: "Format file apa saja yang didukung?",
    a: "Saat ini kami mendukung format PDF, Word (.docx), Excel (.xlsx), dan PowerPoint (.pptx). Anda bisa mengonversi semua format tersebut ke PDF dengan alat bawaan kami."
  },
  {
    q: "Apakah ada batasan jumlah halaman?",
    a: "Semua fitur sekarang gratis. Batas praktis mengikuti kapasitas server, ukuran file yang diizinkan aplikasi, dan jenis proses dokumen yang sedang dijalankan."
  }
];

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="p-4 lg:p-6 space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div 
        {...fadeUp} 
        className="relative overflow-hidden rounded-3xl p-8 lg:p-12 bg-gradient-to-br from-primary/10 via-background to-accent/5 border border-primary/20 shadow-glow"
      >
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl gradient-bg shadow-lg">
            <HelpCircle className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Pusat Bantuan DocuMind</h1>
          <p className="text-muted-foreground text-lg">
            Temukan panduan, jawaban, dan informasi penting untuk memaksimalkan pengalaman Anda bersama DocuMind AI.
          </p>
        </div>
        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-[100px]" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-accent/20 blur-[100px]" />
      </motion.div>

      {/* Apa itu DocuMind */}
      <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
        <Card className="overflow-hidden border-border/50">
          <CardHeader className="bg-surface-2 border-b border-border/50">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Info className="h-5 w-5 text-primary" /> Apa itu DocuMind AI?
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">DocuMind AI</strong> adalah asisten dokumen cerdas yang dirancang khusus untuk mempermudah Anda dalam membaca, menganalisis, dan memodifikasi file PDF. 
            </p>
            <p>
              Kami menggabungkan teknologi AI generasi terbaru yang memungkinkan Anda untuk <em>"berbicara"</em> dengan dokumen Anda. Daripada harus membaca ratusan halaman dokumen untuk mencari satu informasi, Anda cukup menanyakannya kepada AI kami dan mendapatkan jawabannya dalam hitungan detik.
            </p>
            <p>
              Selain fitur obrolan AI, kami juga menyediakan beragam perlengkapan PDF (PDF Tools) lengkap seperti konversi dokumen, penggabungan PDF, kompresi, dan tanda tangan digital.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tutorial Singkat */}
      <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
        <h2 className="flex items-center gap-2 text-xl font-bold mb-4 px-1">
          <BookOpen className="h-5 w-5 text-primary" /> Tutorial Menggunakan Web Ini
        </h2>
        <motion.div 
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid gap-4 sm:grid-cols-3"
        >
          {/* Step 1 */}
          <motion.div variants={fadeUp}>
            <Card className="h-full bg-surface-1 hover:border-primary/30 transition-colors">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <UploadCloud className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">1. Unggah Dokumen</h3>
                  <p className="text-sm text-muted-foreground">
                    Pergi ke halaman Dokumen, lalu klik "Upload PDF Baru" untuk memasukkan file yang ingin dianalisis.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          {/* Step 2 */}
          <motion.div variants={fadeUp}>
            <Card className="h-full bg-surface-1 hover:border-accent/30 transition-colors">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center">
                  <Sparkles className="h-7 w-7 text-accent" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">2. Biarkan AI Memproses</h3>
                  <p className="text-sm text-muted-foreground">
                    DocuMind akan membaca seluruh konten dokumen Anda secara otomatis. Anda cukup menunggu beberapa detik.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          {/* Step 3 */}
          <motion.div variants={fadeUp}>
            <Card className="h-full bg-surface-1 hover:border-emerald-500/30 transition-colors">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <MessageCircle className="h-7 w-7 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">3. Mulai Mengobrol</h3>
                  <p className="text-sm text-muted-foreground">
                    Pilih menu Chat dan mulailah bertanya kepada AI mengenai isi dokumen tersebut. Dapatkan jawaban instan!
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* FAQ */}
      <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileText className="h-5 w-5 text-primary" /> Tanya Jawab (Q&A)
            </CardTitle>
            <CardDescription>
              Pertanyaan yang paling sering ditanyakan oleh pengguna kami.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0 space-y-2">
            {faqs.map((faq, i) => (
              <div 
                key={i} 
                className="border border-border/50 rounded-xl overflow-hidden bg-surface-1"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex items-center justify-between w-full p-4 sm:px-6 text-left hover:bg-surface-2 transition-colors focus:outline-none"
                >
                  <span className="font-medium">{faq.q}</span>
                  <motion.div
                    animate={{ rotate: openFaq === i ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 sm:px-6 pt-0 text-sm text-muted-foreground leading-relaxed border-t border-border/50 bg-background/50">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Spacer */}
      <div className="h-8" />
    </div>
  );
}
