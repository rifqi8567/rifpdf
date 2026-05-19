import { Router } from 'express';
import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { DOCUMENT_PROCESSING_QUEUE } from '../queues/document';
import { OllamaService } from '../services/ollama';
import { requireAuth } from '../middleware/auth';
import { supabaseAdmin } from '../core/supabase';

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

// Gotenberg High Fidelity Word to PDF Conversion Route
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max
  }
});

router.post('/convert/word-to-pdf', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file yang diunggah.' });
    }

    const form = new FormData();
    form.append('files', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const gotenbergUrl = process.env.GOTENBERG_URL || 'http://gotenberg:3000';
    const response = await fetch(`${gotenbergUrl}/forms/libreoffice/convert`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Gotenberg error (${response.status}): ${errText}`);
    }

    const pdfBuffer = await response.buffer();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${req.file.originalname.replace(/\.[^/.]+$/, '')}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ error: `Gagal mengonversi file: ${error.message}` });
  }
});

