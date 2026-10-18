import { Request, Response, Router } from 'express';
import { rateLimitMiddleware } from './ratelimit';
import {
  handleHealth,
  handleInterpret,
  handleTeach,
  handleSolveMath,
  handleCheckPractice,
} from './service';

const router = Router();

// Apply rate limiting middleware to all /api routes
router.use(rateLimitMiddleware);

// GET /api/health
router.get('/health', (_req: Request, res: Response) => {
  const result = handleHealth();
  res.status(result.status).json(result.body);
});

// POST /api/interpret
router.post('/interpret', async (req: Request, res: Response): Promise<void> => {
  const result = await handleInterpret(req.body);
  res.status(result.status).json(result.body);
});

// POST /api/teach
router.post('/teach', async (req: Request, res: Response): Promise<void> => {
  const result = await handleTeach(req.body);
  res.status(result.status).json(result.body);
});

// POST /api/math/solve
router.post('/math/solve', async (req: Request, res: Response): Promise<void> => {
  const result = await handleSolveMath(req.body);
  res.status(result.status).json(result.body);
});

// POST /api/math/check-practice
router.post('/math/check-practice', async (req: Request, res: Response): Promise<void> => {
  const result = await handleCheckPractice(req.body);
  res.status(result.status).json(result.body);
});

export default router;
