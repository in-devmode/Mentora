import dotenv from 'dotenv';

dotenv.config();

export const MODEL_ID = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
export const FALLBACK_MODEL_ID = 'gemini-flash-latest';

interface GenerateContentOptions {
  model?: string;
  contents: any;
  systemInstruction?: string;
  temperature?: number;
  responseMimeType?: string;
  responseSchema?: any;
  timeoutMs?: number;
}

export async function generateGeminiContent(options: GenerateContentOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    throw new Error('MISSING_API_KEY');
  }

  const model = options.model || MODEL_ID;
  const timeoutMs = options.timeoutMs || 15000;

  // Format contents into the Gemini API structure
  let contentsPayload: any[];
  if (typeof options.contents === 'string') {
    contentsPayload = [{ parts: [{ text: options.contents }] }];
  } else if (Array.isArray(options.contents)) {
    contentsPayload = options.contents;
  } else if (options.contents && options.contents.parts) {
    contentsPayload = [options.contents];
  } else {
    contentsPayload = [{ parts: [{ text: String(options.contents) }] }];
  }

  const requestBody: any = {
    contents: contentsPayload,
  };

  if (options.systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: options.systemInstruction }],
    };
  }

  const generationConfig: any = {};
  if (typeof options.temperature === 'number') {
    generationConfig.temperature = options.temperature;
  }
  if (options.responseMimeType) {
    generationConfig.responseMimeType = options.responseMimeType;
  }
  if (options.responseSchema) {
    generationConfig.responseSchema = options.responseSchema;
  }

  if (Object.keys(generationConfig).length > 0) {
    requestBody.generationConfig = generationConfig;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'mentora-ai/1.0',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text();
      let parsedErr: any = null;
      try {
        parsedErr = JSON.parse(errText);
      } catch {
        // ignore
      }

      const errMsg = parsedErr?.error?.message || `HTTP ${response.status}: ${errText.slice(0, 200)}`;
      throw new Error(`GEMINI_API_ERROR: ${errMsg}`);
    }

    const data: any = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    if (!candidateText) {
      const finishReason = data?.candidates?.[0]?.finishReason;
      if (finishReason && finishReason !== 'STOP') {
        throw new Error(`GEMINI_FINISH_REASON: ${finishReason}`);
      }
      throw new Error('GEMINI_EMPTY_RESPONSE');
    }

    return candidateText;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error('REQUEST_TIMEOUT');
    }
    throw err;
  }
}
