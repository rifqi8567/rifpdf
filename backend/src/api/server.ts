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

// Nginx runs in front of the API container and forwards the real client IP.
// express-rate-limit v8 validates this header and can throw a 500 unless
// Express is told to trust the reverse proxy.
app.set('trust proxy', 1);

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

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map((origin) => origin.trim()) : [])
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
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
  const requestId = req.headers['x-request-id'] || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  logger.error('Unhandled Exception:', {
    requestId,
    method: req.method,
    path: req.originalUrl,
    errorName: err?.name,
    errorCode: err?.code,
    errorMessage: err?.message,
    errorStack: err?.stack,
  });
  res.status(err?.status || 500).json({
    error: err?.message || 'Internal Server Error',
    code: err?.code,
    requestId,
  });
});
