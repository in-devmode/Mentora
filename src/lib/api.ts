export interface InterpretOutput {
  reasoning: 'sound' | 'partial' | 'misconception' | 'unclear' | 'not_given';
  candidateMisconception: 'factorization' | 'cancellation' | 'domain_restriction' | 'none' | 'inconclusive';
  confidence: 'low' | 'medium' | 'high';
  evidence: string[];
  studentFacingMessage: string;
}

export interface TeachOutput {
  slipNote: string;
  explanation: string;
  analogy: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  fallback?: boolean;
  error?: string;
}

const CLIENT_TIMEOUT_MS = 12000;

export async function requestInterpret(payload: {
  questionId: string;
  questionText: string;
  expectedAnswer: string;
  studentAnswer: string;
  studentExplanation?: string;
  allowedHypotheses: { tag: 'factorization' | 'cancellation' | 'domain_restriction'; definition: string }[];
  ruledOutHypotheses: string[];
}): Promise<ApiResponse<InterpretOutput>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    const res = await fetch('/api/interpret', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 429) {
        return {
          success: false,
          fallback: true,
          error: 'rate_limited',
        };
      }
      return { success: false, fallback: true, error: `HTTP_${res.status}` };
    }

    const json = await res.json();
    return json;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { success: false, fallback: true, error: 'timeout' };
    }
    return { success: false, fallback: true, error: 'network_error' };
  }
}

export async function requestTeach(payload: {
  conceptId: string;
  trustedLesson: {
    title: string;
    rule: string;
    why: string;
    example: string;
  };
  evidence: string[];
  studentWrongAnswers: string[];
}): Promise<ApiResponse<TeachOutput>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    const res = await fetch('/api/teach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 429) {
        return {
          success: false,
          fallback: true,
          error: 'rate_limited',
        };
      }
      return { success: false, fallback: true, error: `HTTP_${res.status}` };
    }

    const json = await res.json();
    return json;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { success: false, fallback: true, error: 'timeout' };
    }
    return { success: false, fallback: true, error: 'network_error' };
  }
}
