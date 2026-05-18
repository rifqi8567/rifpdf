import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { supabaseAdmin } from '../core/supabase';
import fetch from 'node-fetch'; // using global fetch if Node 18+, but let's be safe if it's imported

const router = Router();
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// 1. Generate query embedding using local Ollama
async function generateQueryEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'nomic-embed-text',
      prompt: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate embedding: ${response.statusText}`);
  }

  const data = await response.json() as any;
  return data.embedding;
}

// 2. Perform Semantic Search via Supabase pgvector RPC
async function retrieveContext(documentId: string, embedding: number[], matchCount = 5) {
  // We use a custom RPC function named `match_document_chunks`
  // You must create this function in Supabase SQL Editor.
  const { data, error } = await supabaseAdmin.rpc('match_document_chunks', {
    query_embedding: embedding,
    match_threshold: 0.7, // 70% similarity threshold
    match_count: matchCount,
    filter_document_id: documentId,
  });

  if (error) {
    console.error('Vector Search Error:', error);
    throw error;
  }

  return data || [];
}

// 3. RAG Chat Endpoint with SSE (Server-Sent Events) Streaming
router.post('/completions', requireAuth, async (req: Request, res: Response) => {
  try {
    const { documentId, messages, model = 'google/gemini-2.0-flash-exp' } = req.body;
    const userId = req.user!.id;

    if (!documentId || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request body. documentId and messages array are required.' });
    }

    // Get the latest user message
    const latestUserMessage = messages[messages.length - 1].content;

    // Step 1: Generate Embedding for the query
    console.log(`[RAG] Generating embedding for query: "${latestUserMessage.substring(0, 30)}..."`);
    const queryEmbedding = await generateQueryEmbedding(latestUserMessage);

    // Step 2: Retrieve relevant chunks from pgvector
    console.log(`[RAG] Retrieving context for document: ${documentId}`);
    const contextChunks = await retrieveContext(documentId, queryEmbedding);
    
    const contextText = contextChunks
      .map((chunk: any) => chunk.content)
      .join('\n\n---\n\n');

    // Step 3: Construct the Prompt
    const systemPrompt = `You are DocuMind AI, a highly intelligent and helpful PDF document analysis assistant.
Use the following pieces of retrieved document context to answer the user's question.
If the answer is not in the context, just say "I cannot find the answer to this in the provided document." Do not make up information.

--- START OF DOCUMENT CONTEXT ---
${contextText}
--- END OF DOCUMENT CONTEXT ---

Answer the question clearly, concisely, and format it using Markdown if necessary.`;

    const openRouterMessages = [
      { role: 'system', content: systemPrompt },
      ...messages // Append conversation history
    ];

    // Step 4: Call OpenRouter and Stream Response
    console.log(`[RAG] Sending prompt to OpenRouter using model: ${model}`);
    
    const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://documind.ai', // Replace with actual site URL
        'X-Title': 'DocuMind AI',
      },
      body: JSON.stringify({
        model: model,
        messages: openRouterMessages,
        stream: true, // Enable streaming
      }),
    });

    if (!openRouterRes.ok) {
      const errorText = await openRouterRes.text();
      console.error('OpenRouter Error:', errorText);
      return res.status(500).json({ error: 'Failed to communicate with AI provider' });
    }

    // Setup SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Pipe the OpenRouter stream directly to the client
    if (openRouterRes.body) {
      openRouterRes.body.on('data', (chunk: Buffer) => {
        // We write the raw SSE chunks from OpenRouter directly to the client
        res.write(chunk);
      });

      openRouterRes.body.on('end', () => {
        console.log('[RAG] Stream completed.');
        res.end();
        
        // Note: You can asynchronously save the final message to the 'chat_messages' table here.
      });

      openRouterRes.body.on('error', (err: any) => {
        console.error('[RAG] Stream error:', err);
        res.end();
      });
    }

  } catch (error: any) {
    console.error('[RAG] Chat endpoint error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
