import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { logger } from '../config/logger';
import { supabase } from '../config/supabase';
import { PDFService } from '../services/pdf';
import { OllamaService } from '../services/ollama';
import { DOCUMENT_PROCESSING_QUEUE } from '../queues/document';

const processJob = async (job: Job) => {
  const { documentId, fileUrl, userId } = job.data;
  logger.info(`Starting processing for document: ${documentId}`);

  try {
    // 1. Update status to processing
    await supabase.from('documents').update({ status: 'processing' }).eq('id', documentId);

    // 2. Download file from Supabase Storage
    logger.info(`Downloading file from storage: ${fileUrl}`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(fileUrl);
      
    if (downloadError || !fileData) throw new Error('Failed to download PDF from storage');

    // 3. Extract text from PDF
    logger.info('Extracting text from PDF...');
    const buffer = Buffer.from(await fileData.arrayBuffer());
    const extractedText = await PDFService.extractText(buffer);
    
    // 4. Update document with extracted text (metadata)
    const contentPreview = extractedText.length > 500 ? `${extractedText.substring(0, 500)}...` : extractedText;
    await supabase.from('documents').update({ content_text: contentPreview }).eq('id', documentId);

    // 5. Chunking text
    logger.info('Chunking text...');
    const chunks = await PDFService.chunkText(extractedText);
    logger.info(`Generated ${chunks.length} chunks`);

    await supabase.from('document_chunks').delete().eq('document_id', documentId);

    // 6. Sequential Embedding Generation (to save RAM)
    // We process sequentially instead of Promise.all to prevent CPU/RAM spikes on 2 Core VPS
    logger.info('Generating embeddings sequentially...');
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await OllamaService.generateEmbeddings(chunk);
      
      const { error: chunkError } = await supabase.from('document_chunks').insert({
        document_id: documentId,
        content: chunk,
        embedding,
        metadata: {
          chunk_index: i,
          char_count: chunk.length,
          user_id: userId,
        },
      });

      if (chunkError) {
        throw chunkError;
      }
      
      // Free up memory manually if needed (garbage collection usually handles it)
      if (i % 10 === 0) {
        logger.debug(`Processed ${i}/${chunks.length} chunks`);
      }
    }

    // 7. Mark as ready
    await supabase.from('documents').update({ status: 'ready' }).eq('id', documentId);
    logger.info(`Successfully processed document: ${documentId}`);

  } catch (error: any) {
    logger.error(`Error processing document ${documentId}:`, error);
    await supabase.from('documents').update({ status: 'error' }).eq('id', documentId);
    throw error;
  }
};

// IMPORTANT: concurrency: 1 is CRITICAL for 2GB RAM VPS to prevent Out of Memory
export const worker = new Worker(DOCUMENT_PROCESSING_QUEUE, processJob, {
  connection: redisConnection,
  concurrency: 1, 
  limiter: {
    max: 1,
    duration: 1000,
  }
});

worker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed with error: ${err.message}`);
});
