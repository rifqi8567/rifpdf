import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import { requireAuth } from '../middleware/auth';
import { supabaseAdmin } from '../core/supabase';
import { env } from '../config/env';
import { logger } from '../config/logger';

const router = Router();

const cleanAssistantText = (content: string) => content.replace(/\*\*/g, '');

async function generateWithOpenRouter(model: string, messages: { role: string; content: string }[]) {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const requestBody = {
    model,
    messages,
    stream: true,
    temperature: 0.2,
    max_tokens: 900,
  };

  const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': env.OPENROUTER_REFERER || process.env.FRONTEND_URL || 'http://localhost:5173',
      'X-Title': 'DocuMind AI',
    },
    body: JSON.stringify(requestBody),
    timeout: 60_000,
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    logger.error('OpenRouter summary request failed', {
      model,
      status: aiResponse.status,
      statusText: aiResponse.statusText,
      errorText,
    });
    throw new Error(`OpenRouter failed (${aiResponse.status}): ${errorText}`);
  }

  if (!aiResponse.body) {
    throw new Error('OpenRouter returned an empty summary stream');
  }

  return new Promise<string>((resolve, reject) => {
    let buffer = '';
    let content = '';

    const handleDataLine = (data: string) => {
      if (!data || data === '[DONE]') return;

      const payload = JSON.parse(data);
      if (payload.error) {
        throw new Error(payload.error.message || JSON.stringify(payload.error));
      }

      content +=
        payload.choices?.[0]?.delta?.content ||
        payload.choices?.[0]?.message?.content ||
        payload.choices?.[0]?.text ||
        '';
    };

    aiResponse.body.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      try {
        for (const event of events) {
          const dataLines = event
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.startsWith('data: '))
            .map((line) => line.slice(6));

          for (const data of dataLines) handleDataLine(data);
        }
      } catch (error) {
        reject(error);
      }
    });

    aiResponse.body.on('end', () => {
      try {
        if (buffer.trim().startsWith('data: ')) {
          handleDataLine(buffer.trim().slice(6));
        }
      } catch (error) {
        reject(error);
        return;
      }

      const cleaned = cleanAssistantText(content).trim();
      logger.info('OpenRouter summary stream completed', {
        model,
        characterCount: cleaned.length,
      });
      resolve(cleaned || '');
    });

    aiResponse.body.on('error', reject);
  });
}

router.post('/documents/:documentId/summary', requireAuth, async (req: Request, res: Response) => {
  const { documentId } = req.params;
  const model = env.OPENROUTER_FALLBACK_MODEL;
  const userId = req.user!.id;

  const { data: document, error: documentError } = await supabaseAdmin
    .from('documents')
    .select('id, name, user_id, content_text, status')
    .eq('id', documentId)
    .eq('user_id', userId)
    .single();

  if (documentError || !document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  if (document.status === 'processing' || document.status === 'uploading') {
    return res.status(409).json({ error: 'Document is still processing' });
  }

  const { data: chunks, error: chunksError } = await supabaseAdmin
    .from('document_chunks')
    .select('content, metadata')
    .eq('document_id', documentId)
    .order('metadata->chunk_index', { ascending: true })
    .limit(24);

  if (chunksError) {
    throw chunksError;
  }

  const context = chunks && chunks.length > 0
    ? chunks.map((chunk, index) => `Chunk ${index + 1}:\n${chunk.content}`).join('\n\n---\n\n')
    : document.content_text;

  if (!context || context.trim().length < 20) {
    return res.status(422).json({
      error: 'Dokumen ini belum punya teks yang bisa diringkas.',
      code: 'DOCUMENT_NEEDS_OCR',
      details: 'PDF kemungkinan berupa scan/foto/gambar. Jalankan OCR Scanner terlebih dahulu untuk mengekstrak teks.',
    });
  }

  const messages = [
    {
      role: 'system',
      content: 'You summarize documents accurately. Use Indonesian by default. Do not invent facts not present in the context. Format neatly with short plain labels, bullets, and a few helpful emoji section markers like 📌, ✅, or ⚠️. Do not use markdown bold markers like **.',
    },
    {
      role: 'user',
      content: `Ringkas dokumen "${document.name}" berdasarkan konteks berikut. Berikan:
1. Ringkasan eksekutif 3-5 kalimat
2. 5 poin utama
3. Risiko atau hal yang perlu diperhatikan
4. Rekomendasi pertanyaan lanjutan

Konteks:
${context}`,
    },
  ];

  const summary = await generateWithOpenRouter(model, messages);

  if (!summary) {
    return res.status(502).json({ error: 'AI provider returned an empty summary' });
  }

  res.json({
    documentId,
    model,
    summary,
  });
});

router.post('/ocr/analyze', requireAuth, async (req: Request, res: Response) => {
  const { text, fileName = 'hasil OCR' } = req.body as {
    text?: string;
    fileName?: string;
  };
  const model = env.OPENROUTER_FALLBACK_MODEL;

  const context = typeof text === 'string' ? text.trim().slice(0, 28000) : '';

  if (context.length < 20) {
    return res.status(422).json({ error: 'Teks OCR terlalu pendek untuk dianalisis AI' });
  }

  const messages = [
    {
      role: 'system',
      content: 'Anda analis dokumen OCR. Jawab dalam bahasa Indonesia yang jelas, rapi, dan praktis. Gunakan hanya informasi dari teks OCR. Jika ada bagian yang tidak jelas, sebutkan sebagai kemungkinan salah baca OCR. Format rapi dengan label singkat, bullet, dan emoji secukupnya. Jangan gunakan markdown bold marker seperti **.',
    },
    {
      role: 'user',
      content: `Analisis hasil OCR dari "${fileName}" berikut.

Buat output dengan format:
1. Jawaban singkat: jelaskan dokumen ini tentang apa
2. Simpulan utama: 3-5 kalimat
3. Poin penting: bullet yang paling relevan
4. Penjelasan rapi: uraikan isi dokumen dengan bahasa mudah dipahami
5. Hal yang perlu dicek: data atau kata yang mungkin perlu diverifikasi karena OCR bisa salah baca
6. Tindak lanjut: langkah praktis berikutnya bila ada

Teks OCR:
${context}`,
    },
  ];

  const analysis = await generateWithOpenRouter(model, messages);

  if (!analysis) {
    return res.status(502).json({ error: 'AI provider returned an empty OCR analysis' });
  }

  res.json({
    model,
    analysis,
  });
});

export default router;
