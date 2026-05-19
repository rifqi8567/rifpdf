import { worker } from './worker/processor';
import { logger } from './config/logger';

logger.info(`🚀 Worker started successfully. Listening for jobs...`);

// Graceful shutdown handling
const shutdown = async () => {
  logger.info('Shutting down worker gracefully...');
  await worker.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
