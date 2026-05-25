import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import { requireAuth } from '../middleware/auth';
import { supabaseAdmin } from '../core/supabase';
import { env } from '../config/env';
import { OllamaService } from '../services/ollama';
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
    const { data: chunks, error: chunksError } = await supabaseAdmin
      .from('document_chunks')
      .select('content, metadata')
      .eq('document_id', documentId)
      .order('metadata->chunk_index', { ascending: true })
      .limit(11);

    if (chunksError) throw chunksError;
    if (chunks && chunks.length > 0 && chunks.length <= 10) {
      logger.info('RAG small document context loaded without vector search', {
        documentId,
        chunkCount: chunks.length,
      });
      return chunks as DocumentChunk[];
    }
  } catch (error) {
    logger.warn('RAG small document context check failed, continuing to vector search', {
      documentId,
      errorName: (error as any)?.name,
      errorMessage: (error as any)?.message,
      errorCode: (error as any)?.code,
    });
  }

  try {
    logger.info('RAG vector retrieval started', {
      documentId,
      queryLength: latestUserMessage.length,
    });
    const queryEmbedding = await OllamaService.generateEmbeddings(latestUserMessage);
    const { data, error } = await supabaseAdmin.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.55,
      match_count: 8,
      filter_document_id: documentId,
    });

    if (error) throw error;
    logger.info('RAG vector retrieval completed', {
      documentId,
      matchCount: data?.length ?? 0,
      queryEmbeddingDimensions: queryEmbedding.length,
      similarities: data?.map((chunk: DocumentChunk) => chunk.similarity).slice(0, 5),
    });
    if (data && data.length > 0) return data as DocumentChunk[];
  } catch (error) {
    logger.warn('RAG vector retrieval failed, falling back to stored chunks', {
      documentId,
      errorName: (error as any)?.name,
      errorMessage: (error as any)?.message,
      errorCode: (error as any)?.code,
      errorDetails: (error as any)?.details,
      errorHint: (error as any)?.hint,
    });
  }

  try {
    const { data: chunks, error: chunksError } = await supabaseAdmin
      .from('document_chunks')
      .select('content, metadata')
      .eq('document_id', documentId)
      .limit(10);

    if (chunksError) throw chunksError;
    logger.info('RAG stored chunk fallback completed', {
      documentId,
      chunkCount: chunks?.length ?? 0,
    });
    return (chunks || []) as DocumentChunk[];
  } catch (error) {
    logger.warn('RAG stored chunk fallback failed, using document.content_text', {
      documentId,
      errorName: (error as any)?.name,
      errorMessage: (error as any)?.message,
      errorCode: (error as any)?.code,
      errorDetails: (error as any)?.details,
      errorHint: (error as any)?.hint,
    });
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

    const handleDataLine = (data: string) => {
      if (!data || data === '[DONE]') return;

      try {
        const payload = JSON.parse(data);
        if (payload.error) {
          throw new Error(payload.error.message || JSON.stringify(payload.error));
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

    providerRes.body.on('end', () => {
      if (buffer.trim().startsWith('data: ')) {
        handleDataLine(buffer.trim().slice(6));
      }

      logger.info('OpenRouter stream completed', {
        model,
        contentChunks,
        characterCount,
      });

      if (!res.writableEnded) {
        if (contentChunks === 0) {
          writeSseChunk(res, 'OpenRouter merespons, tetapi tidak mengirim isi jawaban. Coba kirim ulang atau pilih model lain.');
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
        num_ctx: 2048,
        num_predict: 512,
      },
    }),
    timeout: env.OLLAMA_CHAT_TIMEOUT_MS,
  });

  if (!providerRes.ok) {
    const errorText = await providerRes.text();
    throw new Error(`Ollama failed (${providerRes.status}): ${errorText}`);
  }

  if (!providerRes.body) {
    throw new Error('Ollama returned an empty stream');
  }

  return new Promise<void>((resolve, reject) => {
    let buffer = '';
    let contentChunks = 0;
    let characterCount = 0;
    let sawDone = false;

    const handleLine = (line: string) => {
      if (!line.trim()) return;

      const payload = JSON.parse(line);
      if (payload.error) {
        throw new Error(payload.error);
      }

      const content = payload.message?.content || payload.response || '';
      if (content) {
        contentChunks += 1;
        characterCount += content.length;
        writeSseChunk(res, content);
      }
      if (payload.done) sawDone = true;
    };

    providerRes.body.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        try {
          handleLine(line);
        } catch (error) {
          reject(error);
        }
      }
    });

    providerRes.body.on('end', () => {
      try {
        if (buffer.trim()) handleLine(buffer.trim());
      } catch (error) {
        reject(error);
        return;
      }

      logger.info('Ollama stream completed', {
        model: resolveOllamaModel(model),
        contentChunks,
        characterCount,
        sawDone,
      });

      if (!res.writableEnded) {
        if (contentChunks === 0) {
          writeSseChunk(res, 'Ollama merespons, tetapi tidak mengirim isi jawaban. Coba kirim ulang atau gunakan OpenRouter Free.');
        }
        writeSseDone(res);
      }
      resolve();
    });

    providerRes.body.on('error', (error: Error) => {
      logger.error('Ollama stream error', {
        model: resolveOllamaModel(model),
        errorMessage: error.message,
        errorStack: error.stack,
      });
      reject(error);
    });
  });
};

router.post('/completions', requireAuth, async (req: Request, res: Response) => {
  try {
    const { documentId, messages, model = env.AI_PROVIDER === 'ollama' ? 'ollama/auto' : env.OPENROUTER_FALLBACK_MODEL } = req.body;
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

    const contextChunks = await retrieveContext(documentId, latestUserMessage);
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
        await streamOpenRouter(res, env.OPENROUTER_FALLBACK_MODEL, providerMessages);
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
