import { app } from './api/server';
import { env } from './config/env';
import { logger } from './config/logger';

const PORT = env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`🚀 API Server running on port ${PORT} in ${env.NODE_ENV} mode`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});
