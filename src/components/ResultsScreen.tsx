import React, { useState, useMemo } from 'react';
import { NavBar } from './NavBar';
import { ConceptStatusChip, HypothesisStatusChip } from './StatusChip';
import { MathView } from './MathView';
import { SessionState } from '../lib/engine';
import { QUESTIONS } from '../data/questions';
import { CONCEPTS, HYPOTHESIS_LABELS, HypothesisTag } from '../data/concepts';
import { Check, ArrowRight, RotateCcw } from 'lucide-react';

interface ResultsScreenProps {
  session: SessionState;
  onNavigate: (path: string) => void;
  onOneMoreCheck: () => void;
  onStartLimitsBridge: () => void;
  onReset: () => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  session,
  onNavigate,
  onOneMoreCheck,
  onStartLimitsBridge,
  onReset,
}) => {
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // 1. What we tested: answers submitted in order
  const testedQuestions = useMemo(() => {
    return session.events
      .filter((ev) => ev.type === 'answer_submitted' && ev.questionId)
      .map((ev) => {
        const q = QUESTIONS[ev.questionId!];
        return {
          event: ev,
          question: q,
        };
      });
  }, [session.events]);

  // 4. Recommendation for what to practice next
  const recommendation = useMemo(() => {
    // Check for Likely gap
    if (session.concepts['diff-squares']?.status === 'likely_gap') {
      return {
        conceptTitle: 'Difference of squares',
        text: 'Review factoring $a^2-b^2=(a-b)(a+b)$. Your diagnostic responses indicated difficulty with difference of squares factoring, which is essential for simplifying rational fractions.',
      };
    }
    if (session.concepts.cancel?.status === 'likely_gap') {
      return {
        conceptTitle: 'Cancelling factors, not terms',
        text: 'Focus on identifying factors versus terms. Remember that in rational expressions only common multipliers can cancel, never pieces of an added sum.',
      };
    }
    if (session.concepts.domain?.status === 'likely_gap') {
      return {
        conceptTitle: 'Excluded values & domain restrictions',
        text: 'Pay close attention to the original denominator before cancelling terms. Fractions are undefined wherever their denominator equals zero.',
      };
    }

    // Check for Developing
    const developingConcept = Object.values(session.concepts).find(
      (c) => c.status === 'developing'
    );
    if (developingConcept) {
      return {
        conceptTitle: developingConcept.title,
        text: `Developing — one more independent success is needed to call ${developingConcept.title} demonstrated.`,
      };
    }

    // If rational simplification is demonstrated
    if (session.concepts.simplify?.status === 'demonstrated') {
      return {
        conceptTitle: 'Introductory limits',
        text: 'Your algebra prerequisites are demonstrated independently. You are ready to connect these skills to introductory limits using the limits bridge.',
      };
    }

    return {
      conceptTitle: 'Simplifying rational expressions',
      text: 'Take another check problem to gather more independent diagnostic evidence.',
    };
  }, [session.concepts]);

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#16181D] flex flex-col justify-between selection:bg-[#E9EDF8]">
      <NavBar currentPath="/results" onNavigate={onNavigate} hasActiveSession={session.phase !== 'completed'} />

      <main className="max-w-[1120px] mx-auto px-4 sm:px-6 py-8 md:py-12 w-full flex-1">
        {/* Header */}
        <div className="text-left space-y-2 pb-6 border-b border-[#E6E1D8]">
          <h1 className="font-serif text-[32px] md:text-[36px] font-medium text-[#16181D] tracking-tight">
            Learning Check Results
          </h1>
          <p className="text-[15px] text-[#4B505A] max-w-[65ch]">
            Diagnostic findings from your session. Mentora forms hypotheses based on your responses to pinpoint prerequisites that need attention.
          </p>
        </div>

        {/* Action Buttons Row */}
        <div className="py-6 border-b border-[#E6E1D8] flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onOneMoreCheck}
            className="h-[40px] px-5 rounded-[6px] border border-[#16181D] bg-[#FFFFFF] text-[#16181D] text-[14px] font-medium hover:bg-[#FAF8F4] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>One more check</span>
          </button>

          <button
            type="button"
            onClick={onStartLimitsBridge}
            className="h-[40px] px-5 rounded-[6px] bg-[#16181D] text-white text-[14px] font-medium hover:bg-[#2C313A] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>Try the limits bridge</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowConfirmReset(true)}
            className="h-[40px] px-4 rounded-[6px] border border-[#E6E1D8] text-[14px] font-medium text-[#4B505A] hover:text-[#16181D] hover:bg-white transition-colors cursor-pointer ml-auto"
          >
            Start over
          </button>
        </div>

        {/* Four Plain Sections */}
        <div className="py-8 space-y-12 text-left">
          {/* Section 1: What we tested */}
          <section className="space-y-4">
            <div>
              <span className="text-[12px] font-mono uppercase tracking-wider text-[#666B75]">
                Section 01
              </span>
              <h2 className="font-serif text-[24px] font-medium text-[#16181D]">
                What we tested
              </h2>
            </div>

            {testedQuestions.length === 0 ? (
              <p className="text-[14px] text-[#666B75] italic">
                No problems attempted yet. Begin a check to view question history.
              </p>
            ) : (
              <div className="rounded-[10px] border border-[#E6E1D8] bg-[#FFFFFF] divide-y divide-[#E6E1D8]">
                {testedQuestions.map(({ event, question }, idx) => (
                  <div key={event.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5 max-w-[70ch]">
                      <div className="flex items-center gap-2 text-[12px] font-mono text-[#666B75]">
                        <span>#{idx + 1}</span>
                        <span>·</span>
                        <span className="uppercase">{question?.kind || 'Question'}</span>
                        <span>·</span>
                        <span>{question?.id}</span>
                      </div>
                      <div className="text-[16px] text-[#16181D]">
                        <MathView content={question?.prompt || ''} />
                      </div>
                      <div className="text-[13px] text-[#4B505A]">
                        Your answer: <span className="font-mono text-[#16181D]">{event.answer}</span>
                      </div>
                    </div>

                    <div className="self-start sm:self-center shrink-0">
                      {event.correct ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-[13px] font-medium bg-[#E1F1E8] text-[#1F6B47]">
                          <Check className="w-3.5 h-3.5 stroke-[2]" />
                          <span>Correct</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-[13px] font-medium bg-[#F9E4DD] text-[#A23B22]">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 2.5 L13.5 8 L8 13.5 L2.5 8 Z" />
                          </svg>
                          <span>Not yet</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section 2: What the evidence suggests */}
          <section className="space-y-4">
            <div>
              <span className="text-[12px] font-mono uppercase tracking-wider text-[#666B75]">
                Section 02
              </span>
              <h2 className="font-serif text-[24px] font-medium text-[#16181D]">
                What the evidence suggests
              </h2>
            </div>

            <div className="rounded-[10px] border border-[#E6E1D8] bg-[#FFFFFF] p-5 divide-y divide-[#E6E1D8]">
              {(['factorization', 'cancellation', 'domain_restriction'] as HypothesisTag[]).map(
                (tag) => {
                  const hyp = session.hypotheses[tag];
                  const label = HYPOTHESIS_LABELS[tag];

                  return (
                    <div key={tag} className="py-4 first:pt-0 last:pb-0 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-[15px] font-medium text-[#16181D]">
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

          {/* Section 3: What changed */}
          <section className="space-y-4">
            <div>
              <span className="text-[12px] font-mono uppercase tracking-wider text-[#666B75]">
                Section 03
              </span>
              <h2 className="font-serif text-[24px] font-medium text-[#16181D]">
                What changed
              </h2>
            </div>

            <div className="rounded-[10px] border border-[#E6E1D8] bg-[#FFFFFF] divide-y divide-[#E6E1D8]">
              {['diff-squares', 'cancel', 'domain', 'simplify', 'limit-sub', 'limit-factor'].map(
                (cId) => {
                  const cState = session.concepts[cId];
                  const cMeta = CONCEPTS[cId];
                  if (!cState || !cMeta) return null;

                  return (
                    <div
                      key={cId}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="text-[15px] font-medium text-[#16181D]">
                          {cMeta.title}
                        </div>
                        <div className="text-[13px] text-[#4B505A]">
                          {cState.independentCorrectCount === 1 ? (
                            <span className="text-[#8A5A00] font-medium">
                              Developing — one more independent success is needed to call it demonstrated.
                            </span>
                          ) : cState.independentCorrectCount >= 2 ? (
                            <span className="text-[#1F6B47]">
                              Demonstrated across multiple independent checks.
                            </span>
                          ) : cState.status === 'likely_gap' ? (
                            <span className="text-[#A23B22]">
                              Likely gap — targeted practice recommended.
                            </span>
                          ) : (
                            <span className="text-[#666B75]">
                              Not assessed during this check.
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <ConceptStatusChip status="not_assessed" />
                        <span className="text-[#666B75]">→</span>
                        <ConceptStatusChip status={cState.status} />
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </section>

          {/* Section 4: What to practice next */}
          <section className="space-y-4">
            <div>
              <span className="text-[12px] font-mono uppercase tracking-wider text-[#666B75]">
                Section 04
              </span>
              <h2 className="font-serif text-[24px] font-medium text-[#16181D]">
                What to practice next
              </h2>
            </div>

            <div className="rounded-[10px] border border-[#27408B]/30 bg-[#FFFFFF] p-6 space-y-3">
              <div className="text-[12px] font-mono uppercase text-[#27408B] tracking-wider font-medium">
                Focus concept · {recommendation.conceptTitle}
              </div>
              <p className="text-[15px] text-[#16181D] leading-relaxed">
                <MathView content={recommendation.text} />
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('/check')}
                  className="h-[38px] px-5 rounded-[6px] bg-[#16181D] text-white text-[13px] font-medium hover:bg-[#2C313A] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Practice this concept</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Confirmation Modal for Reset */}
      {showConfirmReset && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#16181D]/30 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-[#FFFFFF] border border-[#E6E1D8] rounded-[10px] p-6 max-w-[420px] w-full text-left space-y-4">
            <h3 className="font-serif text-[20px] font-medium text-[#16181D]">
              Start over with a clean check?
            </h3>
            <p className="text-[14px] text-[#4B505A] leading-relaxed">
              This will clear your current session progress and reset all concept statuses.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmReset(false)}
                className="h-[36px] px-4 rounded-[6px] border border-[#E6E1D8] text-[14px] text-[#4B505A] hover:text-[#16181D]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmReset(false);
                  onReset();
                }}
                className="h-[36px] px-4 rounded-[6px] bg-[#A23B22] text-white text-[14px] font-medium hover:bg-[#852E1A]"
              >
                Yes, start over
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[#E6E1D8] py-6 text-[13px] text-[#666B75]">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="max-w-[65ch] text-left">
            Prototype for algebra and introductory limits. Mentora tests hypotheses and can be wrong; it doesn't replace a teacher.
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="text-[#666B75] hover:text-[#16181D] underline underline-offset-2 transition-colors cursor-pointer"
            >
              Back to overview
            </button>
            <span className="text-[#E6E1D8]">·</span>
            <button
              type="button"
              onClick={() => onNavigate('/map')}
              className="text-[#666B75] hover:text-[#16181D] underline underline-offset-2 transition-colors cursor-pointer"
            >
              Knowledge Map
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
