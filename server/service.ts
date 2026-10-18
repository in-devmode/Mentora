import { generateGeminiContent, MODEL_ID, FALLBACK_MODEL_ID } from './geminiClient';
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

export interface ServiceResult {
  status: number;
  body: any;
}

const TIMEOUT_MS = 12000;
const MATH_TIMEOUT_MS = 14000;

export function handleHealth(): ServiceResult {
  return {
    status: 200,
    body: {
      status: 'ok',
      app: 'Mentora',
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      time: new Date().toISOString(),
    },
  };
}

export async function handleInterpret(body: any): Promise<ServiceResult> {
  const parseResult = InterpretRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return {
      status: 400,
      body: {
        error: 'validation_error',
        issues: parseResult.error.issues,
        fallback: true,
      },
    };
  }

  const validReq = parseResult.data;
  const prompt = buildInterpretPrompt(validReq);

  const callModel = async (modelName: string) => {
    const rawText = await generateGeminiContent({
      model: modelName,
      contents: prompt,
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: INTERPRET_RESPONSE_SCHEMA,
      timeoutMs: TIMEOUT_MS,
    });
    const parsedJson = JSON.parse(rawText);
    return InterpretResponseSchema.parse(parsedJson);
  };

  try {
    let result;
    try {
      result = await callModel(MODEL_ID);
    } catch {
      result = await callModel(FALLBACK_MODEL_ID);
    }

    return {
      status: 200,
      body: {
        success: true,
        data: result,
        source: 'ai',
      },
    };
  } catch (err: any) {
    return {
      status: 200,
      body: {
        success: false,
        fallback: true,
        error: err?.message === 'REQUEST_TIMEOUT' ? 'timeout' : 'ai_unavailable',
      },
    };
  }
}

export async function handleTeach(body: any): Promise<ServiceResult> {
  const parseResult = TeachRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return {
      status: 400,
      body: {
        error: 'validation_error',
        issues: parseResult.error.issues,
        fallback: true,
      },
    };
  }

  const validReq = parseResult.data;
  const prompt = buildTeachPrompt(validReq);

  const callModel = async (modelName: string) => {
    const rawText = await generateGeminiContent({
      model: modelName,
      contents: prompt,
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: TEACH_RESPONSE_SCHEMA,
      timeoutMs: TIMEOUT_MS,
    });
    const parsedJson = JSON.parse(rawText);
    return TeachResponseSchema.parse(parsedJson);
  };

  try {
    let result;
    try {
      result = await callModel(MODEL_ID);
    } catch {
      result = await callModel(FALLBACK_MODEL_ID);
    }

    return {
      status: 200,
      body: {
        success: true,
        data: result,
        source: 'ai',
      },
    };
  } catch (err: any) {
    return {
      status: 200,
      body: {
        success: false,
        fallback: true,
        error: err?.message === 'REQUEST_TIMEOUT' ? 'timeout' : 'ai_unavailable',
      },
    };
  }
}

export async function handleSolveMath(body: any): Promise<ServiceResult> {
  if (!process.env.GEMINI_API_KEY) {
    return {
      status: 503,
      body: {
        success: false,
        error: 'missing_gemini_api_key',
        message:
          'GEMINI_API_KEY is not configured in the server environment. On Vercel, please set GEMINI_API_KEY under Project Settings -> Environment Variables, then redeploy.',
      },
    };
  }

  const parseResult = SolveMathRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return {
      status: 400,
      body: {
        error: 'validation_error',
        issues: parseResult.error.issues,
        success: false,
      },
    };
  }

  const validReq = parseResult.data;
  const prompt = buildSolveMathPrompt({
    problemText: validReq.problemText,
    mode: validReq.mode,
    studentAttempt: validReq.studentAttempt,
    hasImage: Boolean(validReq.imageData),
  });

  const callModel = async (modelName: string) => {
    let contents: any;
    if (validReq.imageData) {
      contents = [
        {
          parts: [
            {
              inlineData: {
                mimeType: validReq.imageData.mimeType,
                data: validReq.imageData.base64,
              },
            },
            { text: prompt },
          ],
        },
      ];
    } else {
      contents = prompt;
    }

    const rawText = await generateGeminiContent({
      model: modelName,
      contents,
      systemInstruction: SOLVE_MATH_SYSTEM_PROMPT,
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: SOLVE_MATH_RESPONSE_SCHEMA,
      timeoutMs: MATH_TIMEOUT_MS,
    });

    const parsedJson = JSON.parse(rawText);
    return SolveMathResponseSchema.parse(parsedJson);
  };

  try {
    let result;
    try {
      result = await callModel(MODEL_ID);
    } catch (primaryErr) {
      console.warn('Primary model error, attempting fallback:', primaryErr);
      result = await callModel(FALLBACK_MODEL_ID);
    }

    return {
      status: 200,
      body: {
        success: true,
        data: result,
        source: 'ai',
      },
    };
  } catch (err: any) {
    console.error('Math solve error:', err);
    return {
      status: 500,
      body: {
        success: false,
        error: err?.message === 'REQUEST_TIMEOUT' ? 'timeout' : 'ai_unavailable',
        message:
          err?.message === 'REQUEST_TIMEOUT'
            ? 'Mentora took longer than expected to analyze this problem. Please try rephrasing or submitting again.'
            : 'Mentora encountered an issue analyzing this problem. Please try rephrasing or submitting again.',
      },
    };
  }
}

export async function handleCheckPractice(body: any): Promise<ServiceResult> {
  if (!process.env.GEMINI_API_KEY) {
    return {
      status: 503,
      body: {
        success: false,
        error: 'missing_gemini_api_key',
        message:
          'GEMINI_API_KEY is not configured in the server environment. On Vercel, please set GEMINI_API_KEY under Project Settings -> Environment Variables, then redeploy.',
      },
    };
  }

  const parseResult = PracticeCheckRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return {
      status: 400,
      body: {
        error: 'validation_error',
        issues: parseResult.error.issues,
        success: false,
      },
    };
  }

  const validReq = parseResult.data;
  const prompt = buildPracticeCheckPrompt(validReq);

  const callModel = async (modelName: string) => {
    const rawText = await generateGeminiContent({
      model: modelName,
      contents: prompt,
      systemInstruction: PRACTICE_CHECK_SYSTEM_PROMPT,
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: PRACTICE_CHECK_RESPONSE_SCHEMA,
      timeoutMs: 12000,
    });

    const parsedJson = JSON.parse(rawText);
    return PracticeCheckResponseSchema.parse(parsedJson);
  };

  try {
    let result;
    try {
      result = await callModel(MODEL_ID);
    } catch {
      result = await callModel(FALLBACK_MODEL_ID);
    }

    return {
      status: 200,
      body: {
        success: true,
        data: result,
      },
    };
  } catch (err: any) {
    return {
      status: 500,
      body: {
        success: false,
        error: err?.message === 'REQUEST_TIMEOUT' ? 'timeout' : 'ai_unavailable',
        message: 'Could not verify answer at this time. Please check your connection and try again.',
      },
    };
  }
}
