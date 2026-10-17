import { Request, Response, Router } from 'express';
import { ThinkingLevel } from '@google/genai';
import { ai, MODEL_ID } from './config';
import { rateLimitMiddleware } from './ratelimit';
import {
  InterpretRequestSchema,
  InterpretResponseSchema,
  TeachRequestSchema,
  TeachResponseSchema,
  SolveMathRequestSchema,
  SolveMathResponseSchema,
  PracticeCheckRequestSchema,
  PracticeCheckResponseSchema,
} from './schemas';
import {
  SYSTEM_PROMPT,
  INTERPRET_RESPONSE_SCHEMA,
  TEACH_RESPONSE_SCHEMA,
  buildInterpretPrompt,
  buildTeachPrompt,
  SOLVE_MATH_SYSTEM_PROMPT,
  SOLVE_MATH_RESPONSE_SCHEMA,
  PRACTICE_CHECK_SYSTEM_PROMPT,
  PRACTICE_CHECK_RESPONSE_SCHEMA,
  buildSolveMathPrompt,
  buildPracticeCheckPrompt,
} from './prompts';

const router = Router();

// Apply rate limiting middleware to all /api routes
router.use(rateLimitMiddleware);

const TIMEOUT_MS = 12000;

async function executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('REQUEST_TIMEOUT'));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer!);
  });
}

// POST /api/interpret
router.post('/interpret', async (req: Request, res: Response): Promise<void> => {
  // 1. Validate request body with Zod
  const parseResult = InterpretRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: 'validation_error',
      issues: parseResult.error.issues,
      fallback: true,
    });
    return;
  }

  const validReq = parseResult.data;
  const prompt = buildInterpretPrompt(validReq);

  // Helper for single attempt
  const callModel = async () => {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: INTERPRET_RESPONSE_SCHEMA,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      },
    });

    const rawText = response.text?.trim() || '';
    const parsedJson = JSON.parse(rawText);
    return InterpretResponseSchema.parse(parsedJson);
  };

  try {
    let result;
    try {
      result = await executeWithTimeout(callModel(), TIMEOUT_MS);
    } catch {
      // Retry once on invalid JSON / schema failure / transient error
      result = await executeWithTimeout(callModel(), TIMEOUT_MS);
    }

    res.json({
      success: true,
      data: result,
      source: 'ai',
    });
  } catch (err: any) {
    // Graceful fallback for client
    res.json({
      success: false,
      fallback: true,
      error: err?.message === 'REQUEST_TIMEOUT' ? 'timeout' : 'ai_unavailable',
    });
  }
});

// POST /api/teach
router.post('/teach', async (req: Request, res: Response): Promise<void> => {
  // 1. Validate request body with Zod
  const parseResult = TeachRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: 'validation_error',
      issues: parseResult.error.issues,
      fallback: true,
    });
    return;
  }

  const validReq = parseResult.data;
  const prompt = buildTeachPrompt(validReq);

  const callModel = async () => {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: TEACH_RESPONSE_SCHEMA,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      },
    });

    const rawText = response.text?.trim() || '';
    const parsedJson = JSON.parse(rawText);
    return TeachResponseSchema.parse(parsedJson);
  };

  try {
    let result;
    try {
      result = await executeWithTimeout(callModel(), TIMEOUT_MS);
    } catch {
      // Retry once on invalid output
      result = await executeWithTimeout(callModel(), TIMEOUT_MS);
    }

    res.json({
      success: true,
      data: result,
      source: 'ai',
    });
  } catch (err: any) {
    res.json({
      success: false,
      fallback: true,
      error: err?.message === 'REQUEST_TIMEOUT' ? 'timeout' : 'ai_unavailable',
    });
  }
});

const MATH_TIMEOUT_MS = 25000;

// POST /api/math/solve - Universal Math Problem Solver & Tutor
router.post('/math/solve', async (req: Request, res: Response): Promise<void> => {
  const parseResult = SolveMathRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: 'validation_error',
      issues: parseResult.error.issues,
      success: false,
    });
    return;
  }

  const validReq = parseResult.data;
  const prompt = buildSolveMathPrompt({
    problemText: validReq.problemText,
    mode: validReq.mode,
    studentAttempt: validReq.studentAttempt,
    hasImage: Boolean(validReq.imageData),
  });

  const callModel = async () => {
    let contents: any;
    if (validReq.imageData) {
      contents = {
        parts: [
          {
            inlineData: {
              mimeType: validReq.imageData.mimeType,
              data: validReq.imageData.base64,
            },
          },
          { text: prompt },
        ],
      };
    } else {
      contents = prompt;
    }

    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents,
      config: {
        systemInstruction: SOLVE_MATH_SYSTEM_PROMPT,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: SOLVE_MATH_RESPONSE_SCHEMA,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      },
    });

    const rawText = response.text?.trim() || '';
    const parsedJson = JSON.parse(rawText);
    return SolveMathResponseSchema.parse(parsedJson);
  };

  try {
    let result;
    try {
      result = await executeWithTimeout(callModel(), MATH_TIMEOUT_MS);
    } catch {
      // Retry once on failure
      result = await executeWithTimeout(callModel(), MATH_TIMEOUT_MS);
    }

    res.json({
      success: true,
      data: result,
      source: 'ai',
    });
  } catch (err: any) {
    console.error('Math solve error:', err);
    res.status(500).json({
      success: false,
      error: err?.message === 'REQUEST_TIMEOUT' ? 'timeout' : 'ai_unavailable',
      message: 'Mentora encountered an issue analyzing this problem. Please try rephrasing or submitting again.',
    });
  }
});

// POST /api/math/check-practice - Check a student answer to follow-up math practice
router.post('/math/check-practice', async (req: Request, res: Response): Promise<void> => {
  const parseResult = PracticeCheckRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: 'validation_error',
      issues: parseResult.error.issues,
      success: false,
    });
    return;
  }

  const validReq = parseResult.data;
  const prompt = buildPracticeCheckPrompt(validReq);

  const callModel = async () => {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
      config: {
        systemInstruction: PRACTICE_CHECK_SYSTEM_PROMPT,
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: PRACTICE_CHECK_RESPONSE_SCHEMA,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      },
    });

    const rawText = response.text?.trim() || '';
    const parsedJson = JSON.parse(rawText);
    return PracticeCheckResponseSchema.parse(parsedJson);
  };

  try {
    let result;
    try {
      result = await executeWithTimeout(callModel(), 15000);
    } catch {
      result = await executeWithTimeout(callModel(), 15000);
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message === 'REQUEST_TIMEOUT' ? 'timeout' : 'ai_unavailable',
    });
  }
});

export default router;

