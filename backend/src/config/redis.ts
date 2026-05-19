import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisConnection.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

redisConnection.on('connect', () => {
  logger.info('Connected to Redis successfully');
});
