import winston from 'winston';
import { env } from './env';

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'documind-backend' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf((info) => {
          const { level, message, timestamp, stack, service, ...meta } = info;
          const metaText = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
          return `[${timestamp}] ${level}: ${message}${stack ? ` ${stack}` : ''}${metaText}`;
        })
      ),
    }),
  ],
});
