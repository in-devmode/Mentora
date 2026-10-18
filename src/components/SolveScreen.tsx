import React, { useState, useRef, useEffect } from 'react';
import { NavBar } from './NavBar';
import { MathView } from './MathView';
import {
  Sparkles,
  ArrowRight,
  Upload,
  Image as ImageIcon,
  X,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  ChevronRight,
  HelpCircle,
  Compass,
  History,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { saveMathSolution, MathHistoryItem } from '../lib/history';

interface SolveScreenProps {
  onNavigate: (path: string) => void;
  initialProblem?: string;
  loadedHistoryItem?: MathHistoryItem | null;
}

export interface MathStep {
  stepNumber: number;
  title: string;
  latex: string;
  explanation: string;
  pitfall?: string;
}

export interface SolveResponseData {
  topic: string;
  subtopic: string;
  problemLatex: string;
  finalAnswerLatex: string;
  finalAnswerPlain: string;
  difficulty: string;
  concepts: string[];
  steps: MathStep[];
  keyFormulas: string[];
  alternativeMethod?: string;
  verification: string;
  practiceProblem: {
    problemText: string;
    expectedAnswer: string;
    hint: string;
  };
  studentAttemptDiagnosis?: {
    isCorrect: boolean;
    firstMistakeStep: number | null;
    analysis: string;
    slipType: string;
    constructiveFeedback: string;
  };
  guidedStep?: {
    currentStepNumber: number;
    totalStepsEstimated: number;
    prompt: string;
    guidanceQuestion: string;
    keyConceptHint: string;
  };
}

const SAMPLE_PROBLEMS = [
  {
    topic: 'Calculus',
    label: 'Limit with Indeterminate Form',
    text: '\\lim_{x \\to 0} \\frac{\\sin(3x)}{x}',
  },
  {
    topic: 'Calculus',
    label: 'Integration by Parts',
    text: '\\int x e^{2x} \\, dx',
  },
  {
    topic: 'Calculus',
    label: 'Derivative (Quotient Rule)',
    text: '\\frac{d}{dx} \\left( \\frac{\\ln x}{x^2} \\right)',
  },
  {
    topic: 'Algebra',
    label: 'Rational Expression Simplification',
    text: '\\frac{x^2 - 16}{x^2 - 8x + 16}',
  },
  {
    topic: 'Algebra',
    label: 'Cubic Polynomial Roots',
    text: 'x^3 - 4x^2 + x + 6 = 0',
  },
  {
    topic: 'Linear Algebra',
    label: 'Matrix Determinant',
    text: '\\det \\begin{pmatrix} 2 & 5 \\\\ 1 & 4 \\end{pmatrix}',
  },
  {
    topic: 'Trigonometry',
    label: 'Trig Equation on [0, 2π)',
    text: '\\sin(2\\theta) = \\cos(\\theta)',
  },
  {
    topic: 'Differential Eq',
    label: 'First-Order Linear ODE',
    text: '\\frac{dy}{dx} + 2y = e^{-x}, \\quad y(0) = 1',
  },
];

const SYMBOL_SHORTCUTS = [
  { label: 'a/b', insert: '\\frac{a}{b}', title: 'Fraction' },
  { label: 'x²', insert: '^{2}', title: 'Exponent' },
  { label: '√x', insert: '\\sqrt{x}', title: 'Square Root' },
  { label: 'lim', insert: '\\lim_{x \\to 0} ', title: 'Limit' },
  { label: '∫', insert: '\\int ', title: 'Integral' },
  { label: 'd/dx', insert: '\\frac{d}{dx}', title: 'Derivative' },
  { label: '∑', insert: '\\sum_{i=1}^{n}', title: 'Summation' },
  { label: 'π', insert: '\\pi', title: 'Pi' },
  { label: 'θ', insert: '\\theta', title: 'Theta' },
  { label: '∞', insert: '\\infty', title: 'Infinity' },
  { label: '±', insert: '\\pm', title: 'Plus-minus' },
  { label: '≤', insert: '\\leq', title: 'Less than or equal' },
  { label: '≥', insert: '\\geq', title: 'Greater than or equal' },
  { label: '≠', insert: '\\neq', title: 'Not equal' },
  { label: '×', insert: '\\times', title: 'Multiplication' },
  { label: 'matrix', insert: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', title: 'Matrix' },
];

export const SolveScreen: React.FC<SolveScreenProps> = ({
  onNavigate,
  initialProblem = '',
  loadedHistoryItem = null,
}) => {
  const { openHistoryModal } = useAuth();
  const [problemText, setProblemText] = useState(initialProblem);
  const [mode, setMode] = useState<'full_solution' | 'step_by_step_tutor' | 'check_student_attempt'>('full_solution');
  const [studentAttempt, setStudentAttempt] = useState('');
  const [imageData, setImageData] = useState<{ mimeType: string; base64: string } | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [solution, setSolution] = useState<SolveResponseData | null>(null);

  // If loaded from history, populate solution immediately
  useEffect(() => {
    if (loadedHistoryItem) {
      setProblemText(loadedHistoryItem.problemText);
      setMode(loadedHistoryItem.mode);
      setSolution({
        topic: loadedHistoryItem.topic,
        subtopic: loadedHistoryItem.subtopic,
        difficulty: loadedHistoryItem.difficulty,
        problemLatex: loadedHistoryItem.problemLatex,
        finalAnswerPlain: loadedHistoryItem.finalAnswerPlain,
        finalAnswerLatex: loadedHistoryItem.finalAnswerLatex,
        concepts: loadedHistoryItem.concepts,
        steps: loadedHistoryItem.steps,
        keyFormulas: [],
        verification: 'Loaded from your math solving history.',
        practiceProblem: {
          problemText: loadedHistoryItem.problemText,
          expectedAnswer: loadedHistoryItem.finalAnswerPlain,
          hint: 'Review the step-by-step walkthrough above.',
        },
      });
      setTimeout(() => {
        const el = document.getElementById('solution-output');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [loadedHistoryItem]);

  // Practice problem interactive checker state
  const [practiceAnswer, setPracticeAnswer] = useState('');
  const [practiceChecking, setPracticeChecking] = useState(false);
  const [practiceResult, setPracticeResult] = useState<{
    isCorrect: boolean;
    evaluation: string;
    correctAnswerLatex: string;
  } | null>(null);
  const [showPracticeHint, setShowPracticeHint] = useState(false);

  // Copy state
  const [copiedAnswer, setCopiedAnswer] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Insert symbol at cursor position in textarea
  const handleInsertSymbol = (symbolText: string) => {
    if (!textareaRef.current) {
      setProblemText((prev) => prev + symbolText);
      return;
    }
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const nextVal = problemText.substring(0, start) + symbolText + problemText.substring(end);
    setProblemText(nextVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + symbolText.length, start + symbolText.length);
    }, 10);
  };

  // Handle image upload
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result as string;
      const match = resultStr.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        setImageData({
          mimeType: match[1],
          base64: match[2],
        });
        setImagePreviewUrl(resultStr);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setImageData(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Solve problem
  const handleSolve = async () => {
    if (!problemText.trim() && !imageData) {
      setError('Please enter a math problem or upload an image of one.');
      return;
    }

    setLoading(true);
    setError(null);
    setPracticeResult(null);
    setPracticeAnswer('');
    setShowPracticeHint(false);

    try {
      const response = await fetch('/api/math/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemText: problemText.trim(),
          imageData: imageData || undefined,
          mode,
          studentAttempt: mode === 'check_student_attempt' ? studentAttempt.trim() : undefined,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message || json.error || 'Failed to solve problem');
      }

      setSolution(json.data);

      // Save to math solving history
      saveMathSolution({
        problemText: problemText.trim(),
        problemLatex: json.data.problemLatex || problemText.trim(),
        topic: json.data.topic || 'General Math',
        subtopic: json.data.subtopic || '',
        difficulty: json.data.difficulty || 'Intermediate',
        mode,
        finalAnswerPlain: json.data.finalAnswerPlain || '',
        finalAnswerLatex: json.data.finalAnswerLatex || '',
        steps: json.data.steps || [],
        concepts: json.data.concepts || [],
      }).catch((saveErr) => {
        console.warn('Could not save math solution to history:', saveErr);
      });

      // Smooth scroll to solution area
      setTimeout(() => {
        const el = document.getElementById('solution-output');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (err: any) {
      console.error('Solve error:', err);
      setError(
        err.message === 'timeout'
          ? 'The analysis took longer than expected. Please try a simpler problem or break it down into smaller parts.'
          : err.message || 'Unable to solve problem. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Check practice answer
  const handleCheckPractice = async () => {
    if (!solution || !practiceAnswer.trim()) return;

    setPracticeChecking(true);
    try {
      const response = await fetch('/api/math/check-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemText: solution.practiceProblem.problemText,
          expectedAnswer: solution.practiceProblem.expectedAnswer,
          studentAnswer: practiceAnswer.trim(),
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to check answer');
      }

      setPracticeResult(json.data);
    } catch (err: any) {
      console.error('Practice check error:', err);
      setError('Could not verify answer. Please check your connection.');
    } finally {
      setPracticeChecking(false);
    }
  };

  const handleCopyAnswer = () => {
    if (!solution) return;
    navigator.clipboard.writeText(solution.finalAnswerLatex);
    setCopiedAnswer(true);
    setTimeout(() => setCopiedAnswer(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#16181D] flex flex-col justify-between selection:bg-[#E9EDF8]">
      <NavBar currentPath="/solve" onNavigate={onNavigate} />

      <main className="max-w-[1120px] mx-auto px-4 sm:px-6 py-8 md:py-12 w-full flex-1">
        {/* Page Header */}
        <div className="mb-8 text-left space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-mono uppercase tracking-[0.08em] text-[#666B75]">
              Universal Math AI
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-[4px] bg-[#E9EDF8] text-[#27408B] font-medium">
              All Branches & Levels
            </span>
          </div>

          <h1 className="font-serif text-[32px] md:text-[40px] leading-[1.15] font-medium tracking-tight text-[#16181D]">
            Solve, understand, and master any math problem.
          </h1>

          <p className="text-[15px] text-[#4B505A] max-w-[70ch] leading-relaxed">
            Enter an equation, integral, matrix, word problem, or upload a photo.
            Mentora provides mathematically rigorous step-by-step solutions with intuitive conceptual rationale, common pitfall warnings, and follow-up practice.
          </p>
        </div>

        {/* Mode Selector Tabs & Past Solutions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#EFECE6] rounded-[8px] max-w-fit">
            <button
              type="button"
              onClick={() => setMode('full_solution')}
              className={`px-3 py-1.5 text-[13px] font-medium rounded-[6px] transition-all cursor-pointer ${
                mode === 'full_solution'
                  ? 'bg-white text-[#16181D] shadow-xs'
                  : 'text-[#4B505A] hover:text-[#16181D]'
              }`}
            >
              Complete Step-by-Step
            </button>
            <button
              type="button"
              onClick={() => setMode('check_student_attempt')}
              className={`px-3 py-1.5 text-[13px] font-medium rounded-[6px] transition-all cursor-pointer ${
                mode === 'check_student_attempt'
                  ? 'bg-white text-[#16181D] shadow-xs'
                  : 'text-[#4B505A] hover:text-[#16181D]'
              }`}
            >
              Diagnose My Attempt (Find Slip)
            </button>
            <button
              type="button"
              onClick={() => setMode('step_by_step_tutor')}
              className={`px-3 py-1.5 text-[13px] font-medium rounded-[6px] transition-all cursor-pointer ${
                mode === 'step_by_step_tutor'
                  ? 'bg-white text-[#16181D] shadow-xs'
                  : 'text-[#4B505A] hover:text-[#16181D]'
              }`}
            >
              Socratic Guidance
            </button>
          </div>

          <button
            type="button"
            onClick={openHistoryModal}
            className="h-[36px] px-3.5 rounded-[6px] border border-[#E6E1D8] bg-white hover:bg-[#FAF8F4] text-[13px] font-medium text-[#16181D] inline-flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs"
            title="Open past math solving history"
          >
            <History className="w-4 h-4 text-[#27408B]" />
            <span>Past Solutions</span>
          </button>
        </div>

        {/* Input Card */}
        <div className="bg-white border border-[#E6E1D8] rounded-[10px] p-5 sm:p-6 shadow-xs text-left">
          {/* Symbol Quick Toolbar */}
          <div className="mb-3 flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[#E6E1D8]">
            <div className="text-[12px] font-medium text-[#666B75]">
              Quick Math Symbols:
            </div>
            <div className="flex items-center flex-wrap gap-1">
              {SYMBOL_SHORTCUTS.map((sym) => (
                <button
                  key={sym.label}
                  type="button"
                  title={sym.title}
                  onClick={() => handleInsertSymbol(sym.insert)}
                  className="px-2 py-1 text-[12px] font-mono bg-[#FAF8F4] hover:bg-[#E9EDF8] text-[#16181D] rounded-[4px] border border-[#E6E1D8] hover:border-[#27408B] transition-colors cursor-pointer"
                >
                  {sym.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Textarea */}
          <div className="space-y-3">
            <label className="block text-[13px] font-medium text-[#16181D]">
              Problem Statement / Expression / Equation
            </label>
            <textarea
              ref={textareaRef}
              rows={3}
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              placeholder="e.g. \lim_{x \to 0} \frac{\sin(3x)}{x} or Factor x^3 - 4x^2 + x + 6 or integrate x*e^(2x)"
              className="w-full p-3.5 rounded-[6px] border border-[#E6E1D8] bg-[#FAF8F4] font-mono text-[15px] text-[#16181D] placeholder:text-[#9A9EA6] focus:outline-none focus:border-[#27408B] focus:ring-1 focus:ring-[#27408B] transition-all"
            />

            {/* Live KaTeX Preview if mathematical markup is present */}
            {problemText.trim() && (
              <div className="p-3 bg-[#FAF8F4] rounded-[6px] border border-[#E6E1D8] text-left">
                <span className="text-[11px] font-mono text-[#666B75] uppercase block mb-1">
                  Live Preview:
                </span>
                <div className="text-[17px] text-[#16181D] overflow-x-auto py-1">
                  <MathView content={problemText} displayMode={true} />
                </div>
              </div>
            )}
          </div>

          {/* Optional: Student Attempt input if mode is check_student_attempt */}
          {mode === 'check_student_attempt' && (
            <div className="mt-4 pt-4 border-t border-[#E6E1D8] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-medium text-[#16181D] flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-[#27408B]" />
                  Your Working / Solution Steps
                </label>
                <span className="text-[12px] text-[#666B75]">
                  Mentora will pinpoint where the first slip occurred
                </span>
              </div>
              <textarea
                rows={3}
                value={studentAttempt}
                onChange={(e) => setStudentAttempt(e.target.value)}
                placeholder="Paste or write your steps, e.g.:
Step 1: x^2 - 16 = (x - 4)(x - 4)
Step 2: Cancel out (x - 4)..."
                className="w-full p-3 rounded-[6px] border border-[#E6E1D8] bg-[#FAF8F4] font-mono text-[14px] text-[#16181D] placeholder:text-[#9A9EA6] focus:outline-none focus:border-[#27408B] focus:ring-1 focus:ring-[#27408B]"
              />
            </div>
          )}

          {/* Image Upload Area */}
          <div className="mt-4 pt-4 border-t border-[#E6E1D8] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImageFile(f);
                }}
                className="hidden"
                id="math-image-upload"
              />
              <label
                htmlFor="math-image-upload"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[6px] border border-[#E6E1D8] text-[13px] text-[#4B505A] hover:text-[#16181D] hover:bg-[#FAF8F4] cursor-pointer transition-colors"
              >
                <Upload className="w-4 h-4 text-[#666B75]" />
                {imageData ? 'Change Image / Snapshot' : 'Upload photo of math problem'}
              </label>

              {imagePreviewUrl && (
                <div className="flex items-center gap-2 px-2.5 py-1 bg-[#FAF8F4] rounded-[6px] border border-[#E6E1D8]">
                  <ImageIcon className="w-4 h-4 text-[#27408B]" />
                  <span className="text-[12px] text-[#16181D] font-medium truncate max-w-[160px]">
                    Attached Image
                  </span>
                  <button
                    type="button"
                    onClick={handleClearImage}
                    className="text-[#666B75] hover:text-[#A23B22] p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Submit Action */}
            <button
              type="button"
              disabled={loading}
              onClick={handleSolve}
              className="h-[42px] px-6 rounded-[6px] bg-[#16181D] text-[#FAF8F4] text-[14px] font-medium hover:bg-[#2C313A] disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#27408B]"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#FAF8F4] border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing mathematically...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#E9EDF8]" />
                  <span>
                    {mode === 'check_student_attempt'
                      ? 'Diagnose My Solution'
                      : mode === 'step_by_step_tutor'
                      ? 'Start Guided Walkthrough'
                      : 'Solve with Full Steps'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-[#FCF3F0] text-[#A23B22] border border-[#F3C4B8] rounded-[6px] text-[13px] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Sample Problems Library */}
        <div className="mt-6 text-left">
          <div className="text-[12px] font-mono text-[#666B75] uppercase tracking-wide mb-2.5">
            Try a sample problem:
          </div>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_PROBLEMS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setProblemText(sample.text);
                  window.scrollTo({ top: 120, behavior: 'smooth' });
                }}
                className="group px-3 py-1.5 bg-white border border-[#E6E1D8] hover:border-[#16181D] rounded-[6px] text-left transition-colors cursor-pointer"
              >
                <span className="text-[11px] text-[#666B75] block leading-none mb-1">
                  {sample.topic} · {sample.label}
                </span>
                <span className="text-[13px] font-mono text-[#16181D] group-hover:text-[#27408B]">
                  ${sample.text}$
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* SOLUTION OUTPUT SECTION */}
        {solution && (
          <div id="solution-output" className="mt-12 space-y-6 text-left">
            {/* Header Metadata */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E6E1D8]">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-[4px] bg-[#E9EDF8] text-[#27408B] font-mono text-[12px] font-medium">
                  {solution.topic} · {solution.subtopic}
                </span>
                <span className="px-2.5 py-1 rounded-[4px] bg-[#FAF8F4] border border-[#E6E1D8] text-[#4B505A] text-[12px]">
                  Difficulty: {solution.difficulty}
                </span>
              </div>

              {/* Concepts Badges */}
              <div className="flex items-center flex-wrap gap-1.5">
                {solution.concepts.map((concept, i) => (
                  <span
                    key={i}
                    className="text-[12px] text-[#4B505A] bg-white border border-[#E6E1D8] px-2 py-0.5 rounded-[4px]"
                  >
                    {concept}
                  </span>
                ))}
              </div>
            </div>

            {/* Student Attempt Diagnosis if evaluated */}
            {solution.studentAttemptDiagnosis && solution.studentAttemptDiagnosis.analysis !== 'N/A' && (
              <div
                className={`p-5 rounded-[8px] border text-left ${
                  solution.studentAttemptDiagnosis.isCorrect
                    ? 'bg-[#F2F7F2] border-[#C3DEC4] text-[#1D5E23]'
                    : 'bg-[#FCF5EB] border-[#F1DCC0] text-[#7C4910]'
                }`}
              >
                <div className="flex items-start gap-3">
                  {solution.studentAttemptDiagnosis.isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-[#2E7D32] shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-[#B26B1E] shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1.5 flex-1">
                    <div className="font-medium text-[15px]">
                      {solution.studentAttemptDiagnosis.isCorrect
                        ? 'Great work! Your solution is mathematically sound.'
                        : `Slip Diagnosed: ${solution.studentAttemptDiagnosis.slipType}`}
                    </div>
                    <p className="text-[14px] leading-relaxed text-[#16181D]">
                      {solution.studentAttemptDiagnosis.analysis}
                    </p>
                    {solution.studentAttemptDiagnosis.constructiveFeedback && (
                      <div className="text-[13px] text-[#4B505A] pt-1 border-t border-[#E6E1D8]/60 mt-2">
                        <strong>Mentora guidance: </strong>
                        {solution.studentAttemptDiagnosis.constructiveFeedback}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Guided Socratic Step if in step_by_step_tutor mode */}
            {solution.guidedStep && mode === 'step_by_step_tutor' && (
              <div className="p-5 rounded-[8px] border border-[#27408B] bg-[#E9EDF8]/50 text-left space-y-3">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-[#27408B]" />
                  <span className="text-[12px] font-mono uppercase tracking-wide text-[#27408B] font-semibold">
                    Guided Step {solution.guidedStep.currentStepNumber} of {solution.guidedStep.totalStepsEstimated}
                  </span>
                </div>
                <div className="font-serif text-[18px] text-[#16181D]">
                  {solution.guidedStep.prompt}
                </div>
                <div className="p-3 bg-white rounded-[6px] border border-[#E6E1D8] text-[14px] text-[#4B505A]">
                  <strong>Question to test yourself: </strong>
                  {solution.guidedStep.guidanceQuestion}
                </div>
                <div className="text-[13px] text-[#666B75] flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-[#27408B]" />
                  <span>Key intuition: {solution.guidedStep.keyConceptHint}</span>
                </div>
              </div>
            )}

            {/* Problem Restatement */}
            <div className="bg-white border border-[#E6E1D8] rounded-[10px] p-5">
              <span className="text-[12px] font-mono text-[#666B75] uppercase block mb-2">
                Problem
              </span>
              <div className="font-serif text-[22px] md:text-[26px] text-[#16181D]">
                <MathView content={solution.problemLatex} displayMode={true} />
              </div>
            </div>

            {/* Prominent Final Answer Card */}
            <div className="bg-[#FAF8F4] border-2 border-[#16181D] rounded-[10px] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-[12px] font-mono uppercase tracking-wide text-[#666B75] block mb-1">
                  Definitive Answer
                </span>
                <div className="font-serif text-[24px] md:text-[30px] font-medium text-[#16181D]">
                  <MathView content={solution.finalAnswerLatex} displayMode={false} />
                </div>
                <p className="text-[13px] text-[#4B505A] mt-1">
                  {solution.finalAnswerPlain}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyAnswer}
                className="h-[36px] px-3.5 rounded-[6px] bg-white border border-[#E6E1D8] text-[13px] text-[#16181D] hover:bg-[#FAF8F4] transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {copiedAnswer ? (
                  <>
                    <Check className="w-4 h-4 text-[#2E7D32]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#666B75]" />
                    <span>Copy LaTeX</span>
                  </>
                )}
              </button>
            </div>

            {/* Step-by-Step Breakdown */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-[20px] font-medium text-[#16181D]">
                  Step-by-Step Mathematical Solution
                </h3>
                <span className="text-[12px] font-mono text-[#666B75]">
                  {solution.steps.length} {solution.steps.length === 1 ? 'step' : 'steps'}
                </span>
              </div>

              <div className="space-y-3">
                {solution.steps.map((st) => (
                  <div
                    key={st.stepNumber}
                    className="bg-white border border-[#E6E1D8] rounded-[8px] p-5 space-y-3 shadow-xs"
                  >
                    {/* Step Title Header */}
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#16181D] text-[#FAF8F4] text-[12px] font-mono font-medium flex items-center justify-center shrink-0">
                        {st.stepNumber}
                      </span>
                      <h4 className="font-medium text-[15px] text-[#16181D]">
                        {st.title}
                      </h4>
                    </div>

                    {/* Step Expression */}
                    <div className="p-3 bg-[#FAF8F4] rounded-[6px] border border-[#E6E1D8] text-[18px] text-[#16181D] overflow-x-auto">
                      <MathView content={st.latex} displayMode={true} />
                    </div>

                    {/* Step Explanation */}
                    <p className="text-[14px] text-[#4B505A] leading-relaxed">
                      {st.explanation}
                    </p>

                    {/* Common Pitfall Callout */}
                    {st.pitfall && (
                      <div className="p-3 rounded-[6px] bg-[#FCF8EE] border border-[#F3E2B8] text-[13px] text-[#664D03] flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-[#B26B1E] shrink-0 mt-0.5" />
                        <div>
                          <strong>Common slip to avoid: </strong>
                          {st.pitfall}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Key Formulas & Verification Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {solution.keyFormulas && solution.keyFormulas.length > 0 && (
                <div className="bg-white border border-[#E6E1D8] rounded-[8px] p-5 space-y-2">
                  <div className="text-[12px] font-mono uppercase text-[#666B75]">
                    Key Formulas / Theorems Used
                  </div>
                  <ul className="space-y-1.5 text-[14px] text-[#16181D]">
                    {solution.keyFormulas.map((form, i) => (
                      <li key={i} className="flex items-baseline gap-2">
                        <span className="text-[#27408B] font-bold">•</span>
                        <MathView content={form} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {solution.verification && (
                <div className="bg-white border border-[#E6E1D8] rounded-[8px] p-5 space-y-2">
                  <div className="text-[12px] font-mono uppercase text-[#666B75]">
                    How to Independently Verify
                  </div>
                  <p className="text-[13px] text-[#4B505A] leading-relaxed">
                    <MathView content={solution.verification} />
                  </p>
                </div>
              )}
            </div>

            {/* Alternative Method if available */}
            {solution.alternativeMethod && (
              <div className="bg-white border border-[#E6E1D8] rounded-[8px] p-4 text-[13px] text-[#4B505A]">
                <strong className="text-[#16181D]">Alternative Approach: </strong>
                <MathView content={solution.alternativeMethod} />
              </div>
            )}

            {/* INTERACTIVE PRACTICE PROBLEM */}
            {solution.practiceProblem && (
              <div className="mt-8 bg-white border-2 border-[#E6E1D8] rounded-[10px] p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E6E1D8]">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#27408B]" />
                    <span className="font-serif text-[18px] font-medium text-[#16181D]">
                      Test Your Understanding (Fresh Practice)
                    </span>
                  </div>
                  <span className="text-[12px] text-[#666B75] font-mono">
                    Similar Concept
                  </span>
                </div>

                <div className="font-serif text-[18px] text-[#16181D] py-1">
                  <MathView content={solution.practiceProblem.problemText} displayMode={true} />
                </div>

                {/* Practice input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-medium text-[#16181D]">
                      Your Answer:
                    </label>
                    {solution.practiceProblem.hint && (
                      <button
                        type="button"
                        onClick={() => setShowPracticeHint(!showPracticeHint)}
                        className="text-[12px] text-[#27408B] hover:underline cursor-pointer"
                      >
                        {showPracticeHint ? 'Hide Hint' : 'Need a hint?'}
                      </button>
                    )}
                  </div>

                  {showPracticeHint && (
                    <div className="p-3 bg-[#FAF8F4] border border-[#E6E1D8] rounded-[6px] text-[13px] text-[#4B505A]">
                      <strong>Hint: </strong> {solution.practiceProblem.hint}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={practiceAnswer}
                      onChange={(e) => setPracticeAnswer(e.target.value)}
                      placeholder="e.g. 3 or (x-2)/(x+4) or -1/2"
                      className="flex-1 px-3.5 py-2 font-mono text-[14px] bg-[#FAF8F4] border border-[#E6E1D8] rounded-[6px] focus:outline-none focus:border-[#27408B]"
                    />
                    <button
                      type="button"
                      disabled={practiceChecking || !practiceAnswer.trim()}
                      onClick={handleCheckPractice}
                      className="px-4 py-2 bg-[#16181D] hover:bg-[#2C313A] disabled:opacity-50 text-white text-[13px] font-medium rounded-[6px] transition-colors cursor-pointer"
                    >
                      {practiceChecking ? 'Checking...' : 'Check Answer'}
                    </button>
                  </div>

                  {practiceAnswer.trim() && (
                    <div className="text-[13px] text-[#4B505A]">
                      Preview: <MathView content={practiceAnswer} />
                    </div>
                  )}
                </div>

                {/* Practice verification result */}
                {practiceResult && (
                  <div
                    className={`p-4 rounded-[6px] border ${
                      practiceResult.isCorrect
                        ? 'bg-[#F2F7F2] border-[#C3DEC4] text-[#1D5E23]'
                        : 'bg-[#FCF5EB] border-[#F1DCC0] text-[#7C4910]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {practiceResult.isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-[#2E7D32] shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-[#B26B1E] shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1">
                        <div className="font-medium text-[14px]">
                          {practiceResult.isCorrect ? 'Correct! Concept demonstrated.' : 'Not quite yet.'}
                        </div>
                        <p className="text-[13px] leading-relaxed text-[#16181D]">
                          <MathView content={practiceResult.evaluation} />
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E6E1D8] py-8 text-[13px] text-[#666B75] mt-16">
        <div className="max-w-[1120px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-left">
            Mentora Universal Math Engine. Powered by Gemini 3.8 Flash with step-by-step mathematical reasoning.
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="text-[#666B75] hover:text-[#16181D] underline underline-offset-2 transition-colors cursor-pointer"
            >
              Back to Overview
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/check')}
              className="text-[#666B75] hover:text-[#16181D] underline underline-offset-2 transition-colors cursor-pointer"
            >
              Diagnostic Path
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
