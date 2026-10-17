export interface Lesson {
  conceptId: string;
  title: string;
  rule: string;
  why: string;
  commonSlip?: string;
  instead?: string;
  example: string;
}

export const LESSONS: Record<string, Lesson> = {
  'diff-squares': {
    conceptId: 'diff-squares',
    title: 'Difference of squares',
    rule: 'Rule: $a^2-b^2=(a-b)(a+b)$.',
    why: 'Why: expanding $(a-b)(a+b)$ gives $a^2+ab-ab-b^2$, and the middle terms cancel.',
    commonSlip: 'Common slip: $(a-b)^2$ is a different thing; it equals $a^2-2ab+b^2$.',
    example: 'Example: $x^2-81=(x-9)(x+9)$; check by expanding.',
  },
  cancel: {
    conceptId: 'cancel',
    title: 'Cancelling factors, not terms',
    rule: 'Rule: only factors (things that are multiplied) cancel, never pieces of a sum.',
    why: 'Why: in $\\dfrac{x+6}{6}$ the 6 on top is added to $x$, so it is not a factor of the top. Test with $x=6$: $\\dfrac{6+6}{6}=2$, but $x+1=7$. Instead: split the sum, $\\dfrac{x+6}{6}=\\dfrac{x}{6}+1$, or factor first.',
    example: 'Example: $\\dfrac{(x+2)(x+5)}{x+5}=x+2$, because $(x+5)$ is multiplied on top.',
  },
  domain: {
    conceptId: 'domain',
    title: 'Excluded values',
    rule: 'Rule: a fraction is undefined wherever its denominator is 0, even after you simplify.',
    why: 'Why: $\\dfrac{x^2-9}{x-3}$ and $x+3$ agree everywhere except $x=3$, where the first has $x-3=0$ underneath. Find excluded values from the ORIGINAL denominator, before cancelling.',
    example: 'Example: $\\dfrac{x^2-1}{x-1}$ simplifies to $x+1$ but is undefined at $x=1$.',
  },
};
