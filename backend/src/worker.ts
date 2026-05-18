import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import pdfParse from 'pdf-parse';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { supabaseAdmin } from './core/supabase';

dotenv.config();

console.log('🤖 DocuMind Worker Service (RAG Pipeline) starting...');

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';

// Function to generate embedding via Ollama
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text', // Make sure you pulled this model in Ollama
        prompt: text
      })
    });
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error('Embedding Generation Error:', error);
    throw error;
  }
}

// Worker to process PDFs, extract text, chunk, and embed
const pdfWorker = new Worker(
  'pdf-processing-queue',
  async (job: Job) => {
    console.log(`[Worker] Started processing job ${job.id} for document ${job.data.documentId}`);
    const { fileUrl, documentId, userId } = job.data;
    
    try {
      // 1. Download PDF
      console.log(`[Worker] 1. Downloading PDF from ${fileUrl}...`);
      const pdfResponse = await fetch(fileUrl);
      if (!pdfResponse.ok) throw new Error('Failed to download PDF');
      
      const arrayBuffer = await pdfResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      job.updateProgress(20);

      // 2. Extract Text
      console.log(`[Worker] 2. Extracting Text from PDF...`);
      const pdfData = await pdfParse(buffer);
      const fullText = pdfData.text;
      
      if (!fullText.trim()) {
        throw new Error('No text extracted. Might be a scanned PDF requiring OCR.');
        // Note: OCR implementation via Tesseract.js goes here in the future
      }
      job.updateProgress(40);

      // 3. Chunking
      console.log(`[Worker] 3. Chunking Text...`);
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      const chunks = await textSplitter.splitText(fullText);
      console.log(`[Worker] Created ${chunks.length} chunks.`);
      job.updateProgress(60);

      // 4. Generate Embeddings and Save to pgvector
      console.log(`[Worker] 4. Generating Embeddings & Saving to DB...`);
      let processedChunks = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i];
        
        // Call Ollama for embedding
        const embedding = await generateEmbedding(chunkContent);
        
        // Insert into Supabase
        const { error } = await supabaseAdmin
          .from('document_chunks')
          .insert({
            document_id: documentId,
            content: chunkContent,
            metadata: { page: 1, chunk_index: i }, // Basic metadata
            embedding: embedding
          });

        if (error) {
          console.error(`[Worker] Error inserting chunk ${i}:`, error.message);
          throw error;
        }

        processedChunks++;
        // Update progress smoothly between 60 and 95
        const progress = Math.floor(60 + ((processedChunks / chunks.length) * 35));
        job.updateProgress(progress);
      }

      // 5. Update Document Status
      console.log(`[Worker] 5. Updating Document Status to 'ready'...`);
      await supabaseAdmin
        .from('documents')
        .update({ status: 'ready', content_text: fullText.substring(0, 1000) }) // save preview
        .eq('id', documentId);

      job.updateProgress(100);
      console.log(`[Worker] ✅ Job ${job.id} completed successfully!`);
      
      return { status: 'success', documentId, chunksProcessed: chunks.length };
      
    } catch (error) {
      console.error(`[Worker] ❌ Job ${job.id} failed:`, error);
      
      // Update status to error
      await supabaseAdmin
        .from('documents')
        .update({ status: 'error' })
        .eq('id', documentId);
        
      throw error;
    }
  },
  { connection: redisConnection }
);

pdfWorker.on('completed', (job) => {
  console.log(`[BullMQ] Job ${job.id} completed.`);
});

pdfWorker.on('failed', (job, err) => {
  console.log(`[BullMQ] Job ${job?.id} failed: ${err.message}`);
});
