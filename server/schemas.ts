import { z } from 'zod';

export const KNOWN_QUESTION_IDS = [
  'ALG-01',
  'DX-01',
  'DX-02',
  'DX-03',
  'PR-01',
  'PR-02',
  'PR-03',
  'VER-01',
  'VER-02',
  'VER-03',
  'LIM-01',
  'LIM-02',
] as const;

export const KNOWN_HYPOTHESIS_TAGS = [
  'factorization',
  'cancellation',
  'domain_restriction',
] as const;

export const KNOWN_CONCEPT_IDS = [
  'squares',
  'gcf',
  'fractions',
  'diff-squares',
  'cancel',
  'domain',
  'simplify',
  'limit-notation',
  'limit-sub',
  'limit-factor',
] as const;

// Request schema for /api/interpret
export const InterpretRequestSchema = z.object({
  questionId: z.enum(KNOWN_QUESTION_IDS),
  questionText: z.string().max(1000),
  expectedAnswer: z.string().max(200),
  studentAnswer: z.string().max(600),
  studentExplanation: z.string().max(600).optional().default(''),
  allowedHypotheses: z.array(
    z.object({
      tag: z.enum(KNOWN_HYPOTHESIS_TAGS),
      definition: z.string().max(300),
    })
  ),
  ruledOutHypotheses: z.array(z.string()).default([]),
});

export type InterpretRequest = z.infer<typeof InterpretRequestSchema>;

// Model response schema for /api/interpret
export const InterpretResponseSchema = z.object({
  reasoning: z.enum(['sound', 'partial', 'misconception', 'unclear', 'not_given']),
  candidateMisconception: z.enum([
    'factorization',
    'cancellation',
    'domain_restriction',
    'none',
    'inconclusive',
  ]),
  confidence: z.enum(['low', 'medium', 'high']),
  evidence: z.array(z.string().max(120)).max(3),
  studentFacingMessage: z.string().max(280),
});

export type InterpretResponse = z.infer<typeof InterpretResponseSchema>;

// Request schema for /api/teach
export const TeachRequestSchema = z.object({
  conceptId: z.enum(KNOWN_CONCEPT_IDS),
  trustedLesson: z.object({
    title: z.string().max(200),
    rule: z.string().max(1000),
    why: z.string().max(1000),
    example: z.string().max(1000),
  }),
  evidence: z.array(z.string().max(300)).default([]),
  studentWrongAnswers: z.array(z.string().max(600)).default([]),
});

export type TeachRequest = z.infer<typeof TeachRequestSchema>;

// Model response schema for /api/teach
export const TeachResponseSchema = z.object({
  slipNote: z.string(),
  explanation: z.string(),
  analogy: z.string(),
});

export type TeachResponse = z.infer<typeof TeachResponseSchema>;

// Universal Math Solver Schemas
export const SolveMathRequestSchema = z.object({
  problemText: z.string().max(8000).default(''),
  imageData: z
    .object({
      mimeType: z.string(),
      base64: z.string(),
    })
    .optional(),
  mode: z
    .enum(['full_solution', 'step_by_step_tutor', 'check_student_attempt'])
    .default('full_solution'),
  studentAttempt: z.string().max(8000).optional().default(''),
});

export type SolveMathRequest = z.infer<typeof SolveMathRequestSchema>;

export const MathStepSchema = z.object({
  stepNumber: z.number(),
  title: z.string(),
  latex: z.string(),
  explanation: z.string(),
  pitfall: z.string().optional().default(''),
});

export type MathStep = z.infer<typeof MathStepSchema>;

export const SolveMathResponseSchema = z.object({
  topic: z.string(),
  subtopic: z.string(),
  problemLatex: z.string(),
  finalAnswerLatex: z.string(),
  finalAnswerPlain: z.string(),
  difficulty: z.string(),
  concepts: z.array(z.string()),
  steps: z.array(MathStepSchema),
  keyFormulas: z.array(z.string()).default([]),
  alternativeMethod: z.string().optional().default(''),
  verification: z.string(),
  practiceProblem: z.object({
    problemText: z.string(),
    expectedAnswer: z.string(),
    hint: z.string(),
  }),
  studentAttemptDiagnosis: z
    .object({
      isCorrect: z.boolean(),
      firstMistakeStep: z.number().nullable(),
      analysis: z.string(),
      slipType: z.string(),
      constructiveFeedback: z.string(),
    })
    .optional(),
  guidedStep: z
    .object({
      currentStepNumber: z.number(),
      totalStepsEstimated: z.number(),
      prompt: z.string(),
      guidanceQuestion: z.string(),
      keyConceptHint: z.string(),
    })
    .optional(),
});

export type SolveMathResponse = z.infer<typeof SolveMathResponseSchema>;

export const PracticeCheckRequestSchema = z.object({
  problemText: z.string().max(2000),
  expectedAnswer: z.string().max(1000),
  studentAnswer: z.string().max(1000),
});

export type PracticeCheckRequest = z.infer<typeof PracticeCheckRequestSchema>;

export const PracticeCheckResponseSchema = z.object({
  isCorrect: z.boolean(),
  evaluation: z.string(),
  simplifiedStudentAnswer: z.string(),
  correctAnswerLatex: z.string(),
});

export type PracticeCheckResponse = z.infer<typeof PracticeCheckResponseSchema>;

