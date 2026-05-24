import fetch from 'node-fetch';
import { env } from '../config/env';
import { logger } from '../config/logger';

export class OllamaService {
  private static host = env.OLLAMA_HOST;

  static async generateEmbeddings(text: string): Promise<number[]> {
    try {
      logger.debug('Requesting Ollama embedding', {
        host: this.host,
        model: env.OLLAMA_EMBED_MODEL,
        textLength: text.length,
      });

      const response = await fetch(`${this.host}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: env.OLLAMA_EMBED_MODEL,
          prompt: text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Ollama embedding failed (${response.status} ${response.statusText}): ${errorText}`);
      }

      const data = await response.json() as any;
      logger.debug('Ollama embedding generated', {
        model: env.OLLAMA_EMBED_MODEL,
        dimensions: data.embedding?.length ?? 0,
      });
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
