import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import { requireAuth } from '../middleware/auth';
import { supabaseAdmin } from '../core/supabase';
import { env } from '../config/env';
import { logger } from '../config/logger';

const router = Router();

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type DocumentChunk = {
  content: string;
  metadata?: Record<string, unknown>;
  similarity?: number;
};

type OpenRouterGenerationUsage = {
  id: string;
  model?: string;
  provider_name?: string;
  tokens_prompt?: number;
  tokens_completion?: number;
  native_tokens_prompt?: number;
  native_tokens_completion?: number;
  native_tokens_reasoning?: number;
  total_cost?: number;
  usage?: number;
};

const cleanAssistantText = (content: string) => content.replace(/\*\*/g, '');

const writeSseChunk = (res: Response, content: string) => {
  res.write(`data: ${JSON.stringify({
    choices: [
      {
        delta: { content: cleanAssistantText(content) },
      },
    ],
  })}\n\n`);
};

const writeSseUsage = (res: Response, usage: OpenRouterGenerationUsage) => {
  res.write(`data: ${JSON.stringify({ usage })}\n\n`);
};

const writeSseDone = (res: Response) => {
  res.write('data: [DONE]\n\n');
  res.end();
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchOpenRouterGenerationUsage = async (generationId: string) => {
  if (!env.OPENROUTER_API_KEY) return null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (attempt > 0) {
      await delay(600 * attempt);
    }

    const usageRes = await fetch(`https://openrouter.ai/api/v1/generation?id=${encodeURIComponent(generationId)}`, {
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      },
      timeout: 15_000,
    });

    if (usageRes.status === 404 || usageRes.status === 429) {
      continue;
    }

    if (!usageRes.ok) {
      const errorText = await usageRes.text().catch(() => '');
      logger.warn('OpenRouter generation usage fetch failed', {
        generationId,
        status: usageRes.status,
        errorText: errorText.slice(0, 500),
      });
      return null;
    }

    const payload = await usageRes.json() as { data?: OpenRouterGenerationUsage };
    return payload.data || null;
  }

  return null;
};

const retrieveContext = async (documentId: string) => {
  try {
    const { data: chunks, error: chunksError } = await supabaseAdmin
      .from('document_chunks')
      .select('content, metadata')
      .eq('document_id', documentId)
      .order('metadata->chunk_index', { ascending: true })
      .limit(20);

    if (chunksError) throw chunksError;
    if (chunks && chunks.length > 0) {
      logger.info('RAG context loaded from stored chunks', {
        documentId,
        chunkCount: chunks.length,
      });
      return chunks as DocumentChunk[];
    }
  } catch (error) {
    logger.warn('RAG stored chunk retrieval failed, using document.content_text', {
      documentId,
      errorName: (error as any)?.name,
      errorMessage: (error as any)?.message,
      errorCode: (error as any)?.code,
    });
  }
  return [];
};

const buildSystemPrompt = (documentName: string, contextText: string) => `You are DocuMind AI, an Indonesian-first PDF document assistant.
Answer using only the provided document context. If the answer is not found in the context, say that it is not available in the document.
Be warm, helpful, and concise. Use Indonesian by default unless the user asks otherwise.
Format answers neatly:
- Start with a short friendly sentence and 1 relevant emoji.
- Use numbered lists or bullets for multi-point answers.
- Use light emoji section markers such as 📌, ✅, ⚠️, 📝 only when helpful.
- Do not overuse emoji; keep it professional.
- Do not use markdown bold markers like **.
- Use plain labels such as "Tanggal:", "Lokasi:", and "Aturan:".

Document name: ${documentName}

--- START OF DOCUMENT CONTEXT ---
${contextText}
--- END OF DOCUMENT CONTEXT ---`;

const streamOpenRouter = async (res: Response, model: string, messages: ChatMessage[]) => {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const providerRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': env.OPENROUTER_REFERER || process.env.FRONTEND_URL || 'http://localhost:5173',
      'X-Title': 'DocuMind AI',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: 0.2,
      max_tokens: 800,
    }),
    timeout: 60_000,
  });

  if (!providerRes.ok) {
    const errorText = await providerRes.text();
    throw new Error(`OpenRouter failed (${providerRes.status}): ${errorText}`);
  }

  if (!providerRes.body) {
    throw new Error('OpenRouter returned an empty stream');
  }

  return new Promise<void>((resolve, reject) => {
    let buffer = '';
    let contentChunks = 0;
    let characterCount = 0;
    let generationId = '';

    const handleDataLine = (data: string) => {
      if (!data || data === '[DONE]') return;

      try {
        const payload = JSON.parse(data);
        if (payload.error) {
          throw new Error(payload.error.message || JSON.stringify(payload.error));
        }

        if (payload.id && !generationId) {
          generationId = payload.id;
        }

        const content =
          payload.choices?.[0]?.delta?.content ||
          payload.choices?.[0]?.message?.content ||
          payload.choices?.[0]?.text ||
          '';

        if (content) {
          contentChunks += 1;
          characterCount += content.length;
          writeSseChunk(res, content);
        }
      } catch (error) {
        reject(error);
      }
    };

    providerRes.body.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const event of events) {
        const dataLines = event
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.startsWith('data: '))
          .map((line) => line.slice(6));

        for (const data of dataLines) handleDataLine(data);
      }
    });

    providerRes.body.on('end', async () => {
      if (buffer.trim().startsWith('data: ')) {
        handleDataLine(buffer.trim().slice(6));
      }

      logger.info('OpenRouter stream completed', {
        model,
        generationId,
        contentChunks,
        characterCount,
      });

      if (!res.writableEnded) {
        if (contentChunks === 0) {
          writeSseChunk(res, 'OpenRouter merespons, tetapi tidak mengirim isi jawaban. Coba kirim ulang atau pilih model lain.');
        }
        if (generationId) {
          const usage = await fetchOpenRouterGenerationUsage(generationId).catch((error) => {
            logger.warn('OpenRouter generation usage unavailable', {
              generationId,
              errorMessage: (error as Error).message,
            });
            return null;
          });
          if (usage) {
            writeSseUsage(res, usage);
          }
        }
        writeSseDone(res);
      }
      resolve();
    });

    providerRes.body.on('error', (error: Error) => {
      logger.error('OpenRouter stream error', {
        model,
        errorMessage: error.message,
        errorStack: error.stack,
      });
      reject(error);
    });
  });
};

router.get('/usage', requireAuth, async (_req: Request, res: Response) => {
  try {
    if (!env.OPENROUTER_API_KEY) {
      return res.json({
        configured: false,
        message: 'OPENROUTER_API_KEY is not configured',
      });
    }

    const keyRes = await fetch('https://openrouter.ai/api/v1/key', {
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      },
      timeout: 15_000,
    });

    if (!keyRes.ok) {
      const errorText = await keyRes.text().catch(() => '');
      logger.warn('OpenRouter key usage fetch failed', {
        status: keyRes.status,
        errorText: errorText.slice(0, 500),
      });
      return res.status(keyRes.status).json({
        configured: true,
        error: 'Gagal mengambil kuota OpenRouter',
      });
    }

    const payload = await keyRes.json() as {
      data?: {
        limit: number | null;
        limit_reset: string | null;
        limit_remaining: number | null;
        usage: number;
        usage_daily: number;
        usage_weekly: number;
        usage_monthly: number;
        is_free_tier: boolean;
        rate_limit?: {
          requests?: number;
          interval?: string;
        };
      };
    };

    return res.json({
      configured: true,
      data: payload.data || null,
    });
  } catch (error: any) {
    logger.error('OpenRouter usage endpoint failed', {
      errorMessage: error.message,
      errorStack: error.stack,
    });
    return res.status(500).json({ error: 'Gagal mengambil kuota OpenRouter' });
  }
});

router.post('/completions', requireAuth, async (req: Request, res: Response) => {
  try {
    const { documentId, messages } = req.body;
    const model = env.OPENROUTER_FALLBACK_MODEL;
    const userId = req.user!.id;

    logger.info('RAG chat request received', {
      documentId,
      userId,
      model,
      messageCount: Array.isArray(messages) ? messages.length : 0,
    });

    if (!documentId || !messages || !Array.isArray(messages)) {
      logger.warn('RAG chat rejected: invalid payload', { documentId, userId });
      return res.status(400).json({ error: 'documentId and messages array are required' });
    }

    const { data: document, error: documentError } = await supabaseAdmin
      .from('documents')
      .select('id, name, user_id, status, content_text')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (documentError || !document) {
      logger.warn('RAG chat rejected: document not found', {
        documentId,
        userId,
        errorMessage: documentError?.message,
        errorCode: documentError?.code,
      });
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.status === 'processing' || document.status === 'uploading') {
      logger.info('RAG chat rejected: document still processing', {
        documentId,
        userId,
        status: document.status,
      });
      return res.status(409).json({ error: 'Document is still processing' });
    }

    const latestUserMessage = [...messages].reverse().find((message: ChatMessage) => message.role === 'user')?.content;
    if (!latestUserMessage) {
      return res.status(400).json({ error: 'At least one user message is required' });
    }

    const contextChunks = await retrieveContext(documentId);
    const contextText = contextChunks.length > 0
      ? contextChunks.map((chunk, index) => `Chunk ${index + 1}:\n${chunk.content}`).join('\n\n---\n\n')
      : document.content_text || '';

    logger.info('RAG context prepared', {
      documentId,
      userId,
      documentStatus: document.status,
      chunkCount: contextChunks.length,
      contextLength: contextText.length,
      contentTextLength: document.content_text?.length ?? 0,
    });

    if (!contextText || contextText.trim().length < 20) {
      logger.warn('RAG chat rejected: document has no extracted text', {
        documentId,
        userId,
        documentStatus: document.status,
        contentTextLength: document.content_text?.length ?? 0,
        chunkCount: contextChunks.length,
      });
      return res.status(422).json({
        error: 'Dokumen ini belum punya teks yang bisa dibaca AI.',
        code: 'DOCUMENT_NEEDS_OCR',
        details: 'PDF kemungkinan berupa scan/foto/gambar. Jalankan OCR Scanner terlebih dahulu untuk mengekstrak teks.',
      });
    }

    const providerMessages: ChatMessage[] = [
      { role: 'system', content: buildSystemPrompt(document.name, contextText) },
      ...messages
        .filter((message: ChatMessage) => message.role === 'user' || message.role === 'assistant')
        .slice(-10),
    ];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    await streamOpenRouter(res, model, providerMessages);
  } catch (error: any) {
    console.error('[RAG] Chat endpoint error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
      return;
    }

    writeSseChunk(res, `Maaf, AI provider gagal merespons: ${error.message || 'Unknown error'}`);
    writeSseDone(res);
  }
});

export default router;
