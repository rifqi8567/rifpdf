import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/auth-store';
import { configuredSupabaseUrl, supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { PDFDocument } from '@/types';
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
  CheckCircle2,
  AlertTriangle,
  Folder as FolderIcon,
  ChevronLeft,
  Plus,
  Edit2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { FileUpload } from '@/components/common/file-upload';
import { PdfThumbnail } from '@/components/common/pdf-thumbnail';
import { cn, formatFileSize } from '@/lib/utils';
import type { Folder } from '@/types';
import { buildApiUrl } from '@/services/api';



const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const normalizeStoragePath = (value: string) => {
  if (!value) return value;

  const path = value
    .replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/(?:public|sign)\/documents\//, '')
    .replace(/^\/?storage\/v1\/object\/(?:public|sign)\/documents\//, '')
    .replace(/^documents\//, '')
    .replace(/^\/+/, '')
    .split('?')[0];

  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
};

const getStoragePathCandidates = (value: string) => {
  const normalizedPath = normalizeStoragePath(value);
  const rawPath = value.split('?')[0].replace(/^\/+/, '');
  const candidates = [
    normalizedPath,
    normalizedPath ? `documents/${normalizedPath}` : '',
    rawPath,
  ];

  return Array.from(new Set(candidates.filter(Boolean)));
};

const logDocumentsDebug = (label: string, details: Record<string, unknown>) => {
  console.groupCollapsed(`[Documents Debug] ${label}`);
  console.log('Supabase URL:', configuredSupabaseUrl);
  console.log('Details:', details);
  console.groupEnd();
};

export default function DocumentsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [docs, setDocs] = useState<PDFDocument[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [docToDelete, setDocToDelete] = useState<PDFDocument | null>(null);
  
  // Folder states
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  
  // Rename & Delete states
  const [docToRename, setDocToRename] = useState<PDFDocument | null>(null);
  const [newDocName, setNewDocName] = useState('');
  
  const [folderToRename, setFolderToRename] = useState<Folder | null>(null);
  const [newFolderNameEdit, setNewFolderNameEdit] = useState('');
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      logDocumentsDebug('fetch start', {
        userId: user.id,
        userEmail: user.email,
      });

      // Fetch documents
      const { data: docsData, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      logDocumentsDebug('documents query result', {
        error: docsError,
        count: docsData?.length ?? 0,
        sample: docsData?.slice(0, 5).map((doc) => ({
          id: doc.id,
          name: doc.name,
          file_url: doc.file_url,
          normalizedPath: normalizeStoragePath(doc.file_url),
          candidates: getStoragePathCandidates(doc.file_url),
        })),
      });
        
      if (docsData) setDocs(docsData as PDFDocument[]);
      
      // Fetch folders (ignore error if table doesn't exist yet)
      try {
        const { data: foldersData, error } = await supabase
          .from('folders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        logDocumentsDebug('folders query result', {
          error,
          count: foldersData?.length ?? 0,
        });
          
        if (foldersData && !error) setFolders(foldersData as Folder[]);
      } catch (e) {
        console.warn('Folders table might not exist yet.');
      }
    };
    
    fetchData();
  }, [user]);

  // Simulasi proses AI backend (merubah status dari processing -> ready setelah 4 detik)
  useEffect(() => {
    const processingDocs = docs.filter(d => d.status === 'processing');
    if (processingDocs.length === 0) return;
    
    const timer = setTimeout(() => {
      setDocs(prev => prev.map(d => d.status === 'processing' ? { ...d, status: 'ready' } : d));
    }, 4000);
    
    return () => clearTimeout(timer);
  }, [docs]);

  const currentDocs = docs.filter(doc => 
    doc.folder_id === (currentFolder ? currentFolder.id : null)
  );

  const filteredDocs = currentDocs.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredFolders = folders.filter((folder) => 
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const enqueueDocumentProcessing = async (documentId: string) => {
    const { data: { session } } = await supabase.auth.getSession();

    logDocumentsDebug('enqueue processing request', {
      documentId,
      apiUrl: buildApiUrl('/api/documents/process'),
      hasAccessToken: Boolean(session?.access_token),
    });

    const response = await fetch(buildApiUrl('/api/documents/process'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ documentId }),
    });

    if (!response.ok) {
      const payload = await response.text().catch(() => '');
      logDocumentsDebug('enqueue processing failed', {
        documentId,
        status: response.status,
        statusText: response.statusText,
        payload,
      });
      throw new Error('Gagal memasukkan dokumen ke antrean AI.');
    }

    const payload = await response.json().catch(() => null);
    logDocumentsDebug('enqueue processing success', {
      documentId,
      status: response.status,
      payload,
    });
  };

  const handleProcessUpload = async () => {
    if (uploadedFiles.length === 0 || !user) return;

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      toast.error('Sesi login tidak valid. Silakan login ulang.');
      return;
    }

    const authUserId = authData.user.id;
    
    setIsUploading(true);
    
    try {
      const newDocs = [];

      logDocumentsDebug('upload batch start', {
        userId: authUserId,
        storeUserId: user.id,
        folderId: currentFolder ? currentFolder.id : null,
        fileCount: uploadedFiles.length,
        files: uploadedFiles.map((file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
        })),
      });
      
      for (const f of uploadedFiles) {
        // Buat nama file unik: user_id/timestamp_namabersih
        const cleanName = f.name.replace(/[^a-zA-Z0-9.\-]/g, '_');
        const filePath = `${authUserId}/${Date.now()}_${cleanName}`;

        logDocumentsDebug('storage upload start', {
          originalName: f.name,
          cleanName,
          filePath,
          fileType: f.type,
          fileSize: f.size,
        });
        
        // 1. Upload file fisik ke Supabase Storage
        const { data: storageData, error: storageError } = await supabase.storage
          .from('documents')
          .upload(filePath, f, {
            contentType: f.type || 'application/pdf',
            upsert: false,
          });

        logDocumentsDebug('storage upload result', {
          filePath,
          data: storageData,
          error: storageError,
        });
          
        if (storageError) throw storageError;
        
        // 2. Siapkan data untuk dimasukkan ke tabel documents
        newDocs.push({
          user_id: authUserId,
          folder_id: currentFolder ? currentFolder.id : null,
          name: f.name,
          file_url: filePath,
          file_size: f.size,
          page_count: Math.floor(Math.random() * 50) + 1, // dummy pages (idealnya di ekstrak di backend)
          status: 'processing' as const,
        });
      }
      
      // 3. Masukkan data ke tabel public.documents
      const { data, error: dbError } = await supabase
        .from('documents')
        .insert(newDocs)
        .select();

      logDocumentsDebug('documents insert result', {
        attemptedRows: newDocs,
        data,
        error: dbError,
      });
        
      if (dbError) throw dbError;
      
      if (data) {
        const insertedDocs = data as PDFDocument[];
        setDocs((prev) => [...insertedDocs, ...prev]);

        const queueResults = await Promise.allSettled(insertedDocs.map((doc) => enqueueDocumentProcessing(doc.id)));
        logDocumentsDebug('queue results', {
          insertedDocs: insertedDocs.map((doc) => ({
            id: doc.id,
            name: doc.name,
            file_url: doc.file_url,
          })),
          queueResults,
        });
        const failedQueueCount = queueResults.filter((result) => result.status === 'rejected').length;
        if (failedQueueCount > 0) {
          toast.warning(`${failedQueueCount} dokumen tersimpan, tetapi belum masuk antrean AI.`);
        }
      }
      
      setUploadedFiles([]);
      setShowUpload(false);
      setShowSuccessPopup(true);
      setTimeout(() => setShowSuccessPopup(false), 3000);
      
    } catch (err: any) {
      logDocumentsDebug('upload batch failed', {
        error: err,
        message: err?.message,
        name: err?.name,
        statusCode: err?.statusCode,
      });
      toast.error('Gagal mengunggah dokumen: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !user) return;
    
    setIsCreatingFolder(true);
    try {
      const { data, error } = await supabase
        .from('folders')
        .insert([{ user_id: user.id, name: newFolderName.trim() }])
        .select()
        .single();
        
      if (error) throw error;
      
      setFolders(prev => [data as Folder, ...prev]);
      setShowNewFolderModal(false);
      setNewFolderName('');
      toast.success('Folder berhasil dibuat.');
    } catch (err: any) {
      toast.error('Gagal membuat folder: ' + err.message);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const confirmRenameDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docToRename || !newDocName.trim()) return;
    
    try {
      const { error } = await supabase.from('documents').update({ name: newDocName.trim() }).eq('id', docToRename.id);
      if (error) throw error;
      
      setDocs(prev => prev.map(d => d.id === docToRename.id ? { ...d, name: newDocName.trim() } : d));
      toast.success('Nama dokumen berhasil diubah.');
    } catch (err: any) {
      toast.error('Gagal mengubah nama dokumen: ' + err.message);
    } finally {
      setDocToRename(null);
      setNewDocName('');
    }
  };

  const confirmRenameFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderToRename || !newFolderNameEdit.trim()) return;
    
    try {
      const { error } = await supabase.from('folders').update({ name: newFolderNameEdit.trim() }).eq('id', folderToRename.id);
      if (error) throw error;
      
      setFolders(prev => prev.map(f => f.id === folderToRename.id ? { ...f, name: newFolderNameEdit.trim() } : f));
      if (currentFolder?.id === folderToRename.id) {
        setCurrentFolder({ ...currentFolder, name: newFolderNameEdit.trim() });
      }
      toast.success('Nama folder berhasil diubah.');
    } catch (err: any) {
      toast.error('Gagal mengubah nama folder: ' + err.message);
    } finally {
      setFolderToRename(null);
      setNewFolderNameEdit('');
    }
  };

  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    try {
      const { error } = await supabase.from('folders').delete().eq('id', folderToDelete.id);
      if (error) throw error;
      
      setFolders(prev => prev.filter(f => f.id !== folderToDelete.id));
      if (currentFolder?.id === folderToDelete.id) {
        setCurrentFolder(null);
      }
      toast.success('Folder berhasil dihapus.');
    } catch (err: any) {
      toast.error('Gagal menghapus folder: ' + err.message);
    } finally {
      setFolderToDelete(null);
    }
  };

  const handleChat = (docId: string) => navigate(`/dashboard/chat?doc=${docId}`);
  
  const getSignedUrl = async (fileUrl: string) => {
    const candidates = getStoragePathCandidates(fileUrl);
    const publicPath = candidates[0];

    logDocumentsDebug('resolve document url start', {
      originalFileUrl: fileUrl,
      normalizedPath: normalizeStoragePath(fileUrl),
      candidates,
      selectedPublicPath: publicPath,
    });

    if (publicPath) {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(publicPath, 60 * 10);

      if (data?.signedUrl) {
        logDocumentsDebug('resolve document url success', {
          fileUrl,
          publicPath,
          signedUrl: data.signedUrl,
          candidates,
        });
        return data.signedUrl;
      }

      logDocumentsDebug('resolve document url candidate failed', {
        fileUrl,
        publicPath,
        error,
      });
    }

    logDocumentsDebug('resolve document url failed', {
      fileUrl,
      candidates,
    });
    console.error('PUBLIC URL ERROR:', { fileUrl, candidates });
    toast.error('Gagal mengambil file.');
    return null;
  };

  const handleView = async (doc: PDFDocument) => {
    logDocumentsDebug('view clicked', {
      docId: doc.id,
      name: doc.name,
      file_url: doc.file_url,
      normalizedPath: normalizeStoragePath(doc.file_url),
    });
    toast.info(`Menyiapkan ${doc.name}...`);
    const url = await getSignedUrl(doc.file_url);
    if (url) window.open(url, '_blank');
  };

  const handleDownload = async (doc: PDFDocument) => {
    logDocumentsDebug('download clicked', {
      docId: doc.id,
      name: doc.name,
      file_url: doc.file_url,
      normalizedPath: normalizeStoragePath(doc.file_url),
    });
    toast.success(`Mendownload ${doc.name}...`);
    const url = await getSignedUrl(doc.file_url);
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };
  
  const handleDelete = (doc: PDFDocument) => {
    setDocToDelete(doc);
  };

  const confirmDelete = async () => {
    if (!docToDelete) return;
    try {
      // Hapus fisik file dari Storage
      await supabase.storage.from('documents').remove([docToDelete.file_url]);
      
      // Hapus data dari database
      const { error } = await supabase.from('documents').delete().eq('id', docToDelete.id);
      if (error) throw error;
      
      setDocs(prev => prev.filter(d => d.id !== docToDelete.id));
      toast.success('Dokumen berhasil dihapus.');
    } catch (err: any) {
      toast.error('Gagal menghapus dokumen: ' + err.message);
    } finally {
      setDocToDelete(null);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {currentFolder && (
              <Button 
                variant="ghost" 
                size="icon-sm" 
                className="h-8 w-8 -ml-2 text-muted-foreground hover:text-foreground"
                onClick={() => setCurrentFolder(null)}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <h1 className="text-2xl font-bold">
              {currentFolder ? currentFolder.name : 'Dokumen Saya'}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {currentDocs.length} dokumen · {formatFileSize(currentDocs.reduce((acc, d) => acc + d.file_size, 0))} total
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {!currentFolder && (
            <Button variant="outline" className="flex-1 sm:flex-none gap-2" onClick={() => setShowNewFolderModal(true)}>
              <FolderIcon className="h-4 w-4" /> Folder
            </Button>
          )}
          <Button variant="gradient" className="flex-1 sm:flex-none gap-2" onClick={() => setShowUpload(!showUpload)}>
            <Plus className="h-4 w-4" /> Upload PDF
          </Button>
        </div>
      </div>

      {/* Upload area */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card border border-border p-4 rounded-xl space-y-4">
              <FileUpload
                onFilesAccepted={(files) => setUploadedFiles((prev) => [...prev, ...files])}
                files={uploadedFiles}
                onRemoveFile={(index) => setUploadedFiles((prev) => prev.filter((_, i) => i !== index))}
              />
              {uploadedFiles.length > 0 && (
                <div className="flex justify-end pt-2 border-t border-border">
                  <Button 
                    variant="gradient" 
                    onClick={handleProcessUpload}
                    disabled={isUploading}
                  >
                    {isUploading ? 'Mengunggah...' : `Unggah ${uploadedFiles.length} Dokumen`}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
        {/* Render Folders (only if not inside a folder) */}
        {!currentFolder && filteredFolders.map((folder) => (
          <motion.div key={folder.id} variants={fadeUp}>
            {viewMode === 'grid' ? (
              <Card 
                className="group hover:border-primary/20 hover:shadow-glow transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full bg-card"
                onClick={() => setCurrentFolder(folder)}
              >
                {/* Visual Area (matching PDF Card thumbnail height) */}
                <div className="relative h-36 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden">
                  <FolderIcon className="h-16 w-16 text-primary/70 fill-primary/10 transition-transform duration-300 group-hover:scale-110" />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Action Overlay */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button variant="glass" size="icon-sm" onClick={(e) => { e.stopPropagation(); setFolderToRename(folder); setNewFolderNameEdit(folder.name); }}>
                      <Edit2 className="h-3 w-3 text-foreground" />
                    </Button>
                    <Button variant="glass" size="icon-sm" className="hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); setFolderToDelete(folder); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Info Area (matching PDF Card structure) */}
                <CardContent className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium truncate">{folder.name}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{docs.filter(d => d.folder_id === folder.id).length} dokumen</span>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(folder.created_at).toLocaleDateString('id-ID')}
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons to match height of PDF action row */}
                  <div className="flex gap-1.5 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="w-full text-xs h-7">
                      Buka Folder
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div 
                className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 hover:border-primary/20 hover:shadow-glow transition-all cursor-pointer group"
                onClick={() => setCurrentFolder(folder)}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <FolderIcon className="h-5 w-5 text-primary fill-primary/20" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{folder.name}</p>
                  <p className="text-xs text-muted-foreground">{docs.filter(d => d.folder_id === folder.id).length} dokumen</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); setFolderToRename(folder); setNewFolderNameEdit(folder.name); }}>
                    <Edit2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); setFolderToDelete(folder); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <ChevronLeft className="h-4 w-4 rotate-180 text-muted-foreground ml-2" />
                </div>
              </div>
            )}
          </motion.div>
        ))}

        {/* Render Documents */}
        {filteredDocs.map((doc) => (
          <motion.div key={doc.id} variants={fadeUp}>
            {viewMode === 'grid' ? (
              <Card className="group hover:border-primary/20 hover:shadow-glow transition-all duration-300 cursor-pointer overflow-hidden">
                {/* Thumbnail placeholder */}
                <div className="relative h-36 bg-gradient-to-br from-surface-3 to-surface-4 flex items-center justify-center overflow-hidden">
                  <PdfThumbnail fileUrl={doc.file_url} />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
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
                    <span>{doc.page_count} hal · {formatFileSize(doc.file_size)}</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(doc.created_at).toLocaleDateString('id-ID')}
                    </div>
                  </div>
                  <div className="flex gap-1.5 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="flex-1 text-xs h-7" onClick={(e) => { e.stopPropagation(); handleChat(doc.id); }}>
                      <MessageSquare className="h-3 w-3 mr-1" /> Chat
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1 text-xs h-7" onClick={(e) => { e.stopPropagation(); handleView(doc); }}>
                      <Eye className="h-3 w-3 mr-1" /> View
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}>
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setDocToRename(doc); setNewDocName(doc.name); }}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); handleDelete(doc); }}>
                      <Trash2 className="h-3 w-3" />
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
                  <p className="text-xs text-muted-foreground">{doc.page_count} halaman · {formatFileSize(doc.file_size)}</p>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(doc.created_at).toLocaleDateString('id-ID')}
                </div>
                {doc.status === 'processing' && (
                  <Badge variant="warning" className="text-[9px]">Memproses...</Badge>
                )}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); handleChat(doc.id); }}><MessageSquare className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); handleView(doc); }}><Eye className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}><Download className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); handleDelete(doc); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            )}
          </motion.div>
        ))}
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
                <h3 className="text-xl font-bold text-foreground">Berhasil Diunggah!</h3>
                <p className="text-sm text-muted-foreground">
                  Dokumen PDF Anda telah berhasil diunggah dan sedang diproses.
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {docToDelete && (
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
              className="bg-card border border-border shadow-2xl rounded-2xl p-8 max-w-sm w-full text-center space-y-6"
            >
              <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center text-destructive">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-foreground">Hapus Dokumen?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Apakah Anda yakin ingin menghapus <strong>{docToDelete.name}</strong>? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button 
                  className="flex-1" 
                  variant="outline" 
                  onClick={() => setDocToDelete(null)}
                >
                  Batal
                </Button>
                <Button 
                  className="flex-1" 
                  variant="destructive" 
                  onClick={confirmDelete}
                >
                  Ya, Hapus
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Folder Modal */}
      <AnimatePresence>
        {showNewFolderModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden"
            >
              <form onSubmit={handleCreateFolder}>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-2">
                    <FolderIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Buat Folder Baru</h3>
                    <p className="text-sm text-muted-foreground">Kelompokkan dokumen Anda agar lebih rapi.</p>
                  </div>
                  <div className="space-y-2 pt-2">
                    <Input
                      autoFocus
                      placeholder="Contoh: Laporan Keuangan"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      disabled={isCreatingFolder}
                    />
                  </div>
                </div>
                <div className="bg-surface-2 p-4 flex justify-end gap-3 border-t border-border">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowNewFolderModal(false);
                      setNewFolderName('');
                    }}
                    disabled={isCreatingFolder}
                  >
                    Batal
                  </Button>
                  <Button type="submit" variant="gradient" disabled={!newFolderName.trim() || isCreatingFolder}>
                    {isCreatingFolder ? 'Membuat...' : 'Buat Folder'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rename PDF Modal */}
      <AnimatePresence>
        {docToRename && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden"
            >
              <form onSubmit={confirmRenameDoc}>
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-xl font-bold">Ganti Nama Dokumen</h3>
                  </div>
                  <div className="space-y-2 pt-2">
                    <Input
                      autoFocus
                      placeholder="Nama Dokumen"
                      value={newDocName}
                      onChange={(e) => setNewDocName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="bg-surface-2 p-4 flex justify-end gap-3 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => setDocToRename(null)}>Batal</Button>
                  <Button type="submit" variant="gradient" disabled={!newDocName.trim()}>Simpan</Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rename Folder Modal */}
      <AnimatePresence>
        {folderToRename && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden"
            >
              <form onSubmit={confirmRenameFolder}>
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-xl font-bold">Ganti Nama Folder</h3>
                  </div>
                  <div className="space-y-2 pt-2">
                    <Input
                      autoFocus
                      placeholder="Nama Folder"
                      value={newFolderNameEdit}
                      onChange={(e) => setNewFolderNameEdit(e.target.value)}
                    />
                  </div>
                </div>
                <div className="bg-surface-2 p-4 flex justify-end gap-3 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => setFolderToRename(null)}>Batal</Button>
                  <Button type="submit" variant="gradient" disabled={!newFolderNameEdit.trim()}>Simpan</Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Folder Modal */}
      <AnimatePresence>
        {folderToDelete && (
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
              className="bg-card border border-border shadow-2xl rounded-2xl p-8 max-w-sm w-full text-center space-y-6"
            >
              <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center text-destructive">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-foreground">Hapus Folder?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Apakah Anda yakin ingin menghapus folder <strong>{folderToDelete.name}</strong>? Dokumen di dalamnya akan ikut terhapus.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button className="flex-1" variant="outline" onClick={() => setFolderToDelete(null)}>Batal</Button>
                <Button className="flex-1" variant="destructive" onClick={confirmDeleteFolder}>Ya, Hapus</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
