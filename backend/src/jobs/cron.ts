import cron from 'node-cron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { supabase } from '../config/supabase';
import { logger } from '../config/logger';
import { env } from '../config/env';

const DOCUMENTS_BUCKET = 'documents';

const isSafeStoragePath = (filePath: string) => {
  return !filePath.startsWith('/') && !filePath.includes('..') && filePath.split('/').length >= 2;
};

const cleanupTmpDir = async (expiresBeforeMs: number) => {
  try {
    const entries = await fs.readdir(env.TMP_CLEANUP_DIR, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(env.TMP_CLEANUP_DIR, entry.name);
      const stats = await fs.stat(entryPath);

      if (stats.mtimeMs >= expiresBeforeMs) continue;

      await fs.rm(entryPath, { recursive: true, force: true });
      logger.info(`Deleted expired tmp artifact: ${entryPath}`);
    }
  } catch (error: any) {
    if (error?.code === 'ENOENT') return;
    logger.error('Failed to cleanup tmp directory:', error);
  }
};

// Auto Cleanup Job: Runs every hour
export const initCronJobs = () => {
  cron.schedule('0 * * * *', async () => {
    logger.info('Running Auto Cleanup Job: Deleting expired documents...');
    try {
      const expiresBeforeMs = Date.now() - env.CLEANUP_RETENTION_HOURS * 60 * 60 * 1000;
      const expiresBeforeIso = new Date(expiresBeforeMs).toISOString();
      
      const { data: expiredDocs, error: fetchError } = await supabase
        .from('documents')
        .select('id, file_url, thumbnail_url, status')
        .lt('created_at', expiresBeforeIso)
        .order('created_at', { ascending: true })
        .limit(env.CLEANUP_BATCH_SIZE);

      if (fetchError) throw fetchError;

      if (expiredDocs && expiredDocs.length > 0) {
        logger.info(`Found ${expiredDocs.length} expired documents. Cleaning up...`);

        for (const doc of expiredDocs) {
          const storagePaths = [doc.file_url, doc.thumbnail_url].filter(
            (storagePath): storagePath is string => Boolean(storagePath && isSafeStoragePath(storagePath))
          );

          if (storagePaths.length > 0) {
            const { error: storageError } = await supabase.storage
              .from(DOCUMENTS_BUCKET)
              .remove(storagePaths);
            
            if (storageError) {
              logger.error(`Failed to delete storage files for document ${doc.id}:`, storageError);
            }
          }

          const { error: dbError } = await supabase
            .from('documents')
            .delete()
            .eq('id', doc.id);
            
          if (dbError) {
            logger.error(`Failed to delete document record: ${doc.id}`, dbError);
          }
        }
        logger.info('Auto Cleanup Job finished successfully.');
      } else {
        logger.info('No expired documents found for cleanup.');
      }

      await cleanupTmpDir(expiresBeforeMs);
    } catch (error) {
      logger.error('Error during Auto Cleanup Job:', error);
    }
  });

  logger.info('Cron jobs initialized: Auto Cleanup active.');
};
