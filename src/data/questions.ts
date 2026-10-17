import { HypothesisTag } from './concepts';

export type QuestionKind = 'anchor' | 'probe' | 'practice' | 'verify' | 'bridge';
export type QuestionType = 'simplify' | 'factor' | 'choice' | 'number';

export interface ChoiceOption {
  id: string; // 'A', 'B', 'C', 'D'
  text: string;
}

export interface Question {
  id: string;
  kind: QuestionKind;
  primaryConcept: string;
  alsoConcepts?: string[];
  hypothesisTag?: HypothesisTag;
  type: QuestionType;
  prompt: string;
  options?: ChoiceOption[];
  expectedAnswer: string;
  excludedValues?: number[];
  hint?: string;
  why: string;
}

export const QUESTIONS: Record<string, Question> = {
  'ALG-01': {
    id: 'ALG-01',
    kind: 'anchor',
    primaryConcept: 'simplify',
    alsoConcepts: ['diff-squares', 'cancel'],
    type: 'simplify',
    prompt: 'Simplify $\\dfrac{x^2-9}{x-3}$, where $x\\neq 3$.',
    expectedAnswer: 'x+3',
    excludedValues: [3],
    why: 'x²−9 = (x−3)(x+3), so the common factor (x−3) cancels, leaving x+3.',
  },
  'DX-01': {
    id: 'DX-01',
    kind: 'probe',
    hypothesisTag: 'factorization',
    primaryConcept: 'diff-squares',
    type: 'factor',
    prompt: 'Factor $x^2-16$.',
    expectedAnswer: '(x-4)(x+4)',
    why: 'a²−b² = (a−b)(a+b); here a = x and b = 4.',
  },
  'DX-02': {
    id: 'DX-02',
    kind: 'probe',
    hypothesisTag: 'cancellation',
    primaryConcept: 'cancel',
    type: 'choice',
    prompt: 'Which expression equals $\\dfrac{x+6}{6}$ for every value of $x$?',
    options: [
      { id: 'A', text: '$x+1$' },
      { id: 'B', text: '$\\dfrac{x}{6}+1$' },
      { id: 'C', text: '$x$' },
      { id: 'D', text: '$x+6$' },
    ],
    expectedAnswer: 'B',
    why: 'Only common factors cancel, not pieces of a sum. Split it instead: (x+6)/6 = x/6 + 1.',
  },
  'DX-03': {
    id: 'DX-03',
    kind: 'probe',
    hypothesisTag: 'domain_restriction',
    primaryConcept: 'domain',
    type: 'choice',
    prompt: 'The expression $\\dfrac{x^2-9}{x-3}$ simplifies to $x+3$. What is the value of the ORIGINAL expression at $x=3$?',
    options: [
      { id: 'A', text: '6' },
      { id: 'B', text: '0' },
      { id: 'C', text: 'Undefined' },
      { id: 'D', text: '3' },
    ],
    expectedAnswer: 'C',
    why: 'The original has denominator 0 at x=3, so it is undefined there. x+3 equals 6 at x=3, but the two expressions only agree when x≠3.',
  },
  'PR-01': {
    id: 'PR-01',
    kind: 'practice',
    hypothesisTag: 'factorization',
    primaryConcept: 'diff-squares',
    type: 'factor',
    prompt: 'Factor $x^2-25$.',
    expectedAnswer: '(x-5)(x+5)',
    hint: 'Same pattern as x²−16.',
    why: 'a = x, b = 5.',
  },
  'PR-02': {
    id: 'PR-02',
    kind: 'practice',
    hypothesisTag: 'cancellation',
    primaryConcept: 'cancel',
    type: 'simplify',
    prompt: 'Simplify $\\dfrac{(x+7)(x-1)}{x+7}$, where $x\\neq -7$.',
    expectedAnswer: 'x-1',
    excludedValues: [-7],
    hint: 'Which bracket is multiplied on top and stands alone below?',
    why: '(x+7) is a factor of the whole top, so it cancels.',
  },
  'PR-03': {
    id: 'PR-03',
    kind: 'practice',
    hypothesisTag: 'domain_restriction',
    primaryConcept: 'domain',
    type: 'number',
    prompt: 'For which value of $x$ is $\\dfrac{x^2-25}{x-5}$ undefined?',
    expectedAnswer: '5',
    hint: 'When is the denominator zero?',
    why: 'x−5 = 0 at x = 5.',
  },
  'VER-01': {
    id: 'VER-01',
    kind: 'verify',
    primaryConcept: 'simplify',
    alsoConcepts: ['diff-squares', 'cancel'],
    type: 'simplify',
    prompt: 'Simplify $\\dfrac{x^2-49}{x-7}$, where $x\\neq 7$.',
    expectedAnswer: 'x+7',
    excludedValues: [7],
    why: 'x²−49 = (x−7)(x+7); cancel (x−7).',
  },
  'VER-02': {
    id: 'VER-02',
    kind: 'verify',
    primaryConcept: 'simplify',
    alsoConcepts: ['diff-squares', 'cancel'],
    type: 'simplify',
    prompt: 'Simplify $\\dfrac{x^2-4}{x+2}$, where $x\\neq -2$.',
    expectedAnswer: 'x-2',
    excludedValues: [-2],
    why: 'x²−4 = (x−2)(x+2); cancel (x+2).',
  },
  'VER-03': {
    id: 'VER-03',
    kind: 'verify',
    primaryConcept: 'domain',
    type: 'number',
    prompt: 'For which value of $x$ is $\\dfrac{x^2-36}{x+6}$ undefined?',
    expectedAnswer: '-6',
    why: 'x+6 = 0 at x = −6.',
  },
  'LIM-01': {
    id: 'LIM-01',
    kind: 'bridge',
    primaryConcept: 'limit-sub',
    type: 'number',
    prompt: 'Evaluate $\\lim_{x\\to 2}(x^2+1)$.',
    expectedAnswer: '5',
    why: 'direct substitution gives 2²+1 = 5.',
  },
  'LIM-02': {
    id: 'LIM-02',
    kind: 'bridge',
    primaryConcept: 'limit-factor',
    alsoConcepts: ['simplify'],
    type: 'number',
    prompt: 'Evaluate $\\lim_{x\\to 3}\\dfrac{x^2-9}{x-3}$.',
    expectedAnswer: '6',
    why: 'Substitution gives 0/0. For x≠3 the expression equals x+3, which approaches 6 as x→3.',
  },
};
