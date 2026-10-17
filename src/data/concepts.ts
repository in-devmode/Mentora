export interface Concept {
  id: string;
  title: string;
  prerequisites: string[];
}

export type HypothesisTag = 'factorization' | 'cancellation' | 'domain_restriction';

export const HYPOTHESIS_CONCEPT_MAP: Record<HypothesisTag, string> = {
  factorization: 'diff-squares',
  cancellation: 'cancel',
  domain_restriction: 'domain',
};

export const HYPOTHESIS_LABELS: Record<HypothesisTag, string> = {
  factorization: 'Factorization of difference of squares',
  cancellation: 'Cancelling terms instead of factors',
  domain_restriction: 'Excluded values in rational expressions',
};

export const CONCEPTS: Record<string, Concept> = {
  squares: {
    id: 'squares',
    title: 'Squares and perfect squares',
    prerequisites: [],
  },
  gcf: {
    id: 'gcf',
    title: 'Common factors',
    prerequisites: [],
  },
  fractions: {
    id: 'fractions',
    title: 'Simplifying number fractions',
    prerequisites: [],
  },
  'diff-squares': {
    id: 'diff-squares',
    title: 'Difference of squares',
    prerequisites: ['squares', 'gcf'],
  },
  cancel: {
    id: 'cancel',
    title: 'Cancelling factors, not terms',
    prerequisites: ['fractions'],
  },
  domain: {
    id: 'domain',
    title: 'Excluded values',
    prerequisites: [],
  },
  simplify: {
    id: 'simplify',
    title: 'Simplifying rational expressions',
    prerequisites: ['diff-squares', 'cancel', 'domain'],
  },
  'limit-notation': {
    id: 'limit-notation',
    title: 'Limit notation (x → a)',
    prerequisites: [],
  },
  'limit-sub': {
    id: 'limit-sub',
    title: 'Direct substitution and 0/0',
    prerequisites: ['limit-notation'],
  },
  'limit-factor': {
    id: 'limit-factor',
    title: 'Limits by factoring',
    prerequisites: ['simplify', 'limit-sub'],
  },
};
