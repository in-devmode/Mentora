import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MathView } from './MathView';
import { ConceptStatusChip, HypothesisStatusChip } from './StatusChip';
import { MentoraNote } from './MentoraNote';
import {
  SessionState,
  processAnswerSubmission,
  requestHint,
  proceedToPractice,
  proceedToVerify,
  serveOneMoreCheck,
  finishSession,
  recordExplanation,
  applyAiTeach,
  proceedToNextBridgeQuestion,
} from '../lib/engine';
import { checkAnswer } from '../lib/checker';
import { requestInterpret, requestTeach, InterpretOutput, TeachOutput } from '../lib/api';
import { QUESTIONS, Question } from '../data/questions';
import { LESSONS } from '../data/lessons';
import { HYPOTHESIS_LABELS, HypothesisTag } from '../data/concepts';
import { HelpCircle, Check, ArrowRight, RotateCcw } from 'lucide-react';

interface CheckScreenProps {
  session: SessionState;
  onUpdateSession: (updated: SessionState) => void;
  onNavigate: (path: string) => void;
  onNavigateHome: () => void;
  onReset: () => void;
}

export const CheckScreen: React.FC<CheckScreenProps> = ({
  session,
  onUpdateSession,
  onNavigate,
  onNavigateHome,
  onReset,
}) => {
  const [typedAnswer, setTypedAnswer] = useState('');
  const [explanationText, setExplanationText] = useState(
    session.initialExplanation || ''
  );
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [hintVisible, setHintVisible] = useState(false);

  // AI loading and error states
  const [isAiInFlight, setIsAiInFlight] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState<string | null>(null);
  const [isAiSlow, setIsAiSlow] = useState(false);
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);

  // Teach phase AI request state
  const [isTeachAiLoading, setIsTeachAiLoading] = useState(false);
  const [teachAiError, setTeachAiError] = useState<string | null>(null);

  // Active modal state & focus restoration refs
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const resetTriggerRef = useRef<HTMLButtonElement | null>(null);
  const modalConfirmBtnRef = useRef<HTMLButtonElement | null>(null);

  const slowTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPendingAnswerRef = useRef<string>('');

  const currentQuestion: Question = QUESTIONS[session.currentQuestionId] || QUESTIONS['ALG-01'];
  const isPractice = session.phase === 'practice';
  const isTeach = session.phase === 'teach';
  const isVerify = session.phase === 'verify';
  const isCompleted = session.phase === 'completed';
  const isFirstQuestion = session.currentQuestionId === 'ALG-01';

  // Sync state when question changes
  useEffect(() => {
    setTypedAnswer('');
    setSelectedOption('');
    setHintVisible(session.hintsUsed.includes(session.currentQuestionId));
    setIsAiInFlight(false);
    setAiStatusMessage(null);
    setIsAiSlow(false);
    setAiErrorMessage(null);
    if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
  }, [session.currentQuestionId]);

  // Live KaTeX preview of user typed answer
  const livePreview = useMemo(() => {
    const raw = typedAnswer.trim();
    if (!raw) return null;
    let previewStr = raw
      .replace(/\*/g, '\\cdot ')
      .replace(/\^2/g, '^{2}')
      .replace(/\^3/g, '^{3}')
      .replace(/²/, '^{2}')
      .replace(/³/, '^{3}');

    if (previewStr.includes('/') && !previewStr.includes('\\frac')) {
      const parts = previewStr.split('/');
      if (parts.length === 2 && parts[0] && parts[1]) {
        previewStr = `\\dfrac{${parts[0]}}{${parts[1]}}`;
      }
    }
    return `$${previewStr}$`;
  }, [typedAnswer]);

  // Execute AI Interpretation or fallback
  const performInterpretation = useCallback(
    async (currentSession: SessionState, finalAnswer: string, checkRes: any) => {
      setIsAiInFlight(true);
      setAiStatusMessage('Reading your working…');
      setIsAiSlow(false);
      setAiErrorMessage(null);

      // Start 12s slow timer
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      slowTimerRef.current = setTimeout(() => {
        setIsAiSlow(true);
      }, 12000);

      const ruledOut = (
        ['factorization', 'cancellation', 'domain_restriction'] as HypothesisTag[]
      ).filter((h) => currentSession.hypotheses[h].status === 'ruled_out');

      try {
        const res = await requestInterpret({
          questionId: currentQuestion.id,
          questionText: currentQuestion.prompt,
          expectedAnswer: currentQuestion.expectedAnswer,
          studentAnswer: finalAnswer,
          studentExplanation: explanationText.trim(),
          allowedHypotheses: [
            { tag: 'factorization', definition: 'Difference of squares factorization' },
            { tag: 'cancellation', definition: 'Cancelling factors instead of terms in rational expressions' },
            { tag: 'domain_restriction', definition: 'Excluded values and zero in denominator' },
          ],
          ruledOutHypotheses: ruledOut,
        });

        if (slowTimerRef.current) {
          clearTimeout(slowTimerRef.current);
          slowTimerRef.current = null;
        }

        setIsAiInFlight(false);
        setAiStatusMessage(null);
        setIsAiSlow(false);

        if (res.success && res.data) {
          const updated = processAnswerSubmission(
            currentSession,
            finalAnswer,
            checkRes,
            res.data
          );
          onUpdateSession(updated);
        } else {
          // Fallback to built-in deterministic text
          setAiErrorMessage(
            "Mentora couldn't reach the AI. Your answer is saved — continue with the built-in lessons or retry."
          );
          const updated = processAnswerSubmission(
            currentSession,
            finalAnswer,
            checkRes,
            null
          );
          onUpdateSession(updated);
        }
      } catch {
        if (slowTimerRef.current) {
          clearTimeout(slowTimerRef.current);
          slowTimerRef.current = null;
        }
        setIsAiInFlight(false);
        setAiStatusMessage(null);
        setIsAiSlow(false);
        setAiErrorMessage(
          "Mentora couldn't reach the AI. Your answer is saved — continue with the built-in lessons or retry."
        );
        const updated = processAnswerSubmission(
          currentSession,
          finalAnswer,
          checkRes,
          null
        );
        onUpdateSession(updated);
      }
    },
    [currentQuestion, explanationText, onUpdateSession]
  );

  const handleCheckAnswer = (answerToSubmit?: string) => {
    if (isAiInFlight) return;

    const finalAnswer =
      answerToSubmit ?? (currentQuestion.type === 'choice' ? selectedOption : typedAnswer);

    lastPendingAnswerRef.current = finalAnswer;

    // Record optional explanation on first question
    let currentSession = session;
    if (isFirstQuestion && explanationText.trim() && !session.initialExplanation) {
      currentSession = recordExplanation(session, explanationText.trim());
    }

    // Correctness is ALWAYS decided by the deterministic checker
    const checkRes = checkAnswer(finalAnswer, currentQuestion);

    // If answer is unparseable or equal-but-unsimplified, handle locally without AI
    if (!checkRes.valid || (checkRes.message && !checkRes.correct)) {
      const updated = processAnswerSubmission(currentSession, finalAnswer, checkRes, null);
      onUpdateSession(updated);
      return;
    }

    // JOB 1 Trigger:
    // When: the ANCHOR answer is wrong, OR the student wrote anything in "Explain your thinking"
    const isAnchor = currentQuestion.id === 'ALG-01';
    const hasExplanation = Boolean(explanationText.trim());
    const shouldCallInterpret = isAnchor && (!checkRes.correct || hasExplanation);

    if (shouldCallInterpret) {
      performInterpretation(currentSession, finalAnswer, checkRes);
    } else {
      const updated = processAnswerSubmission(currentSession, finalAnswer, checkRes, null);
      onUpdateSession(updated);
    }
  };

  const handleRetryAi = () => {
    if (!lastPendingAnswerRef.current) return;
    const finalAnswer = lastPendingAnswerRef.current;
    const checkRes = checkAnswer(finalAnswer, currentQuestion);
    performInterpretation(session, finalAnswer, checkRes);
  };

  // JOB 2 Trigger: /api/teach when entering Teach
  useEffect(() => {
    if (session.phase === 'teach' && !session.tailoredExplanation && !isTeachAiLoading) {
      const conceptId = session.activeGapConcept || 'diff-squares';
      const trusted = LESSONS[conceptId] || LESSONS['diff-squares'];

      // Gather evidence and wrong answers from events
      const evidence = session.events
        .filter((ev) => ev.type === 'hypothesis_updated' || ev.type === 'answer_submitted')
        .map((ev) => ev.note)
        .slice(-3);

      const wrongAnswers = session.events
        .filter((ev) => ev.type === 'answer_submitted' && ev.correct === false && ev.answer)
        .map((ev) => ev.answer as string);

      setIsTeachAiLoading(true);
      setTeachAiError(null);

      requestTeach({
        conceptId,
        trustedLesson: {
          title: trusted.title,
          rule: trusted.rule,
          why: trusted.why,
          example: trusted.example,
        },
        evidence,
        studentWrongAnswers: wrongAnswers,
      })
        .then((res) => {
          setIsTeachAiLoading(false);
          if (res.success && res.data) {
            const updated = applyAiTeach(session, res.data);
            onUpdateSession(updated);
          } else {
            setTeachAiError(
              "Mentora couldn't reach the AI. Your answer is saved — continue with the built-in lessons or retry."
            );
          }
        })
        .catch(() => {
          setIsTeachAiLoading(false);
          setTeachAiError(
            "Mentora couldn't reach the AI. Your answer is saved — continue with the built-in lessons or retry."
          );
        });
    }
  }, [
    session.phase,
    session.activeGapConcept,
    session.tailoredExplanation,
    isTeachAiLoading,
    session,
    onUpdateSession,
  ]);

  const handleHintClick = () => {
    setHintVisible(true);
    const updated = requestHint(session);
    onUpdateSession(updated);
  };

  const handleProceedToPractice = () => {
    const updated = proceedToPractice(session);
    onUpdateSession(updated);
  };

  const handleProceedToVerify = () => {
    const updated = proceedToVerify(session);
    onUpdateSession(updated);
  };

  const handleOneMoreCheck = () => {
    const updated = serveOneMoreCheck(session);
    onUpdateSession(updated);
  };

  const handleFinish = () => {
    const updated = finishSession(session);
    onUpdateSession(updated);
  };

  // Focus management when modal opens
  useEffect(() => {
    if (isResetModalOpen) {
      modalConfirmBtnRef.current?.focus();
    }
  }, [isResetModalOpen]);

  // Global keyboard shortcuts: Enter to submit, Esc to close modal or return
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. ESC: Close active modal or return to previous view
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isResetModalOpen) {
          setIsResetModalOpen(false);
          resetTriggerRef.current?.focus();
        } else {
          onNavigateHome();
        }
        return;
      }

      // 2. ENTER: Submit answer, advance step, or confirm modal
      if (e.key === 'Enter') {
        if (isResetModalOpen) {
          e.preventDefault();
          setIsResetModalOpen(false);
          onReset();
          return;
        }

        // Allow multiline enter in textarea unless modified
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag === 'textarea' && !e.metaKey && !e.ctrlKey) {
          return;
        }

        if (session.phase === 'teach') {
          e.preventDefault();
          handleProceedToPractice();
          return;
        }

        if (session.phase === 'completed') {
          e.preventDefault();
          onNavigate('/results');
          return;
        }

        // Submit answer during question phases
        if (!isAiInFlight) {
          e.preventDefault();
          handleCheckAnswer();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    isResetModalOpen,
    onNavigateHome,
    onReset,
    session.phase,
    isAiInFlight,
    typedAnswer,
    selectedOption,
    onNavigate,
  ]);

  // Steps definition for Stepper
  const steps: { key: SessionState['phase']; label: string; number: number }[] = [
    { key: 'attempt', label: 'Attempt', number: 1 },
    { key: 'investigate', label: 'Investigate', number: 2 },
    { key: 'teach', label: 'Teach', number: 3 },
    { key: 'practice', label: 'Practice', number: 4 },
    { key: 'verify', label: 'Verify', number: 5 },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === session.phase);
  const activeStepNumber = currentStepIndex >= 0 ? currentStepIndex + 1 : 5;
  const activeStepLabel = currentStepIndex >= 0 ? steps[currentStepIndex].label : 'Summary';

  const activeLesson = session.activeGapConcept
    ? LESSONS[session.activeGapConcept]
    : LESSONS['diff-squares'];

  const lastResult = session.lastCheckResult;
  const practiceAttemptsCount = session.practiceAttempts[currentQuestion.id] || 0;

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#16181D] flex flex-col justify-between selection:bg-[#E9EDF8]">
      {/* Top Header */}
      <header className="border-b border-[#E6E1D8] bg-[#FAF8F4] sticky top-0 z-20">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onNavigateHome}
              className="font-serif text-[20px] font-medium tracking-tight text-[#16181D] hover:opacity-80 transition-opacity cursor-pointer"
            >
              Mentora
            </button>
            <nav className="hidden sm:flex items-center gap-1 text-[13px] border-l border-[#E6E1D8] pl-3" aria-label="Quick Navigation">
              <button
                type="button"
                onClick={() => onNavigate('/map')}
                className="px-2.5 py-1 rounded-[4px] text-[#4B505A] hover:text-[#16181D] hover:bg-[#FAF8F4] transition-colors cursor-pointer"
              >
                Knowledge Map
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/results')}
                className="px-2.5 py-1 rounded-[4px] text-[#4B505A] hover:text-[#16181D] hover:bg-[#FAF8F4] transition-colors cursor-pointer"
              >
                Results
              </button>
            </nav>
          </div>

          {/* Stepper */}
          <div className="flex items-center text-[13px]">
            {/* Desktop Stepper */}
            <nav className="hidden md:flex items-center gap-2" aria-label="Check Progress">
              {steps.map((st, idx) => {
                const isCurrent = st.key === session.phase;
                const isPast =
                  currentStepIndex > idx || session.phase === 'completed';

                return (
                  <React.Fragment key={st.key}>
                    <span
                      className={`transition-colors ${
                        isCurrent
                          ? 'font-medium text-[#27408B]'
                          : isPast
                          ? 'text-[#4B505A]'
                          : 'text-[#666B75]/60'
                      }`}
                    >
                      {st.label}
                    </span>
                    {idx < steps.length - 1 && (
                      <span className="text-[#E6E1D8] select-none">·</span>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>

            {/* Mobile Stepper Label */}
            <div className="md:hidden text-[13px] font-medium text-[#27408B]">
              Step {activeStepNumber} of 5 · {activeStepLabel}
            </div>
          </div>
        </div>
      </header>

      {/* Main Two-Column Layout */}
      <main className="max-w-[1120px] mx-auto px-4 sm:px-6 py-8 md:py-12 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Column: Workspace */}
          <div className="lg:col-span-7 space-y-8 text-left">
            {/* Phase indicator banner */}
            <div className="flex items-center justify-between text-[12px] font-mono text-[#666B75] border-b border-[#E6E1D8] pb-2">
              <span className="uppercase tracking-wider">
                {session.phase.toUpperCase()} · {currentQuestion.id}
              </span>
              <span>{currentQuestion.primaryConcept}</span>
            </div>

            {/* Completed state summary view */}
            {isCompleted ? (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-[28px] font-medium text-[#16181D] mb-2">
                    Learning check completed
                  </h2>
                  <p className="text-[15px] text-[#4B505A] leading-relaxed max-w-[55ch]">
                    You solved the verification check independently. Here is the current status of each prerequisite concept assessed during this session:
                  </p>
                </div>

                <div className="rounded-[10px] border border-[#E6E1D8] bg-[#FFFFFF] p-6 space-y-4">
                  <div className="text-[13px] font-mono text-[#666B75] uppercase tracking-wide border-b border-[#E6E1D8] pb-2">
                    Concept assessment summary
                  </div>
                  <div className="space-y-3">
                    {['diff-squares', 'cancel', 'domain', 'simplify'].map((cId) => {
                      const c = session.concepts[cId];
                      if (!c) return null;
                      return (
                        <div
                          key={cId}
                          className="flex items-center justify-between py-2 border-b border-[#E6E1D8]/60 last:border-b-0"
                        >
                          <div>
                            <div className="text-[14px] font-medium text-[#16181D]">
                              {c.title}
                            </div>
                            <div className="text-[12px] text-[#666B75]">
                              {c.independentCorrectCount} independent correct{' '}
                              {c.independentCorrectCount === 1 ? 'answer' : 'answers'}
                            </div>
                          </div>
                          <ConceptStatusChip status={c.status} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <MentoraNote label="Mentora" source="builtin">
                  Remember: this is a diagnostic hypothesis based on today’s check, not an absolute evaluation. Concepts develop with deliberate practice over time.
                </MentoraNote>

                <div className="pt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigate('/results')}
                    className="h-[40px] px-5 rounded-[6px] bg-[#16181D] text-[#FAF8F4] text-[14px] font-medium hover:bg-[#2C313A] transition-colors cursor-pointer"
                  >
                    View Results
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('/map')}
                    className="h-[40px] px-4 rounded-[6px] border border-[#16181D] text-[14px] font-medium text-[#16181D] hover:bg-[#FAF8F4] transition-colors cursor-pointer"
                  >
                    Knowledge Map
                  </button>
                  <button
                    type="button"
                    onClick={onNavigateHome}
                    className="h-[40px] px-4 rounded-[6px] border border-[#E6E1D8] text-[14px] text-[#4B505A] hover:text-[#16181D] hover:bg-white transition-colors cursor-pointer"
                  >
                    Return to home
                  </button>
                  <button
                    type="button"
                    onClick={onReset}
                    className="h-[40px] px-4 rounded-[6px] border border-[#E6E1D8] text-[14px] text-[#4B505A] hover:text-[#16181D] hover:bg-white transition-colors cursor-pointer"
                  >
                    Start new check
                  </button>
                </div>
              </div>
            ) : isTeach ? (
              /* TEACH PHASE: Pre-authored Lesson Card + Tailored AI Explanation */
              <div className="space-y-6">
                <div>
                  <div className="text-[13px] font-medium uppercase tracking-wider text-[#666B75] mb-2">
                    Focused lesson
                  </div>
                  <h2 className="font-serif text-[26px] md:text-[30px] font-medium text-[#16181D]">
                    {activeLesson.title}
                  </h2>
                </div>

                {/* AI Tailored Explanation Card (Appears above the built-in lesson) */}
                {session.tailoredExplanation ? (
                  <div className="rounded-[10px] border border-[#27408B]/30 bg-[#E9EDF8]/20 p-6 space-y-4 text-left">
                    <div className="flex items-center justify-between border-b border-[#27408B]/15 pb-2">
                      <span className="font-mono text-[12px] uppercase tracking-wider text-[#27408B] font-medium">
                        Tailored explanation
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[3px] bg-[#27408B] text-white">
                        AI · Gemini
                      </span>
                    </div>

                    <div className="text-[14px] text-[#27408B] font-medium">
                      {session.tailoredExplanation.slipNote}
                    </div>

                    <div className="text-[15px] leading-relaxed text-[#16181D]">
                      <MathView content={session.tailoredExplanation.explanation} />
                    </div>

                    <div className="pt-2 border-t border-[#E6E1D8] text-[13px] text-[#4B505A] italic">
                      Analogy: {session.tailoredExplanation.analogy}
                    </div>
                  </div>
                ) : isTeachAiLoading ? (
                  <div className="rounded-[10px] border border-[#E6E1D8] bg-[#FFFFFF] p-5 text-left">
                    <div className="text-[13px] text-[#666B75] font-mono">
                      Reading your working…
                    </div>
                  </div>
                ) : teachAiError ? (
                  <MentoraNote label="Notice" source="builtin">
                    {teachAiError}
                  </MentoraNote>
                ) : null}

                {/* Built-in Lesson Card (Stays visible below tailored explanation) */}
                <div className="rounded-[10px] border border-[#E6E1D8] bg-[#FFFFFF] p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E6E1D8] pb-2">
                    <span className="text-[12px] font-mono uppercase tracking-wider text-[#666B75]">
                      Concept reference
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[3px] bg-[#EEECE7] text-[#5F646D]">
                      Built-in
                    </span>
                  </div>

                  <div className="text-[15px] leading-relaxed text-[#16181D]">
                    <MathView content={activeLesson.rule} />
                  </div>
                  <div className="text-[15px] leading-relaxed text-[#4B505A]">
                    <MathView content={activeLesson.why} />
                  </div>
                  {activeLesson.commonSlip && (
                    <div className="text-[14px] leading-relaxed text-[#8A5A00] bg-[#FBF0D5]/50 border border-[#8A5A00]/20 p-3 rounded-[6px]">
                      <MathView content={activeLesson.commonSlip} />
                    </div>
                  )}
                  {activeLesson.instead && (
                    <div className="text-[14px] leading-relaxed text-[#4B505A]">
                      <MathView content={activeLesson.instead} />
                    </div>
                  )}
                  <div className="pt-2 border-t border-[#E6E1D8] text-[14px] font-mono text-[#16181D]">
                    <MathView content={activeLesson.example} />
                  </div>
                </div>

                <MentoraNote label="Mentora" source="builtin">
                  We focus only on this specific principle. Once you’re ready, try a guided problem with a hint available.
                </MentoraNote>

                <div>
                  <button
                    type="button"
                    onClick={handleProceedToPractice}
                    className="h-[40px] px-6 rounded-[6px] bg-[#16181D] text-[#FAF8F4] text-[14px] font-medium hover:bg-[#2C313A] transition-colors focus-visible:outline-2 focus-visible:outline-[#27408B] inline-flex items-center gap-2"
                  >
                    <span>Try one with me</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* QUESTION WORKSPACE (Attempt, Investigate, Practice, Verify) */
              <div className="space-y-6">
                {/* Large Typeset Question */}
                <div className="space-y-2">
                  <div className="text-[13px] text-[#666B75] uppercase tracking-wide font-mono">
                    {currentQuestion.kind === 'anchor'
                      ? 'Initial Problem'
                      : currentQuestion.kind === 'probe'
                      ? 'Diagnostic Probe'
                      : currentQuestion.kind === 'practice'
                      ? 'Guided Practice'
                      : 'Independent Verification'}
                  </div>
                  <div className="font-serif text-[24px] md:text-[28px] font-medium text-[#16181D] leading-snug">
                    <MathView content={currentQuestion.prompt} />
                  </div>
                </div>

                {/* Multiple Choice Options if applicable */}
                {currentQuestion.type === 'choice' && currentQuestion.options && (
                  <div className="space-y-2 pt-2">
                    <div className="text-[13px] text-[#666B75] mb-2 font-medium">
                      Select your answer:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {currentQuestion.options.map((opt) => {
                        const isSelected = selectedOption === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={isAiInFlight}
                            onClick={() => {
                              setSelectedOption(opt.id);
                              setTypedAnswer(opt.id);
                            }}
                            className={`p-3.5 rounded-[6px] border text-left flex items-center gap-3 transition-colors ${
                              isSelected
                                ? 'border-[#27408B] bg-[#E9EDF8]/50 text-[#16181D]'
                                : 'border-[#E6E1D8] bg-[#FFFFFF] hover:border-[#16181D] text-[#16181D]'
                            } ${isAiInFlight ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            <span
                              className={`w-6 h-6 rounded-[4px] border flex items-center justify-center font-mono text-[13px] font-medium ${
                                isSelected
                                  ? 'border-[#27408B] bg-[#27408B] text-white'
                                  : 'border-[#E6E1D8] text-[#666B75]'
                              }`}
                            >
                              {opt.id}
                            </span>
                            <span className="text-[15px]">
                              <MathView content={opt.text} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Monospace Input Field (for non-choice or typed input) */}
                {currentQuestion.type !== 'choice' && (
                  <div className="space-y-3 pt-1">
                    <label
                      htmlFor="math-answer-input"
                      className="block text-[13px] font-medium text-[#4B505A]"
                    >
                      Your answer (use monospace math format)
                    </label>

                    <div className="relative">
                      <input
                        id="math-answer-input"
                        type="text"
                        disabled={isAiInFlight}
                        value={typedAnswer}
                        onChange={(e) => setTypedAnswer(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCheckAnswer();
                          }
                        }}
                        placeholder={
                          currentQuestion.type === 'factor'
                            ? 'e.g. (x-4)(x+4)'
                            : currentQuestion.type === 'simplify'
                            ? 'e.g. x+3'
                            : 'e.g. 5 or -6'
                        }
                        className="w-full h-[40px] px-3.5 rounded-[6px] border border-[#E6E1D8] bg-[#FFFFFF] font-mono text-[15px] text-[#16181D] placeholder:text-[#666B75]/50 focus:border-[#27408B] focus:ring-2 focus:ring-[#27408B] focus:outline-hidden transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Live KaTeX Preview */}
                    {livePreview && (
                      <div className="text-[13px] text-[#4B505A] flex items-center gap-2 bg-[#FAF8F4] border border-[#E6E1D8] px-3 py-2 rounded-[6px]">
                        <span className="text-[#666B75] font-mono text-[11px] uppercase">
                          KaTeX Preview:
                        </span>
                        <div className="text-[15px] font-medium text-[#16181D]">
                          <MathView content={livePreview} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Optional "Explain your thinking" textarea on the FIRST question only */}
                {isFirstQuestion && (
                  <div className="space-y-2 pt-2">
                    <label
                      htmlFor="explain-thinking"
                      className="block text-[13px] font-medium text-[#4B505A]"
                    >
                      Explain your thinking{' '}
                      <span className="text-[#666B75] font-normal">(optional)</span>
                    </label>
                    <textarea
                      id="explain-thinking"
                      rows={2}
                      disabled={isAiInFlight}
                      value={explanationText}
                      onChange={(e) => setExplanationText(e.target.value)}
                      placeholder="What was your first step or reasoning here?"
                      className="w-full p-3 rounded-[6px] border border-[#E6E1D8] bg-[#FFFFFF] text-[14px] text-[#16181D] placeholder:text-[#666B75]/50 focus:border-[#27408B] focus:ring-2 focus:ring-[#27408B] focus:outline-hidden transition-colors resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                )}

                {/* Buttons Row: Check answer, Hint */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    disabled={isAiInFlight}
                    onClick={() => handleCheckAnswer()}
                    className={`h-[40px] px-6 rounded-[6px] bg-[#16181D] text-[#FAF8F4] text-[14px] font-medium hover:bg-[#2C313A] transition-colors focus-visible:outline-2 focus-visible:outline-[#27408B] ${
                      isAiInFlight ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    Check answer
                  </button>

                  {/* Hint button only during Practice */}
                  {isPractice && currentQuestion.hint && (
                    <button
                      type="button"
                      disabled={isAiInFlight}
                      onClick={handleHintClick}
                      className="h-[40px] px-4 rounded-[6px] border border-[#E6E1D8] text-[14px] font-medium text-[#4B505A] hover:text-[#16181D] hover:bg-white transition-colors inline-flex items-center gap-1.5"
                    >
                      <HelpCircle className="w-4 h-4 text-[#666B75]" />
                      <span>{hintVisible ? 'Hint displayed' : 'Hint'}</span>
                    </button>
                  )}
                </div>

                {/* Inline Waiting / Slow line (No looping spinner) */}
                {isAiInFlight && (
                  <div className="pt-2 text-[13px] text-[#666B75] font-mono flex items-center gap-3">
                    <span>{aiStatusMessage || 'Reading your working…'}</span>
                    {isAiSlow && (
                      <span className="text-[#8A5A00] flex items-center gap-2">
                        <span>That’s taking longer than usual.</span>
                        <button
                          type="button"
                          onClick={handleRetryAi}
                          className="underline text-[#27408B] hover:text-[#16181D]"
                        >
                          Retry
                        </button>
                      </span>
                    )}
                  </div>
                )}

                {/* AI Error / Fallback Notice */}
                {aiErrorMessage && (
                  <div className="p-3 rounded-[6px] border border-[#E6E1D8] bg-[#FAF8F4] text-[13px] text-[#4B505A] flex items-center justify-between gap-3">
                    <span>{aiErrorMessage}</span>
                    <button
                      type="button"
                      onClick={handleRetryAi}
                      className="text-[#27408B] font-medium hover:underline shrink-0"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Display Hint if revealed */}
                {isPractice && hintVisible && currentQuestion.hint && (
                  <div className="p-3.5 rounded-[6px] bg-[#FBF0D5]/50 border border-[#8A5A00]/20 text-[14px] text-[#8A5A00] leading-relaxed">
                    <span className="font-medium mr-1.5">Hint:</span>
                    <MathView content={currentQuestion.hint} />
                  </div>
                )}

                {/* Verdict / Feedback Panel */}
                {lastResult && (
                  <div className="space-y-4 pt-2">
                    {/* Unparseable / gibberish message (does not count as attempt) */}
                    {!lastResult.valid && lastResult.message && (
                      <MentoraNote label="Notice" source={lastResult.source}>
                        {lastResult.message}
                      </MentoraNote>
                    )}

                    {/* Equal but not simplified or factored yet */}
                    {lastResult.valid && !lastResult.correct && lastResult.message && (
                      <MentoraNote label="Mentora" source={lastResult.source}>
                        {lastResult.message}
                      </MentoraNote>
                    )}

                    {/* Regular or AI-generated feedback */}
                    {lastResult.valid && !lastResult.correct && !lastResult.message && (
                      <MentoraNote label="Mentora" source={lastResult.source}>
                        {lastResult.feedback || 'Let’s test one step of your reasoning.'}
                      </MentoraNote>
                    )}

                    {/* Practice phase: retry count handling */}
                    {isPractice && !lastResult.correct && practiceAttemptsCount < 2 && (
                      <div className="text-[13px] text-[#4B505A]">
                        Not quite. You can give it another try (attempt {practiceAttemptsCount} of 2).
                      </div>
                    )}

                    {/* Practice phase: explanation revealed after 2 attempts */}
                    {isPractice && !lastResult.correct && practiceAttemptsCount >= 2 && (
                      <div className="space-y-3 p-4 rounded-[6px] border border-[#E6E1D8] bg-[#FFFFFF]">
                        <div className="text-[12px] font-mono uppercase text-[#666B75]">
                          Explanation
                        </div>
                        <div className="text-[14px] text-[#16181D] leading-relaxed">
                          <MathView content={currentQuestion.why} />
                        </div>
                        <button
                          type="button"
                          onClick={handleProceedToVerify}
                          className="h-[36px] px-4 rounded-[6px] bg-[#16181D] text-white text-[13px] font-medium hover:bg-[#2C313A] transition-colors inline-flex items-center gap-1.5"
                        >
                          <span>Move to verification</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Practice phase: Correct answer */}
                    {isPractice && lastResult.correct && (
                      <div className="space-y-3 p-4 rounded-[6px] border border-[#E1F1E8] bg-[#E1F1E8]/30">
                        <div className="flex items-center gap-2 text-[#1F6B47] text-[14px] font-medium">
                          <Check className="w-4 h-4 stroke-[2]" />
                          <span>Nice work with guided practice.</span>
                        </div>
                        <p className="text-[13px] text-[#4B505A]">
                          Let's check whether you can apply this on a fresh problem with no hints.
                        </p>
                        <button
                          type="button"
                          onClick={handleProceedToVerify}
                          className="h-[36px] px-4 rounded-[6px] bg-[#16181D] text-white text-[13px] font-medium hover:bg-[#2C313A] transition-colors inline-flex items-center gap-1.5"
                        >
                          <span>Continue to verification</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Verify phase: Success verdict and follow-up actions */}
                    {isVerify && lastResult.correct && (
                      <div className="space-y-4 p-5 rounded-[10px] border border-[#E1F1E8] bg-[#FFFFFF]">
                        <div className="flex items-center gap-2 text-[#1F6B47] text-[15px] font-medium">
                          <Check className="w-4 h-4 stroke-[2.5]" />
                          <span>You solved this check independently.</span>
                        </div>

                        <p className="text-[13px] text-[#4B505A] leading-relaxed">
                          Your answer to {currentQuestion.id} demonstrated the concept without hints.
                        </p>

                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          {currentQuestion.id === 'LIM-01' ? (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = proceedToNextBridgeQuestion(session);
                                onUpdateSession(updated);
                              }}
                              className="h-[38px] px-5 rounded-[6px] bg-[#16181D] text-[#FAF8F4] text-[13px] font-medium hover:bg-[#2C313A] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>Next limits problem (LIM-02)</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          ) : currentQuestion.id === 'LIM-02' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onNavigate('/results')}
                                className="h-[38px] px-5 rounded-[6px] bg-[#16181D] text-[#FAF8F4] text-[13px] font-medium hover:bg-[#2C313A] transition-colors cursor-pointer"
                              >
                                View Results
                              </button>
                              <button
                                type="button"
                                onClick={() => onNavigate('/map')}
                                className="h-[38px] px-4 rounded-[6px] border border-[#16181D] text-[13px] font-medium text-[#16181D] hover:bg-[#FAF8F4] transition-colors cursor-pointer"
                              >
                                View Knowledge Map
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={handleOneMoreCheck}
                                className="h-[38px] px-4 rounded-[6px] border border-[#16181D] text-[13px] font-medium text-[#16181D] hover:bg-[#FAF8F4] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>One more check</span>
                              </button>

                              <button
                                type="button"
                                onClick={handleFinish}
                                className="h-[38px] px-5 rounded-[6px] bg-[#16181D] text-[#FAF8F4] text-[13px] font-medium hover:bg-[#2C313A] transition-colors cursor-pointer"
                              >
                                Finish
                              </button>

                              <button
                                type="button"
                                onClick={() => onNavigate('/results')}
                                className="h-[38px] px-4 rounded-[6px] border border-[#E6E1D8] text-[13px] font-medium text-[#4B505A] hover:text-[#16181D] hover:bg-white transition-colors cursor-pointer"
                              >
                                View Results
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Investigation Notes (no card fill, 1px left rule) */}
          <div className="lg:col-span-5 lg:border-l lg:border-[#E6E1D8] lg:pl-8 space-y-8 text-left">
            {/* (a) Hypothesis Ledger */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#E6E1D8] pb-2">
                <h3 className="text-[13px] font-mono uppercase tracking-wider text-[#666B75]">
                  Hypothesis ledger
                </h3>
                <span className="text-[11px] text-[#666B75]">
                  3 tracked prerequisites
                </span>
              </div>

              <div className="space-y-4">
                {(['factorization', 'cancellation', 'domain_restriction'] as HypothesisTag[]).map(
                  (tag) => {
                    const hyp = session.hypotheses[tag];
                    const label = HYPOTHESIS_LABELS[tag];

                    return (
                      <div
                        key={tag}
                        className="py-2.5 border-b border-[#E6E1D8]/60 last:border-b-0 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[14px] font-medium text-[#16181D]">
                            {label}
                          </span>
                          <HypothesisStatusChip status={hyp.status} />
                        </div>
                        <p className="text-[13px] text-[#4B505A] leading-relaxed">
                          {hyp.evidence}
                        </p>
                      </div>
                    );
                  }
                )}
              </div>
            </section>

            {/* (b) Investigation Log */}
            <section className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-[#E6E1D8] pb-2">
                <h3 className="text-[13px] font-mono uppercase tracking-wider text-[#666B75]">
                  Event log
                </h3>
                <span className="text-[11px] font-mono text-[#666B75]">
                  {session.events.length} records
                </span>
              </div>

              <div
                className="max-h-[300px] overflow-y-auto space-y-2 pr-1 font-mono text-[12px] leading-relaxed text-[#4B505A] divide-y divide-[#E6E1D8]/40"
                tabIndex={0}
                aria-label="Timestamped Session Event Log"
              >
                {session.events
                  .slice()
                  .reverse()
                  .map((ev) => (
                    <div key={ev.id} className="pt-2 first:pt-0">
                      <span className="text-[#666B75] mr-2">[{ev.time}]</span>
                      <span className="text-[#16181D]">{ev.note}</span>
                    </div>
                  ))}
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E6E1D8] py-6 text-[13px] text-[#666B75]">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="max-w-[65ch] text-left">
            Prototype for algebra and introductory limits. Mentora tests hypotheses and can be wrong; it doesn't replace a teacher.
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onNavigateHome}
              className="text-[#666B75] hover:text-[#16181D] underline underline-offset-2 transition-colors cursor-pointer"
              title="Return to overview (Esc)"
            >
              Back to overview <span className="text-[11px] font-mono opacity-60">(Esc)</span>
            </button>
            <span className="text-[#E6E1D8]">·</span>
            <button
              ref={resetTriggerRef}
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="text-[#666B75] hover:text-[#16181D] underline underline-offset-2 transition-colors cursor-pointer"
            >
              Start over
            </button>
          </div>
        </div>
      </footer>

      {/* Accessible Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
        >
          <div className="bg-[#FFFFFF] rounded-[10px] border border-[#E6E1D8] shadow-lg max-w-[440px] w-full p-6 text-left space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-1.5">
              <h3 id="reset-modal-title" className="font-serif text-[20px] font-medium text-[#16181D]">
                Start over?
              </h3>
              <p className="text-[14px] text-[#4B505A] leading-relaxed">
                This will clear the current diagnostic check session and return to the overview. All session events and active hypotheses will be reset.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E6E1D8]">
              <button
                type="button"
                onClick={() => {
                  setIsResetModalOpen(false);
                  resetTriggerRef.current?.focus();
                }}
                className="px-4 py-2 text-[14px] font-medium text-[#4B505A] hover:text-[#16181D] rounded-[6px] hover:bg-[#FAF8F4] transition-colors cursor-pointer"
              >
                Cancel <span className="text-[11px] font-mono text-[#666B75]">(Esc)</span>
              </button>
              <button
                ref={modalConfirmBtnRef}
                type="button"
                onClick={() => {
                  setIsResetModalOpen(false);
                  onReset();
                }}
                className="px-4 py-2 text-[14px] font-medium bg-[#16181D] text-[#FAF8F4] rounded-[6px] hover:bg-[#2C313A] transition-colors cursor-pointer"
              >
                Yes, start over <span className="text-[11px] font-mono opacity-70">(Enter)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
