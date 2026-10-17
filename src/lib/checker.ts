import { parse } from 'mathjs';
import { Question } from '../data/questions';

export interface CheckResult {
  valid: boolean; // if valid input or unparseable gibberish
  correct: boolean;
  message?: string;
  feedback?: string;
}

export function normalizeInput(input: string): string {
  let s = input.trim();
  // Replace unicode minus, en-dash, em-dash
  s = s.replace(/[\u2212\u2013\u2014]/g, '-');
  // Replace multiplication signs
  s = s.replace(/[\u00D7\u00B7\u2022]/g, '*');
  // Replace division sign
  s = s.replace(/[\u00F7]/g, '/');
  // Superscripts (e.g. x² -> x^2)
  const superscripts: Record<string, string> = {
    '⁰': '^0', '¹': '^1', '²': '^2', '³': '^3', '⁴': '^4',
    '⁵': '^5', '⁶': '^6', '⁷': '^7', '⁸': '^8', '⁹': '^9',
  };
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (m) => superscripts[m] || m);
  // Strip whitespace
  s = s.replace(/\s+/g, '');
  // Make implicit multiplication explicit:
  // e.g. ) ( -> )*(
  s = s.replace(/\)\(/g, ')*(');
  // e.g. 2x -> 2*x
  s = s.replace(/(\d)([a-zA-Z])/g, '$1*$2');
  // e.g. 2( -> 2*(
  s = s.replace(/(\d)\(/g, '$1*(');
  // e.g. x( -> x*(
  s = s.replace(/([a-zA-Z])\(/g, '$1*(');
  // e.g. )x -> )*x
  s = s.replace(/\)([a-zA-Z])/g, ')*$1');
  // e.g. )2 -> )*2
  s = s.replace(/\)(\d)/g, ')*$1');

  return s;
}

function containsSymbol(node: any, symbol: string): boolean {
  if (!node) return false;
  if (node.type === 'SymbolNode' && node.name === symbol) {
    return true;
  }
  if (node.content && containsSymbol(node.content, symbol)) {
    return true;
  }
  if (node.args) {
    return node.args.some((arg: any) => containsSymbol(arg, symbol));
  }
  return false;
}

function hasVariableInDenominator(node: any): boolean {
  let found = false;

  function traverse(n: any) {
    if (!n || found) return;
    if (n.type === 'OperatorNode' && n.op === '/') {
      const denom = n.args[1];
      if (containsSymbol(denom, 'x')) {
        found = true;
        return;
      }
    }
    if (n.content) {
      traverse(n.content);
    }
    if (n.args) {
      n.args.forEach(traverse);
    }
  }

  traverse(node);
  return found;
}

function unwrapParentheses(node: any): any {
  let curr = node;
  while (curr && curr.type === 'ParenthesisNode') {
    curr = curr.content;
  }
  return curr;
}

function getMultiplicativeFactors(node: any): any[] {
  const unwrapped = unwrapParentheses(node);
  if (unwrapped.type === 'OperatorNode' && unwrapped.op === '*') {
    return [
      ...getMultiplicativeFactors(unwrapped.args[0]),
      ...getMultiplicativeFactors(unwrapped.args[1]),
    ];
  }
  return [unwrapped];
}

function isFactorForm(node: any): boolean {
  const factors = getMultiplicativeFactors(node);
  const xFactors = factors.filter((f) => containsSymbol(f, 'x'));
  return xFactors.length >= 2;
}

function evaluateNumericEquality(
  userExpr: string,
  expectedExpr: string,
  excludedValues: number[] = []
): { equal: boolean; parseError?: boolean } {
  try {
    const userCompiled = parse(userExpr).compile();
    const expCompiled = parse(expectedExpr).compile();

    // Generate 15 candidate x values, filtering out excluded ones
    const testPoints: number[] = [];
    const baseCandidates = [
      -10.3, -5.7, -4.2, -1.8, 0.4, 1.2, 2.5, 3.8, 4.9, 6.1, 7.3, 8.6, 9.4, 11.2, 14.5,
    ];

    for (const val of baseCandidates) {
      const isExcluded = excludedValues.some((ex) => Math.abs(val - ex) < 0.05);
      if (!isExcluded) {
        testPoints.push(val);
      }
    }

    if (testPoints.length < 10) {
      testPoints.push(17.3, 21.1, 25.7);
    }

    let validChecks = 0;
    for (const x of testPoints) {
      try {
        const uVal = Number(userCompiled.evaluate({ x }));
        const eVal = Number(expCompiled.evaluate({ x }));

        if (!isFinite(uVal) || !isFinite(eVal) || isNaN(uVal) || isNaN(eVal)) {
          continue;
        }

        if (Math.abs(uVal - eVal) > 1e-9) {
          return { equal: false };
        }
        validChecks++;
      } catch {
        continue;
      }
    }

    return { equal: validChecks >= 8 };
  } catch {
    return { equal: false, parseError: true };
  }
}

export function checkAnswer(rawInput: string, question: Question): CheckResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      valid: false,
      correct: false,
      message: "Please enter an answer before checking.",
    };
  }

  // Type: Choice
  if (question.type === 'choice') {
    // If the input matches option ID (A, B, C, D)
    const normalizedChoice = trimmed.toUpperCase();
    if (question.options) {
      const validChoice = question.options.find(
        (opt) => opt.id.toUpperCase() === normalizedChoice
      );
      if (validChoice) {
        const isCorrect = validChoice.id.toUpperCase() === question.expectedAnswer.toUpperCase();
        return {
          valid: true,
          correct: isCorrect,
          feedback: isCorrect ? 'Correct.' : 'Let’s test one step of your reasoning.',
        };
      }
      // If user typed the option text directly, e.g. "Undefined"
      const matchedByText = question.options.find(
        (opt) => opt.text.replace(/[\$\\ ]/g, '').toLowerCase() === trimmed.replace(/[\$\\ ]/g, '').toLowerCase()
      );
      if (matchedByText) {
        const isCorrect = matchedByText.id.toUpperCase() === question.expectedAnswer.toUpperCase();
        return {
          valid: true,
          correct: isCorrect,
          feedback: isCorrect ? 'Correct.' : 'Let’s test one step of your reasoning.',
        };
      }
    }

    return {
      valid: false,
      correct: false,
      message: "Please choose one of the options (e.g. A, B, C, or D).",
    };
  }

  // Type: Number
  if (question.type === 'number') {
    const norm = normalizeInput(trimmed);
    try {
      const userNode = parse(norm);
      const userVal = Number(userNode.compile().evaluate());
      const expNode = parse(normalizeInput(question.expectedAnswer));
      const expVal = Number(expNode.compile().evaluate());

      if (isNaN(userVal) || !isFinite(userVal)) {
        return {
          valid: false,
          correct: false,
          message: "I couldn't read that as a number. Try something like 5 or -6.",
        };
      }

      const isCorrect = Math.abs(userVal - expVal) < 1e-9;
      return {
        valid: true,
        correct: isCorrect,
        feedback: isCorrect ? 'Correct.' : 'Let’s test one step of your reasoning.',
      };
    } catch {
      return {
        valid: false,
        correct: false,
        message: "I couldn't read that as a number. Try something like 5 or -6.",
      };
    }
  }

  // Type: Simplify or Factor
  const norm = normalizeInput(trimmed);
  let userNode: any;
  try {
    userNode = parse(norm);
  } catch {
    return {
      valid: false,
      correct: false,
      message: "I couldn't read that. Try something like x+3 or (x-4)(x+4).",
    };
  }

  const expectedNorm = normalizeInput(question.expectedAnswer);
  const equality = evaluateNumericEquality(norm, expectedNorm, question.excludedValues);

  if (equality.parseError) {
    return {
      valid: false,
      correct: false,
      message: "I couldn't read that. Try something like x+3 or (x-4)(x+4).",
    };
  }

  if (question.type === 'simplify') {
    if (equality.equal) {
      if (hasVariableInDenominator(userNode)) {
        return {
          valid: true,
          correct: false,
          message: "That's equal, but not simplified yet.",
        };
      }
      return {
        valid: true,
        correct: true,
        feedback: 'Correct.',
      };
    }
    return {
      valid: true,
      correct: false,
      feedback: 'Let’s test one step of your reasoning.',
    };
  }

  if (question.type === 'factor') {
    if (equality.equal) {
      if (!isFactorForm(userNode)) {
        return {
          valid: true,
          correct: false,
          message: "That's equal, but not factored yet.",
        };
      }
      return {
        valid: true,
        correct: true,
        feedback: 'Correct.',
      };
    }
    return {
      valid: true,
      correct: false,
      feedback: 'Let’s test one step of your reasoning.',
    };
  }

  return {
    valid: false,
    correct: false,
    message: "I couldn't read that. Try something like x+3 or (x-4)(x+4).",
  };
}
