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
import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';

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

  logger.info('Document processing enqueue requested', {
    documentId,
    userId,
    path: req.originalUrl,
  });

  if (!documentId) {
    logger.warn('Document processing enqueue rejected: missing documentId', { userId });
    return res.status(400).json({ error: 'Missing required field: documentId' });
  }

  const { data: document, error } = await supabaseAdmin
    .from('documents')
    .select('id, file_url, user_id, status')
    .eq('id', documentId)
    .eq('user_id', userId)
    .single();

  if (error || !document) {
    logger.warn('Document processing enqueue rejected: document not found', {
      documentId,
      userId,
      errorMessage: error?.message,
      errorCode: error?.code,
    });
    return res.status(404).json({ error: 'Document not found' });
  }

  if (!document.file_url.startsWith(`${userId}/`)) {
    logger.warn('Document processing enqueue rejected: invalid storage path', {
      documentId,
      userId,
      fileUrl: document.file_url,
    });
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

  logger.info('Document processing job enqueued', {
    documentId,
    userId,
    fileUrl: document.file_url,
    currentStatus: document.status,
    queueName: DOCUMENT_PROCESSING_QUEUE,
    jobId: job.id,
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

const uploadOfficeFile = (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (error: any) => {
    if (!error) {
      return next();
    }

    const requestId = crypto.randomUUID();
    logger.warn('Office conversion upload middleware rejected request', {
      requestId,
      errorName: error.name,
      errorCode: error.code,
      errorMessage: error.message,
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
      userId: req.user?.id,
    });

    const status = error instanceof multer.MulterError || error.message?.includes('Only DOCX') ? 400 : 500;
    return res.status(status).json({
      error: 'Upload file Office ditolak sebelum konversi.',
      details: error.message,
      code: error.code,
      requestId,
    });
  });
};

const forwardOfficeConversion = async (req: Request, res: Response) => {
  const uploadedPath = req.file?.path;
  const requestId = String(req.headers['x-request-id'] || crypto.randomUUID());
  try {
    if (!req.file) {
      logger.warn('Office conversion rejected: missing upload', {
        requestId,
        userId: req.user?.id,
        contentType: req.headers['content-type'],
        contentLength: req.headers['content-length'],
      });
      return res.status(400).json({ error: 'Tidak ada file yang diunggah.' });
    }

    logger.info('Office conversion upload accepted', {
      requestId,
      userId: req.user?.id,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      tempPath: req.file.path,
      conversionServiceUrl: env.CONVERSION_SERVICE_URL,
    });

    const form = new FormData();
    form.append('file', fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const startedAt = Date.now();
    const response = await fetch(`${env.CONVERSION_SERVICE_URL}/v1/conversions/sync`, {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
        'x-request-id': requestId,
      },
      timeout: 150_000,
    });

    logger.info('Office conversion service responded', {
      requestId,
      status: response.status,
      statusText: response.statusText,
      durationMs: Date.now() - startedAt,
      contentType: response.headers.get('content-type'),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      let conversionPayload: any = null;
      try {
        conversionPayload = errText ? JSON.parse(errText) : null;
      } catch {
        conversionPayload = null;
      }

      logger.warn(`Conversion service returned ${response.status}: ${errText}`, {
        requestId,
        originalName: req.file.originalname,
        size: req.file.size,
      });
      res.status(response.status).json({
        error: conversionPayload?.error || conversionPayload?.detail || 'Conversion service failed',
        details: conversionPayload?.detail || errText.slice(0, 2000),
        requestId,
      });
      return;
    }

    const pdfBuffer = await response.buffer();
    logger.info('Office conversion completed', {
      requestId,
      originalName: req.file.originalname,
      outputBytes: pdfBuffer.length,
      durationMs: Date.now() - startedAt,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('X-Conversion-Request-Id', requestId);
    res.setHeader('Content-Disposition', `attachment; filename="${req.file.originalname.replace(/\.[^/.]+$/, '')}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    logger.error('Office conversion failed:', {
      requestId,
      errorMessage: error.message,
      errorStack: error.stack,
      originalName: req.file?.originalname,
      size: req.file?.size,
      conversionServiceUrl: env.CONVERSION_SERVICE_URL,
    });
    res.status(500).json({
      error: `Gagal mengonversi file: ${error.message}`,
      requestId,
      conversionServiceUrl: env.CONVERSION_SERVICE_URL,
    });
  } finally {
    if (uploadedPath) {
      fs.promises.unlink(uploadedPath).catch((error) => {
        logger.warn('Failed to remove temporary office upload', {
          requestId,
          uploadedPath,
          errorMessage: error.message,
        });
      });
    }
  }
};

router.get('/convert/office-to-pdf/debug', requireAuth, (req, res) => {
  res.json({
    status: 'ok',
    route: '/api/convert/office-to-pdf',
    userId: req.user?.id,
    conversionServiceUrl: env.CONVERSION_SERVICE_URL,
    maxUploadBytes: 50 * 1024 * 1024,
    supportedExtensions: ['.docx', '.xlsx', '.pptx'],
  });
});

router.post('/convert/office-to-pdf', requireAuth, uploadOfficeFile, forwardOfficeConversion);
router.post('/convert/word-to-pdf', requireAuth, uploadOfficeFile, forwardOfficeConversion);
