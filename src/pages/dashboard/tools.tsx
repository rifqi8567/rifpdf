import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Merge,
  Scissors,
  Minimize2,
  PenTool,
  RefreshCw,
  ScanLine,
  ImageIcon,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/common/file-upload';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const toolsConfig: Record<string, { title: string; description: string; icon: React.ElementType; color: string; bg: string }> = {
  merge: { title: 'Merge PDF', description: 'Gabungkan beberapa file PDF menjadi satu dokumen', icon: Merge, color: 'text-blue-400', bg: 'from-blue-500 to-blue-600' },
  split: { title: 'Split PDF', description: 'Pisahkan halaman PDF menjadi file terpisah', icon: Scissors, color: 'text-green-400', bg: 'from-green-500 to-green-600' },
  compress: { title: 'Compress PDF', description: 'Kurangi ukuran file PDF tanpa mengorbankan kualitas', icon: Minimize2, color: 'text-orange-400', bg: 'from-orange-500 to-orange-600' },
  sign: { title: 'Tanda Tangan PDF', description: 'Tambahkan tanda tangan digital ke dokumen PDF', icon: PenTool, color: 'text-purple-400', bg: 'from-purple-500 to-purple-600' },
  convert: { title: 'Konversi PDF', description: 'Konversi PDF ke format lain atau sebaliknya', icon: RefreshCw, color: 'text-cyan-400', bg: 'from-cyan-500 to-cyan-600' },
  ocr: { title: 'OCR Scanner', description: 'Ekstrak teks dari gambar dan PDF scan menggunakan AI', icon: ScanLine, color: 'text-pink-400', bg: 'from-pink-500 to-pink-600' },
  'image-to-pdf': { title: 'Image to PDF', description: 'Konversi gambar menjadi dokumen PDF', icon: ImageIcon, color: 'text-indigo-400', bg: 'from-indigo-500 to-indigo-600' },
};

export default function ToolPage() {
  const { toolId } = useParams<{ toolId: string }>();
  const [files, setFiles] = useState<File[]>([]);
  const tool = toolsConfig[toolId || 'merge'];

  if (!tool) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Tool tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className={cn('inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br', tool.bg)}>
          <tool.icon className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold">{tool.title}</h1>
        <p className="text-muted-foreground">{tool.description}</p>
      </motion.div>

      {/* Upload */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <FileUpload
          onFilesAccepted={(newFiles) => setFiles((prev) => [...prev, ...newFiles])}
          files={files}
          onRemoveFile={(index) => setFiles((prev) => prev.filter((_, i) => i !== index))}
          maxFiles={toolId === 'merge' ? 20 : 1}
        />
      </motion.div>

      {/* Action Button */}
      {files.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Button variant="gradient" size="xl" className="group min-w-[200px]">
            Proses {tool.title}
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </motion.div>
      )}
    </div>
  );
}
