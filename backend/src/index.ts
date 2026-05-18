import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { requireAuth } from './middleware/auth';
import chatRouter from './api/chat';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
const frontendUrl = process.env.FRONTEND_URL || '*';
app.use(cors({
  origin: frontendUrl === '*' ? '*' : [frontendUrl, 'http://localhost:5173', 'http://localhost:4173'],
  credentials: true
}));
app.use(express.json());

// Redis Connection
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Queues
const pdfQueue = new Queue('pdf-processing-queue', { connection: redisConnection });

// Public route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routers
app.use('/api/v1/chat', chatRouter);

// Protected route: PDF processing
app.post('/api/v1/documents/process', requireAuth, async (req, res) => {
  try {
    const { fileUrl, documentId } = req.body;
    
    // req.user is guaranteed to exist because of requireAuth
    const userId = req.user!.id;

    if (!fileUrl || !documentId) {
      return res.status(400).json({ error: 'Missing fileUrl or documentId' });
    }

    // Add job to BullMQ
    const job = await pdfQueue.add('process-pdf', {
      fileUrl,
      documentId,
      userId
    });

    res.json({ message: 'Job queued successfully', jobId: job.id });
  } catch (error) {
    console.error('Error queuing job:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 DocuMind API Gateway running on http://localhost:${PORT}`);
});
