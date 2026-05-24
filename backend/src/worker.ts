import { worker } from './worker/processor';
import { logger } from './config/logger';

logger.info(`🚀 Worker started successfully. Listening for jobs...`);

process.on('unhandledRejection', (reason) => {
  const error = reason as any;
  const payload = {
    errorName: error?.name,
    errorMessage: error?.message || String(reason),
    errorCode: error?.code,
    errorStack: error?.stack,
  };
  logger.error('Worker unhandled Promise Rejection:', payload);
  console.error('[Worker Unhandled Promise Rejection JSON]', JSON.stringify(payload));
});

process.on('uncaughtException', (error) => {
  const payload = {
    errorName: error?.name,
    errorMessage: error?.message,
    errorCode: (error as any)?.code,
    errorStack: error?.stack,
  };
  logger.error('Worker uncaught Exception:', payload);
  console.error('[Worker Uncaught Exception JSON]', JSON.stringify(payload));
});

// Graceful shutdown handling
const shutdown = async () => {
  logger.info('Shutting down worker gracefully...');
  await worker.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
