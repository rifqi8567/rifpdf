import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import 'express-async-errors'; // Catch async errors automatically
import { router } from './routes';
import chatRouter from './chat';
import summaryRouter from './summary';
import { logger } from '../config/logger';
import { initCronJobs } from '../jobs/cron';

export const app = express();

// 1. Strict Security Headers (Helmet)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https://*.supabase.co"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map((origin) => origin.trim()) : true,
}));
app.use(express.json({ limit: '10mb' })); // Limit payload to prevent memory exhaustion

// 2. Rate Limiting (Prevent DDoS & Abuse)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests, please try again later.' }
});

app.use('/api', apiLimiter, router);
app.use('/api/v1/chat', apiLimiter, chatRouter);
app.use('/api/v1', apiLimiter, summaryRouter);

// 3. Initialize Background Cron Jobs
initCronJobs();

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled Exception:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});
