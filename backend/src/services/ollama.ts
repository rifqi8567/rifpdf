import fetch from 'node-fetch';
import { env } from '../config/env';
import { logger } from '../config/logger';

export class OllamaService {
  private static host = env.OLLAMA_HOST;

  static async generateEmbeddings(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.host}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: env.OLLAMA_EMBED_MODEL,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama embedding failed: ${response.statusText}`);
      }

      const data = await response.json() as any;
      return data.embedding;
    } catch (error) {
      logger.error('Failed to generate embeddings from Ollama:', error);
      throw error;
    }
  }

  static async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.host}/api/tags`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
