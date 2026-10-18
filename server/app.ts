import express, { Request, Response } from 'express';
import apiRouter from './routes';

export const app = express();

// Global CORS & preflight support
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (_req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health / status endpoint (accessible at /api/health, /health, and /api)
const healthHandler = (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'Mentora',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
};

app.get('/api/health', healthHandler);
app.get('/health', healthHandler);
app.get('/api', healthHandler);

// Mount API routes under /api AND / to support both root and prefixed deployments
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
