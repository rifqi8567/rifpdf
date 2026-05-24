import { app } from './api/server';
import { env } from './config/env';
import { logger } from './config/logger';

const PORT = env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`🚀 API Server running on port ${PORT} in ${env.NODE_ENV} mode`);
});

process.on('unhandledRejection', (reason) => {
  const error = reason as any;
  const payload = {
    errorName: error?.name,
    errorMessage: error?.message || String(reason),
    errorCode: error?.code,
    errorStack: error?.stack,
  };
  logger.error('Unhandled Promise Rejection:', payload);
  console.error('[Unhandled Promise Rejection JSON]', JSON.stringify(payload));
});

process.on('uncaughtException', (error) => {
  const payload = {
    errorName: error?.name,
    errorMessage: error?.message,
    errorCode: (error as any)?.code,
    errorStack: error?.stack,
  };
  logger.error('Uncaught Exception:', payload);
  console.error('[Uncaught Exception JSON]', JSON.stringify(payload));
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});
