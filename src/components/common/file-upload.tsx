import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatFileSize, validateFileType, validateFileSize, ALLOWED_PDF_TYPES, MAX_FILE_SIZE } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { debugAction } from '@/lib/debug';

interface FileUploadProps {
  onFilesAccepted: (files: File[]) => void;
  acceptedTypes?: string[];
  dropzoneAccept?: Record<string, string[]>;
  maxSize?: number;
  maxFiles?: number;
  files?: File[];
  onRemoveFile?: (index: number) => void;
  className?: string;
  label?: string;
}

export function FileUpload({
  onFilesAccepted,
  acceptedTypes = ALLOWED_PDF_TYPES,
  dropzoneAccept,
  maxSize = MAX_FILE_SIZE,
  maxFiles = 10,
  files = [],
  onRemoveFile,
  className,
  label,
}: FileUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const validFiles = acceptedFiles.filter(
        (file) => validateFileType(file, acceptedTypes) && validateFileSize(file, maxSize)
      );
      debugAction('file-upload', 'files dropped', {
        acceptedCount: acceptedFiles.length,
        validCount: validFiles.length,
        rejectedCount: acceptedFiles.length - validFiles.length,
        maxSize,
        maxFiles,
        acceptedTypes,
        files: acceptedFiles,
      });
      onFilesAccepted(validFiles);
    },
    [acceptedTypes, maxFiles, maxSize, onFilesAccepted]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: dropzoneAccept || { 'application/pdf': ['.pdf'] },
    maxSize,
    maxFiles,
    multiple: maxFiles > 1,
  });

  return (
    <div className={cn('space-y-4', className)}>
      <motion.div
        {...(getRootProps() as any)}
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition-all duration-300 sm:p-8',
          isDragActive && !isDragReject
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : isDragReject
            ? 'border-destructive bg-destructive/5'
            : 'border-border hover:border-primary/50 hover:bg-primary/5'
        )}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input {...getInputProps()} />

        {/* Background glow */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <motion.div
          animate={isDragActive ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="relative"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <Upload className={cn('h-8 w-8', isDragActive ? 'text-primary' : 'text-muted-foreground')} />
          </div>
        </motion.div>

        <h3 className="mb-1 max-w-full break-words text-base font-semibold text-foreground">
          {isDragActive ? 'Lepaskan file di sini' : (label || 'Drag & drop file PDF')}
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          atau klik untuk memilih file · Maks {formatFileSize(maxSize)}
        </p>

        <Button variant="outline" size="sm" type="button">
          Pilih File
        </Button>
      </motion.div>

      {/* File list */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {files.map((file, index) => (
              <motion.div
                key={`${file.name}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                {onRemoveFile && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      debugAction('file-upload', 'file removed', {
                        index,
                        file,
                      });
                      onRemoveFile(index);
                    }}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
