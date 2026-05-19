import pdf from 'pdf-parse';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { logger } from '../config/logger';

export class PDFService {
  /**
   * Parse PDF buffer into text safely.
   */
  static async extractText(buffer: Buffer): Promise<string> {
    try {
      // PDF-parse can be memory intensive on huge files.
      // We assume files are already size-limited before uploading.
      const data = await pdf(buffer, {
        max: 0, // 0 = no limit on pages, but we can restrict if needed
      });
      return data.text;
    } catch (error) {
      logger.error('Error parsing PDF buffer:', error);
      throw error;
    }
  }

  /**
   * Split text into small chunks suitable for 2GB VPS memory limit
   * and lightweight embedding models.
   */
  static async chunkText(text: string): Promise<string[]> {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500, // Small chunk to keep memory and context window safe
      chunkOverlap: 50,
    });
    
    const docs = await splitter.createDocuments([text]);
    return docs.map(d => d.pageContent);
  }
}
