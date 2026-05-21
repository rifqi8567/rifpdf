import { Router } from 'express';
import { Queue } from 'bullmq';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { redisConnection } from '../config/redis';
import { DOCUMENT_PROCESSING_QUEUE } from '../queues/document';
import { OllamaService } from '../services/ollama';
import { requireAuth } from '../middleware/auth';
import { supabaseAdmin } from '../core/supabase';
import { env } from '../config/env';
import { logger } from '../config/logger';
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';

export const router = Router();

const documentQueue = new Queue(DOCUMENT_PROCESSING_QUEUE, { connection: redisConnection });

router.get('/health', async (req, res) => {
  const ollamaHealth = await OllamaService.checkHealth();
  res.json({ 
    status: 'ok',
    ollama_connected: ollamaHealth,
    timestamp: new Date().toISOString()
  });
});

router.post('/documents/process', requireAuth, async (req, res) => {
  const { documentId } = req.body;
  const userId = req.user!.id;

  if (!documentId) {
    return res.status(400).json({ error: 'Missing required field: documentId' });
  }

  const { data: document, error } = await supabaseAdmin
    .from('documents')
    .select('id, file_url, user_id, status')
    .eq('id', documentId)
    .eq('user_id', userId)
    .single();

  if (error || !document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  if (!document.file_url.startsWith(`${userId}/`)) {
    return res.status(400).json({ error: 'Invalid document storage path' });
  }

  const job = await documentQueue.add('process-pdf', {
    documentId,
    fileUrl: document.file_url,
    userId
  }, {
    jobId: `process:${documentId}`,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 3600, count: 100 },
    removeOnFail: { age: 24 * 3600, count: 100 },
  });

  res.json({ message: 'Document added to processing queue', jobId: job.id });
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: (_req, file, cb) => {
      const safeExt = path.extname(file.originalname).toLowerCase();
      cb(null, `office-upload-${Date.now()}-${Math.random().toString(16).slice(2)}${safeExt}`);
    },
  }),
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.docx', '.xlsx', '.pptx'].includes(ext)) {
      return cb(new Error('Only DOCX, XLSX, and PPTX files are supported'));
    }
    cb(null, true);
  }
});

const forwardOfficeConversion = async (req: any, res: any) => {
  const uploadedPath = req.file?.path;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file yang diunggah.' });
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await fetch(`${env.CONVERSION_SERVICE_URL}/v1/conversions/sync`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
      timeout: 150_000,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Conversion service error (${response.status}): ${errText}`);
    }

    const pdfBuffer = await response.buffer();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${req.file.originalname.replace(/\.[^/.]+$/, '')}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    logger.error('Office conversion failed:', error);
    res.status(500).json({ error: `Gagal mengonversi file: ${error.message}` });
  } finally {
    if (uploadedPath) {
      fs.promises.unlink(uploadedPath).catch(() => undefined);
    }
  }
};

router.post('/convert/office-to-pdf', requireAuth, upload.single('file'), forwardOfficeConversion);
router.post('/convert/word-to-pdf', requireAuth, upload.single('file'), forwardOfficeConversion);
