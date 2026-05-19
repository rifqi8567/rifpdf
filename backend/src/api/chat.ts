import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import { requireAuth } from '../middleware/auth';
import { supabaseAdmin } from '../core/supabase';
import { env } from '../config/env';
import { OllamaService } from '../services/ollama';

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

const isOllamaModel = (model: string) => model === 'ollama/auto' || model.startsWith('ollama/');

const resolveOllamaModel = (model: string) => {
  if (model === 'ollama/auto') return env.OLLAMA_CHAT_MODEL;
  return model.replace(/^ollama\//, '');
};

const writeSseChunk = (res: Response, content: string) => {
  res.write(`data: ${JSON.stringify({
    choices: [
      {
        delta: { content },
      },
    ],
  })}\n\n`);
};

const writeSseDone = (res: Response) => {
  res.write('data: [DONE]\n\n');
  res.end();
};

const retrieveContext = async (documentId: string, latestUserMessage: string) => {
  try {
    const queryEmbedding = await OllamaService.generateEmbeddings(latestUserMessage);
    const { data, error } = await supabaseAdmin.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.55,
      match_count: 8,
      filter_document_id: documentId,
    });

    if (error) throw error;
    if (data && data.length > 0) return data as DocumentChunk[];
  } catch (error) {
    console.warn('[RAG] Vector retrieval failed, falling back to stored chunks:', error);
  }

  try {
    const { data: chunks, error: chunksError } = await supabaseAdmin
      .from('document_chunks')
      .select('content, metadata')
      .eq('document_id', documentId)
      .limit(10);

    if (chunksError) throw chunksError;
    return (chunks || []) as DocumentChunk[];
  } catch (error) {
    console.warn('[RAG] Stored chunk fallback failed, using document.content_text:', error);
    return [];
  }
};

const buildSystemPrompt = (documentName: string, contextText: string) => `You are DocuMind AI, an Indonesian-first PDF document assistant.
Answer using only the provided document context. If the answer is not found in the context, say that it is not available in the document.
Be helpful, concise, and format answers with Markdown bullets or numbered lists when useful.

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
      max_tokens: 1200,
    }),
  });

  if (!providerRes.ok) {
    const errorText = await providerRes.text();
    throw new Error(`OpenRouter failed (${providerRes.status}): ${errorText}`);
  }

  if (!providerRes.body) {
    throw new Error('OpenRouter returned an empty stream');
  }

  providerRes.body.on('data', (chunk: Buffer) => res.write(chunk));
  providerRes.body.on('end', () => res.end());
  providerRes.body.on('error', (error: Error) => {
    console.error('[OpenRouter] Stream error:', error);
    res.end();
  });
};

const streamOllama = async (res: Response, model: string, messages: ChatMessage[]) => {
  const providerRes = await fetch(`${env.OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: resolveOllamaModel(model),
      messages,
      stream: true,
      options: {
        temperature: 0.2,
        num_ctx: 8192,
      },
    }),
  });

  if (!providerRes.ok) {
    const errorText = await providerRes.text();
    throw new Error(`Ollama failed (${providerRes.status}): ${errorText}`);
  }

  if (!providerRes.body) {
    throw new Error('Ollama returned an empty stream');
  }

  let buffer = '';

  providerRes.body.on('data', (chunk: Buffer) => {
    buffer += chunk.toString('utf8');
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const payload = JSON.parse(line);
        const content = payload.message?.content || payload.response || '';
        if (content) writeSseChunk(res, content);
        if (payload.done) writeSseDone(res);
      } catch (error) {
        console.warn('[Ollama] Failed to parse stream line:', line);
      }
    }
  });

  providerRes.body.on('end', () => {
    if (!res.writableEnded) writeSseDone(res);
  });

  providerRes.body.on('error', (error: Error) => {
    console.error('[Ollama] Stream error:', error);
    if (!res.writableEnded) res.end();
  });
};

router.post('/completions', requireAuth, async (req: Request, res: Response) => {
  try {
    const { documentId, messages, model = env.AI_PROVIDER === 'ollama' ? 'ollama/auto' : 'google/gemini-2.0-flash-exp' } = req.body;
    const userId = req.user!.id;

    if (!documentId || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'documentId and messages array are required' });
    }

    const { data: document, error: documentError } = await supabaseAdmin
      .from('documents')
      .select('id, name, user_id, status, content_text')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (documentError || !document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.status === 'processing' || document.status === 'uploading') {
      return res.status(409).json({ error: 'Document is still processing' });
    }

    const latestUserMessage = [...messages].reverse().find((message: ChatMessage) => message.role === 'user')?.content;
    if (!latestUserMessage) {
      return res.status(400).json({ error: 'At least one user message is required' });
    }

    const contextChunks = await retrieveContext(documentId, latestUserMessage);
    const contextText = contextChunks.length > 0
      ? contextChunks.map((chunk, index) => `Chunk ${index + 1}:\n${chunk.content}`).join('\n\n---\n\n')
      : document.content_text || '';

    if (!contextText || contextText.trim().length < 20) {
      return res.status(422).json({ error: 'Document has no extracted text yet' });
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

    if (isOllamaModel(model)) {
      try {
        await streamOllama(res, model, providerMessages);
      } catch (ollamaError) {
        console.error('[RAG] Ollama failed:', ollamaError);

        if (!env.OPENROUTER_API_KEY) {
          throw ollamaError;
        }

        writeSseChunk(res, 'Ollama VPS sedang tidak bisa dihubungi. Saya coba jawab lewat OpenRouter.\n\n');
        await streamOpenRouter(res, 'google/gemini-2.0-flash-exp', providerMessages);
      }
    } else {
      await streamOpenRouter(res, model, providerMessages);
    }
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
