import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { logger } from '../config/logger';
import { supabase } from '../config/supabase';
import { PDFService } from '../services/pdf';
import { OllamaService } from '../services/ollama';
import { DOCUMENT_PROCESSING_QUEUE } from '../queues/document';

const processJob = async (job: Job) => {
  const { documentId, fileUrl, userId } = job.data;
  const startedAt = Date.now();
  logger.info('Document processing started', {
    jobId: job.id,
    documentId,
    fileUrl,
    userId,
    attempt: job.attemptsMade + 1,
  });

  try {
    // 1. Update status to processing
    const { error: processingStatusError } = await supabase
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', documentId);
    if (processingStatusError) throw processingStatusError;

    // 2. Download file from Supabase Storage
    logger.info('Downloading document from storage', { jobId: job.id, documentId, fileUrl });
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(fileUrl);
      
    if (downloadError || !fileData) {
      logger.error('Failed to download document from storage', {
        jobId: job.id,
        documentId,
        fileUrl,
        errorMessage: downloadError?.message,
        errorName: downloadError?.name,
      });
      throw new Error('Failed to download PDF from storage');
    }

    // 3. Extract text from PDF
    const buffer = Buffer.from(await fileData.arrayBuffer());
    logger.info('Extracting text from PDF', {
      jobId: job.id,
      documentId,
      bytes: buffer.length,
      mimeType: fileData.type,
    });
    const extractedText = await PDFService.extractText(buffer);
    logger.info('PDF text extracted', {
      jobId: job.id,
      documentId,
      textLength: extractedText.length,
    });
    
    // 4. Update document with extracted text (metadata)
    const contentPreview = extractedText.length > 500 ? `${extractedText.substring(0, 500)}...` : extractedText;
    const { error: contentError } = await supabase
      .from('documents')
      .update({ content_text: contentPreview })
      .eq('id', documentId);
    if (contentError) throw contentError;

    // 5. Chunking text
    const chunks = await PDFService.chunkText(extractedText);
    logger.info('PDF text chunked', {
      jobId: job.id,
      documentId,
      chunkCount: chunks.length,
      firstChunkLength: chunks[0]?.length ?? 0,
    });

    const { error: deleteChunksError } = await supabase
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId);
    if (deleteChunksError) throw deleteChunksError;

    // 6. Sequential Embedding Generation (to save RAM)
    // We process sequentially instead of Promise.all to prevent CPU/RAM spikes on 2 Core VPS
    logger.info('Generating embeddings sequentially', {
      jobId: job.id,
      documentId,
      chunkCount: chunks.length,
    });
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await OllamaService.generateEmbeddings(chunk);
      if (i === 0) {
        logger.info('First embedding generated', {
          jobId: job.id,
          documentId,
          embeddingDimensions: embedding.length,
          embedModel: process.env.OLLAMA_EMBED_MODEL,
        });
      }
      
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
        logger.error('Failed to insert document chunk', {
          jobId: job.id,
          documentId,
          chunkIndex: i,
          chunkLength: chunk.length,
          embeddingDimensions: embedding.length,
          errorMessage: chunkError.message,
          errorCode: chunkError.code,
          errorDetails: chunkError.details,
          errorHint: chunkError.hint,
        });
        throw chunkError;
      }
      
      // Free up memory manually if needed (garbage collection usually handles it)
      if (i % 10 === 0) {
        logger.debug('Document chunks processed', {
          jobId: job.id,
          documentId,
          processed: i,
          total: chunks.length,
        });
      }
    }

    // 7. Mark as ready
    const { error: readyStatusError } = await supabase
      .from('documents')
      .update({ status: 'ready' })
      .eq('id', documentId);
    if (readyStatusError) throw readyStatusError;

    logger.info('Document processing completed', {
      jobId: job.id,
      documentId,
      chunkCount: chunks.length,
      durationMs: Date.now() - startedAt,
    });

  } catch (error: any) {
    logger.error('Document processing failed', {
      jobId: job.id,
      documentId,
      fileUrl,
      userId,
      durationMs: Date.now() - startedAt,
      errorName: error?.name,
      errorMessage: error?.message,
      errorCode: error?.code,
      errorDetails: error?.details,
      errorHint: error?.hint,
      errorStack: error?.stack,
    });
    const { error: statusError } = await supabase
      .from('documents')
      .update({ status: 'error' })
      .eq('id', documentId);
    if (statusError) {
      logger.error('Failed to mark document as error', {
        jobId: job.id,
        documentId,
        errorMessage: statusError.message,
        errorCode: statusError.code,
      });
    }
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
  logger.info('Document processing job completed', {
    jobId: job.id,
    documentId: job.data?.documentId,
  });
});

worker.on('failed', (job, err) => {
  logger.error('Document processing job failed', {
    jobId: job?.id,
    documentId: job?.data?.documentId,
    attemptsMade: job?.attemptsMade,
    errorMessage: err.message,
    errorStack: err.stack,
  });
});
