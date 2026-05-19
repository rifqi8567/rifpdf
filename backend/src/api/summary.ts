import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import { requireAuth } from '../middleware/auth';
import { supabaseAdmin } from '../core/supabase';
import { env } from '../config/env';

const router = Router();

router.post('/documents/:documentId/summary', requireAuth, async (req: Request, res: Response) => {
  const { documentId } = req.params;
  const { model = 'google/gemini-2.0-flash-exp' } = req.body;
  const userId = req.user!.id;

  if (!env.OPENROUTER_API_KEY) {
    return res.status(503).json({ error: 'AI provider is not configured' });
  }

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
    return res.status(422).json({ error: 'Document has no extracted text yet' });
  }

  const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.FRONTEND_URL || 'https://documind.ai',
      'X-Title': 'DocuMind AI',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You summarize documents accurately. Use Indonesian by default. Do not invent facts not present in the context.',
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
      ],
      temperature: 0.2,
      max_tokens: 900,
    }),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    return res.status(502).json({ error: 'Failed to summarize document', details: errorText });
  }

  const payload = await aiResponse.json() as any;
  const summary = payload.choices?.[0]?.message?.content;

  if (!summary) {
    return res.status(502).json({ error: 'AI provider returned an empty summary' });
  }

  res.json({
    documentId,
    model,
    summary,
  });
});

export default router;
