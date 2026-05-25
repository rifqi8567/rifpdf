import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  REDIS_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_REFERER: z.string().url().optional(),
  OPENROUTER_FALLBACK_MODEL: z.string().default('openrouter/free'),
  AI_PROVIDER: z.enum(['openrouter', 'ollama']).default('ollama'),
  OLLAMA_HOST: z.string().url().default('http://host.docker.internal:11434'),
  OLLAMA_CHAT_MODEL: z.string().default('llama3.1:8b'),
  OLLAMA_EMBED_MODEL: z.string().default('nomic-embed-text'),
  CLEANUP_RETENTION_HOURS: z.coerce.number().int().positive().default(24),
  CLEANUP_BATCH_SIZE: z.coerce.number().int().positive().max(500).default(100),
  TMP_CLEANUP_DIR: z.string().default('/tmp/documind'),
  CONVERSION_SERVICE_URL: z.string().url().default('http://conversion-api:8000'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  process.exit(1);
}

export const env = _env.data;
