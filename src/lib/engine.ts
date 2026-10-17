import { HypothesisTag, HYPOTHESIS_CONCEPT_MAP, CONCEPTS } from '../data/concepts';
import { QUESTIONS, QuestionKind } from '../data/questions';
import { InterpretOutput, TeachOutput } from './api';

export type SessionPhase = 'attempt' | 'investigate' | 'teach' | 'practice' | 'verify' | 'completed';

export type ConceptStatus = 'not_assessed' | 'developing' | 'likely_gap' | 'demonstrated';
export type HypothesisStatus = 'untested' | 'testing' | 'ruled_out' | 'likely_gap';

export interface ConceptState {
  id: string;
  title: string;
  status: ConceptStatus;
  independentCorrectCount: number;
  attempted: boolean;
  hasProbeGap: boolean;
}

export interface HypothesisState {
  tag: HypothesisTag;
  status: HypothesisStatus;
  evidence: string;
  updatedAt: string;
}

export interface SessionEvent {
  id: string;
  time: string;
  type:
    | 'session_start'
    | 'answer_submitted'
    | 'hypothesis_updated'
    | 'lesson_viewed'
    | 'hint_requested'
    | 'phase_changed'
    | 'session_completed';
  questionId?: string;
  answer?: string;
  correct?: boolean;
  hypothesis?: HypothesisTag;
  note: string;
}

export interface LastCheckResult {
  valid: boolean;
  correct: boolean;
  message?: string;
  feedback?: string;
  source: 'ai' | 'builtin';
  questionId: string;
  submittedAnswer: string;
}

export interface SessionState {
  id: string;
  createdAt: string;
  phase: SessionPhase;
  currentQuestionId: string;
  hypotheses: Record<HypothesisTag, HypothesisState>;
  concepts: Record<string, ConceptState>;
  events: SessionEvent[];
  hintsUsed: string[];
  initialExplanation?: string;
  practiceAttempts: Record<string, number>;
  lastCheckResult?: LastCheckResult;
  investigationQueue: HypothesisTag[];
  currentHypothesis?: HypothesisTag;
  activeGapConcept?: string;
  inconclusive?: boolean;
  explanationRevealed?: boolean;
  completedAt?: string;
  tailoredExplanation?: TeachOutput;
}

export function formatTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function createInitialSession(): SessionState {
  const now = new Date();
  const timeStr = formatTimestamp(now);

  const initialConcepts: Record<string, ConceptState> = {};
  for (const [id, c] of Object.entries(CONCEPTS)) {
    initialConcepts[id] = {
      id,
      title: c.title,
      status: 'not_assessed',
      independentCorrectCount: 0,
      attempted: false,
      hasProbeGap: false,
    };
  }

  const initialHypotheses: Record<HypothesisTag, HypothesisState> = {
    factorization: {
      tag: 'factorization',
      status: 'untested',
      evidence: 'Untested — no evidence collected yet.',
      updatedAt: timeStr,
    },
    cancellation: {
      tag: 'cancellation',
      status: 'untested',
      evidence: 'Untested — no evidence collected yet.',
      updatedAt: timeStr,
    },
    domain_restriction: {
      tag: 'domain_restriction',
      status: 'untested',
      evidence: 'Untested — no evidence collected yet.',
      updatedAt: timeStr,
    },
  };

  const initialEvent: SessionEvent = {
    id: `ev_${Date.now()}_0`,
    time: timeStr,
    type: 'session_start',
    questionId: 'ALG-01',
    note: 'Learning check started with anchor problem ALG-01.',
  };

  return {
    id: `guest_${Date.now()}`,
    createdAt: now.toISOString(),
    phase: 'attempt',
    currentQuestionId: 'ALG-01',
    hypotheses: initialHypotheses,
    concepts: initialConcepts,
    events: [initialEvent],
    hintsUsed: [],
    practiceAttempts: {},
    investigationQueue: ['factorization', 'cancellation'],
  };
}

export function computeConceptStatuses(
  concepts: Record<string, ConceptState>,
  events: SessionEvent[]
): Record<string, ConceptState> {
  // Clone state
  const updated: Record<string, ConceptState> = {};
  for (const [id, c] of Object.entries(concepts)) {
    updated[id] = {
      ...c,
      status: 'not_assessed',
      independentCorrectCount: 0,
      attempted: false,
      hasProbeGap: false,
    };
  }

  // Iterate chronologically through events
  for (const ev of events) {
    if (ev.type === 'answer_submitted' && ev.questionId) {
      const q = QUESTIONS[ev.questionId];
      if (!q) continue;

      const primary = updated[q.primaryConcept];
      if (primary) {
        primary.attempted = true;
      }

      if (q.alsoConcepts) {
        for (const also of q.alsoConcepts) {
          if (updated[also]) updated[also].attempted = true;
        }
      }

      const isIndependent =
        (q.kind === 'anchor' || q.kind === 'probe' || q.kind === 'verify' || q.kind === 'bridge') &&
        ev.correct === true;

      if (q.kind === 'probe' && ev.correct === false) {
        // Probe was wrong -> active probe gap for this concept
        if (primary) {
          primary.hasProbeGap = true;
        }
      }

      if (isIndependent) {
        if (primary) {
          primary.independentCorrectCount += 1;
          primary.hasProbeGap = false; // cleared by subsequent independent correct answer
        }
        if (q.alsoConcepts) {
          for (const also of q.alsoConcepts) {
            const ac = updated[also];
            if (ac) {
              ac.independentCorrectCount += 1;
              ac.hasProbeGap = false;
            }
          }
        }
      }
    }
  }

  // Calculate final status
  for (const c of Object.values(updated)) {
    if (c.hasProbeGap) {
      c.status = 'likely_gap';
    } else if (c.independentCorrectCount >= 2) {
      c.status = 'demonstrated';
    } else if (c.attempted) {
      c.status = 'developing';
    } else {
      c.status = 'not_assessed';
    }
  }

  return updated;
}

export function recordExplanation(
  session: SessionState,
  explanation: string
): SessionState {
  return {
    ...session,
    initialExplanation: explanation,
  };
}

export function requestHint(session: SessionState): SessionState {
  const qId = session.currentQuestionId;
  if (session.hintsUsed.includes(qId)) return session;

  const timeStr = formatTimestamp();
  const event: SessionEvent = {
    id: `ev_${Date.now()}_${session.events.length}`,
    time: timeStr,
    type: 'hint_requested',
    questionId: qId,
    note: `Requested hint for practice question ${qId}.`,
  };

  return {
    ...session,
    hintsUsed: [...session.hintsUsed, qId],
    events: [...session.events, event],
  };
}

export function applyAiTeach(
  session: SessionState,
  tailored: TeachOutput
): SessionState {
  const timeStr = formatTimestamp();
  const event: SessionEvent = {
    id: `ev_${Date.now()}_${session.events.length}`,
    time: timeStr,
    type: 'lesson_viewed',
    note: `Tailored Gemini explanation generated for ${session.activeGapConcept || 'concept'}.`,
  };

  return {
    ...session,
    tailoredExplanation: tailored,
    events: [...session.events, event],
  };
}

export function processAnswerSubmission(
  session: SessionState,
  rawAnswer: string,
  checkResult: {
    valid: boolean;
    correct: boolean;
    message?: string;
    feedback?: string;
  },
  aiInterpretation?: InterpretOutput | null
): SessionState {
  const q = QUESTIONS[session.currentQuestionId];
  if (!q) return session;

  // If input cannot be parsed, does not count as attempt
  if (!checkResult.valid) {
    return {
      ...session,
      lastCheckResult: {
        valid: false,
        correct: false,
        message: checkResult.message,
        source: 'builtin',
        questionId: q.id,
        submittedAnswer: rawAnswer,
      },
    };
  }

  // If equal but not simplified / factored (valid input, but message applies)
  if (checkResult.message && !checkResult.correct) {
    return {
      ...session,
      lastCheckResult: {
        valid: true,
        correct: false,
        message: checkResult.message,
        source: 'builtin',
        questionId: q.id,
        submittedAnswer: rawAnswer,
      },
    };
  }

  const timeStr = formatTimestamp();
  const newEvents: SessionEvent[] = [...session.events];
  let hypotheses = { ...session.hypotheses };
  let newPhase = session.phase;
  let nextQuestionId = session.currentQuestionId;
  let activeGapConcept = session.activeGapConcept;
  let currentHypothesis = session.currentHypothesis;
  let investigationQueue = [...session.investigationQueue];
  let inconclusive = session.inconclusive;
  const practiceAttempts = { ...session.practiceAttempts };
  let explanationRevealed = session.explanationRevealed;

  // 1. Record the answer event
  // CORRECTNESS is ALWAYS decided by the deterministic checker
  const isCorrect = checkResult.correct;
  newEvents.push({
    id: `ev_${Date.now()}_${newEvents.length}`,
    time: timeStr,
    type: 'answer_submitted',
    questionId: q.id,
    answer: rawAnswer,
    correct: isCorrect,
    hypothesis: q.hypothesisTag,
    note: `${q.kind.toUpperCase()} ${q.id}: answered "${rawAnswer}" (${isCorrect ? 'correct' : 'incorrect'}).`,
  });

  // Determine feedback message & source
  let feedbackMessage = checkResult.feedback;
  let feedbackSource: 'ai' | 'builtin' = 'builtin';

  if (aiInterpretation?.studentFacingMessage) {
    feedbackMessage = aiInterpretation.studentFacingMessage;
    feedbackSource = 'ai';
  }

  // 2. State Machine logic based on current phase and question
  if (session.phase === 'attempt') {
    if (!isCorrect) {
      // Wrong anchor ALG-01:
      // Form candidate order
      let initialOrder: HypothesisTag[] = ['factorization', 'cancellation'];

      // AI rule: If candidateMisconception is a tag not yet ruled out and confidence is medium or high,
      // probe THAT hypothesis first; otherwise keep the default order.
      if (
        aiInterpretation &&
        (aiInterpretation.confidence === 'medium' || aiInterpretation.confidence === 'high') &&
        (aiInterpretation.candidateMisconception === 'cancellation' ||
          aiInterpretation.candidateMisconception === 'factorization') &&
        hypotheses[aiInterpretation.candidateMisconception].status !== 'ruled_out'
      ) {
        if (aiInterpretation.candidateMisconception === 'cancellation') {
          initialOrder = ['cancellation', 'factorization'];
        } else {
          initialOrder = ['factorization', 'cancellation'];
        }
      }

      investigationQueue = initialOrder;
      currentHypothesis = initialOrder[0];
      nextQuestionId = currentHypothesis === 'factorization' ? 'DX-01' : 'DX-02';
      newPhase = 'investigate';

      // Update evidence in Hypothesis ledger from AI if available
      const aiEvidence =
        aiInterpretation?.evidence && aiInterpretation.evidence.length > 0
          ? aiInterpretation.evidence.join(' ')
          : 'Testing hypothesis: student had difficulty simplifying (x²-9)/(x-3).';

      hypotheses[currentHypothesis] = {
        tag: currentHypothesis,
        status: 'testing',
        evidence: aiEvidence,
        updatedAt: timeStr,
      };

      newEvents.push({
        id: `ev_${Date.now()}_${newEvents.length}`,
        time: timeStr,
        type: 'hypothesis_updated',
        hypothesis: currentHypothesis,
        note: `Formed investigation queue [${initialOrder.join(', ')}]. Testing ${currentHypothesis}.`,
      });
    } else {
      // Correct anchor ALG-01:
      // AI rule: Correct answer + "sound" reasoning → skip the understanding check and go straight to VERIFY
      // Correct answer + any other reasoning value → keep the understanding check
      if (aiInterpretation && aiInterpretation.reasoning === 'sound') {
        newPhase = 'verify';
        nextQuestionId = 'VER-01';

        newEvents.push({
          id: `ev_${Date.now()}_${newEvents.length}`,
          time: timeStr,
          type: 'phase_changed',
          questionId: 'VER-01',
          note: 'Sound reasoning verified on anchor: proceeding directly to independent verification.',
        });
      } else {
        // Keep understanding check DX-03
        newPhase = 'investigate';
        currentHypothesis = 'domain_restriction';
        nextQuestionId = 'DX-03';

        hypotheses.domain_restriction = {
          tag: 'domain_restriction',
          status: 'testing',
          evidence: 'Testing understanding of excluded values at x=3.',
          updatedAt: timeStr,
        };

        newEvents.push({
          id: `ev_${Date.now()}_${newEvents.length}`,
          time: timeStr,
          type: 'hypothesis_updated',
          hypothesis: 'domain_restriction',
          note: 'Checking domain restriction understanding via DX-03.',
        });
      }
    }
  } else if (session.phase === 'investigate') {
    if (q.id === 'DX-01') {
      // Probing factorization
      if (isCorrect) {
        hypotheses.factorization = {
          tag: 'factorization',
          status: 'ruled_out',
          evidence: 'Factorization ruled out for now: factored x²−16 correctly.',
          updatedAt: timeStr,
        };
        newEvents.push({
          id: `ev_${Date.now()}_${newEvents.length}`,
          time: timeStr,
          type: 'hypothesis_updated',
          hypothesis: 'factorization',
          note: 'Factorization ruled out for now: answered DX-01 correctly.',
        });

        // Check if cancellation is still in queue / untested
        if (hypotheses.cancellation.status === 'untested') {
          currentHypothesis = 'cancellation';
          nextQuestionId = 'DX-02';
          hypotheses.cancellation = {
            tag: 'cancellation',
            status: 'testing',
            evidence: 'Testing hypothesis: cancelling terms instead of common factors.',
            updatedAt: timeStr,
          };
        } else {
          // All ruled out -> inconclusive
          inconclusive = true;
          newPhase = 'verify';
          nextQuestionId = 'VER-01';
        }
      } else {
        // Wrong probe -> Likely gap
        hypotheses.factorization = {
          tag: 'factorization',
          status: 'likely_gap',
          evidence: 'Likely gap in difference of squares factorization.',
          updatedAt: timeStr,
        };
        newEvents.push({
          id: `ev_${Date.now()}_${newEvents.length}`,
          time: timeStr,
          type: 'hypothesis_updated',
          hypothesis: 'factorization',
          note: 'Factorization marked as Likely gap based on DX-01 response.',
        });

        activeGapConcept = 'diff-squares';
        newPhase = 'teach';
      }
    } else if (q.id === 'DX-02') {
      // Probing cancellation
      if (isCorrect) {
        hypotheses.cancellation = {
          tag: 'cancellation',
          status: 'ruled_out',
          evidence: 'Cancellation ruled out for now: recognized factor vs term cancellation.',
          updatedAt: timeStr,
        };
        newEvents.push({
          id: `ev_${Date.now()}_${newEvents.length}`,
          time: timeStr,
          type: 'hypothesis_updated',
          hypothesis: 'cancellation',
          note: 'Cancellation ruled out for now: answered DX-02 correctly.',
        });

        // Check if factorization was already tested
        if (hypotheses.factorization.status === 'untested') {
          currentHypothesis = 'factorization';
          nextQuestionId = 'DX-01';
          hypotheses.factorization = {
            tag: 'factorization',
            status: 'testing',
            evidence: 'Testing hypothesis: difference of squares factorization.',
            updatedAt: timeStr,
          };
        } else {
          // All candidates ruled out! Inconclusive cause -> VERIFY with VER-01
          inconclusive = true;
          newPhase = 'verify';
          nextQuestionId = 'VER-01';
        }
      } else {
        // Wrong probe -> Likely gap
        hypotheses.cancellation = {
          tag: 'cancellation',
          status: 'likely_gap',
          evidence: 'Likely gap in cancelling factors vs terms in rational expressions.',
          updatedAt: timeStr,
        };
        newEvents.push({
          id: `ev_${Date.now()}_${newEvents.length}`,
          time: timeStr,
          type: 'hypothesis_updated',
          hypothesis: 'cancellation',
          note: 'Cancellation marked as Likely gap based on DX-02 response.',
        });

        activeGapConcept = 'cancel';
        newPhase = 'teach';
      }
    } else if (q.id === 'DX-03') {
      // Understanding check for domain
      if (isCorrect) {
        hypotheses.domain_restriction = {
          tag: 'domain_restriction',
          status: 'ruled_out',
          evidence: 'Excluded values ruled out for now: identified undefined at x=3.',
          updatedAt: timeStr,
        };
        newEvents.push({
          id: `ev_${Date.now()}_${newEvents.length}`,
          time: timeStr,
          type: 'hypothesis_updated',
          hypothesis: 'domain_restriction',
          note: 'Domain restrictions verified on DX-03.',
        });

        newPhase = 'verify';
        nextQuestionId = 'VER-01';
      } else {
        hypotheses.domain_restriction = {
          tag: 'domain_restriction',
          status: 'likely_gap',
          evidence: 'Likely gap in excluded values / zero denominator.',
          updatedAt: timeStr,
        };
        newEvents.push({
          id: `ev_${Date.now()}_${newEvents.length}`,
          time: timeStr,
          type: 'hypothesis_updated',
          hypothesis: 'domain_restriction',
          note: 'Domain restrictions marked as Likely gap based on DX-03 response.',
        });

        activeGapConcept = 'domain';
        newPhase = 'teach';
      }
    }
  } else if (session.phase === 'practice') {
    const curAttempts = (practiceAttempts[q.id] || 0) + 1;
    practiceAttempts[q.id] = curAttempts;

    if (isCorrect) {
      // Correct on practice: button will let user move to verify
    } else {
      if (curAttempts >= 2) {
        explanationRevealed = true;
      }
    }
  } else if (session.phase === 'verify') {
    if (!isCorrect) {
      const untestedHypothesis = (['factorization', 'cancellation'] as HypothesisTag[]).find(
        (h) => hypotheses[h].status === 'untested'
      );

      if (untestedHypothesis) {
        newPhase = 'investigate';
        currentHypothesis = untestedHypothesis;
        nextQuestionId = untestedHypothesis === 'factorization' ? 'DX-01' : 'DX-02';
        hypotheses[untestedHypothesis] = {
          tag: untestedHypothesis,
          status: 'testing',
          evidence: 'Testing untested prerequisite after verify slip.',
          updatedAt: timeStr,
        };
        newEvents.push({
          id: `ev_${Date.now()}_${newEvents.length}`,
          time: timeStr,
          type: 'phase_changed',
          note: `Verification slip on ${q.id}. Investigating untested prerequisite: ${untestedHypothesis}.`,
        });
      } else {
        newPhase = 'teach';
        if (!activeGapConcept) {
          activeGapConcept = 'diff-squares';
        }
      }
    }
  }

  // Compute updated concept statuses
  const updatedConcepts = computeConceptStatuses(session.concepts, newEvents);

  return {
    ...session,
    phase: newPhase,
    currentQuestionId: nextQuestionId,
    hypotheses,
    concepts: updatedConcepts,
    events: newEvents,
    activeGapConcept,
    currentHypothesis,
    investigationQueue,
    inconclusive,
    practiceAttempts,
    explanationRevealed,
    lastCheckResult: {
      valid: true,
      correct: isCorrect,
      message: checkResult.message,
      feedback: feedbackMessage,
      source: feedbackSource,
      questionId: q.id,
      submittedAnswer: rawAnswer,
    },
  };
}

export function proceedToPractice(session: SessionState): SessionState {
  let practiceQId = 'PR-01';
  if (session.activeGapConcept === 'cancel') {
    practiceQId = 'PR-02';
  } else if (session.activeGapConcept === 'domain') {
    practiceQId = 'PR-03';
  }

  const timeStr = formatTimestamp();
  const event: SessionEvent = {
    id: `ev_${Date.now()}_${session.events.length}`,
    time: timeStr,
    type: 'phase_changed',
    questionId: practiceQId,
    note: `Proceeded to guided practice with ${practiceQId}.`,
  };

  return {
    ...session,
    phase: 'practice',
    currentQuestionId: practiceQId,
    events: [...session.events, event],
    lastCheckResult: undefined,
    explanationRevealed: false,
  };
}

export function proceedToVerify(session: SessionState): SessionState {
  let verifyQId = 'VER-01';
  if (session.activeGapConcept === 'cancel') {
    verifyQId = 'VER-02';
  } else if (session.activeGapConcept === 'domain') {
    verifyQId = 'VER-03';
  }

  const timeStr = formatTimestamp();
  const event: SessionEvent = {
    id: `ev_${Date.now()}_${session.events.length}`,
    time: timeStr,
    type: 'phase_changed',
    questionId: verifyQId,
    note: `Moved to independent verification with ${verifyQId}.`,
  };

  return {
    ...session,
    phase: 'verify',
    currentQuestionId: verifyQId,
    events: [...session.events, event],
    lastCheckResult: undefined,
  };
}

export function serveOneMoreCheck(session: SessionState): SessionState {
  // Serves the other of VER-01 / VER-02
  const current = session.currentQuestionId;
  const nextQId = current === 'VER-01' ? 'VER-02' : 'VER-01';

  const timeStr = formatTimestamp();
  const event: SessionEvent = {
    id: `ev_${Date.now()}_${session.events.length}`,
    time: timeStr,
    type: 'phase_changed',
    questionId: nextQId,
    note: `Serving one more independent verification problem: ${nextQId}.`,
  };

  return {
    ...session,
    currentQuestionId: nextQId,
    phase: 'verify',
    events: [...session.events, event],
    lastCheckResult: undefined,
  };
}

export function finishSession(session: SessionState): SessionState {
  const timeStr = formatTimestamp();
  const event: SessionEvent = {
    id: `ev_${Date.now()}_${session.events.length}`,
    time: timeStr,
    type: 'session_completed',
    note: 'Learning check finished. Reviewed concept statuses.',
  };

  return {
    ...session,
    phase: 'completed',
    completedAt: new Date().toISOString(),
    events: [...session.events, event],
  };
}

export function startLimitsBridge(session: SessionState): SessionState {
  const timeStr = formatTimestamp();
  const event: SessionEvent = {
    id: `ev_${Date.now()}_${session.events.length}`,
    time: timeStr,
    type: 'phase_changed',
    questionId: 'LIM-01',
    note: 'Started introductory limits bridge with problem LIM-01.',
  };

  return {
    ...session,
    currentQuestionId: 'LIM-01',
    phase: 'verify',
    events: [...session.events, event],
    lastCheckResult: undefined,
  };
}

export function proceedToNextBridgeQuestion(session: SessionState): SessionState {
  const nextQId = session.currentQuestionId === 'LIM-01' ? 'LIM-02' : 'LIM-01';
  const timeStr = formatTimestamp();
  const event: SessionEvent = {
    id: `ev_${Date.now()}_${session.events.length}`,
    time: timeStr,
    type: 'phase_changed',
    questionId: nextQId,
    note: `Advanced to limits bridge problem ${nextQId}.`,
  };

  return {
    ...session,
    currentQuestionId: nextQId,
    phase: 'verify',
    events: [...session.events, event],
    lastCheckResult: undefined,
  };
}

export function getConceptAttempts(
  session: SessionState,
  conceptId: string
): { event: SessionEvent; question: typeof QUESTIONS[string] }[] {
  const results: { event: SessionEvent; question: typeof QUESTIONS[string] }[] = [];

  for (const ev of session.events) {
    if (ev.type === 'answer_submitted' && ev.questionId) {
      const q = QUESTIONS[ev.questionId];
      if (!q) continue;

      if (q.primaryConcept === conceptId || (q.alsoConcepts && q.alsoConcepts.includes(conceptId))) {
        results.push({ event: ev, question: q });
      }
    }
  }

  return results;
}

