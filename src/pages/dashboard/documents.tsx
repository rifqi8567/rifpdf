import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Grid3X3,
  List,
  Search,
  Filter,
  MoreVertical,
  Download,
  Trash2,
  MessageSquare,
  Clock,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { FileUpload } from '@/components/common/file-upload';
import { cn, formatFileSize } from '@/lib/utils';

const demoDocuments = [
  { id: '1', name: 'Laporan Keuangan Q1 2026.pdf', pages: 48, size: 2400000, date: '2026-05-18T06:00:00', status: 'ready' as const },
  { id: '2', name: 'Kontrak Kerjasama PT ABC.pdf', pages: 12, size: 890000, date: '2026-05-18T03:00:00', status: 'ready' as const },
  { id: '3', name: 'Proposal Project X.pdf', pages: 24, size: 1600000, date: '2026-05-17T12:00:00', status: 'ready' as const },
  { id: '4', name: 'Resume - John Doe.pdf', pages: 2, size: 340000, date: '2026-05-15T08:00:00', status: 'ready' as const },
  { id: '5', name: 'Panduan Teknis v2.pdf', pages: 86, size: 5200000, date: '2026-05-14T10:00:00', status: 'ready' as const },
  { id: '6', name: 'Presentasi Board Meeting.pdf', pages: 32, size: 4100000, date: '2026-05-13T14:00:00', status: 'processing' as const },
];

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function DocumentsPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [showUpload, setShowUpload] = useState(false);

  const filteredDocs = demoDocuments.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dokumen Saya</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {demoDocuments.length} dokumen · {formatFileSize(demoDocuments.reduce((acc, d) => acc + d.size, 0))} total
          </p>
        </div>
        <Button variant="gradient" onClick={() => setShowUpload(!showUpload)}>
          Upload PDF Baru
        </Button>
      </div>

      {/* Upload area */}
      {showUpload && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <FileUpload
            onFilesAccepted={(files) => setUploadedFiles((prev) => [...prev, ...files])}
            files={uploadedFiles}
            onRemoveFile={(index) => setUploadedFiles((prev) => prev.filter((_, i) => i !== index))}
          />
        </motion.div>
      )}

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari dokumen..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'flex items-center justify-center h-9 w-9 transition-colors',
              viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center justify-center h-9 w-9 transition-colors',
              viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Document Grid/List */}
      <motion.div
        initial="initial"
        animate="animate"
        variants={{ animate: { transition: { staggerChildren: 0.05 } } }}
        className={cn(
          viewMode === 'grid'
            ? 'grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            : 'space-y-2'
        )}
      >
        {filteredDocs.map((doc) => (
          <motion.div key={doc.id} variants={fadeUp}>
            {viewMode === 'grid' ? (
              <Card className="group hover:border-primary/20 hover:shadow-glow transition-all duration-300 cursor-pointer overflow-hidden">
                {/* Thumbnail placeholder */}
                <div className="relative h-36 bg-gradient-to-br from-surface-3 to-surface-4 flex items-center justify-center">
                  <FileText className="h-12 w-12 text-muted-foreground/30" />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="glass" size="icon-sm">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </div>
                  {doc.status === 'processing' && (
                    <div className="absolute bottom-2 left-2">
                      <Badge variant="warning" className="text-[9px]">Memproses...</Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{doc.pages} hal · {formatFileSize(doc.size)}</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(doc.date).toLocaleDateString('id-ID')}
                    </div>
                  </div>
                  <div className="flex gap-1.5 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="flex-1 text-xs h-7">
                      <MessageSquare className="h-3 w-3 mr-1" /> Chat
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1 text-xs h-7">
                      <Eye className="h-3 w-3 mr-1" /> View
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="h-7 w-7">
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 hover:border-primary/20 hover:shadow-glow transition-all cursor-pointer group">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">{doc.pages} halaman · {formatFileSize(doc.size)}</p>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(doc.date).toLocaleDateString('id-ID')}
                </div>
                {doc.status === 'processing' && (
                  <Badge variant="warning" className="text-[9px]">Memproses...</Badge>
                )}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon-sm"><MessageSquare className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon-sm"><Download className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon-sm" className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
