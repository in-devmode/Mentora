import React, { useState } from 'react';
import { NavBar } from './NavBar';
import { MathView } from './MathView';
import { SessionState } from '../lib/engine';
import { QUESTIONS } from '../data/questions';

interface HomeScreenProps {
  session: SessionState | null;
  onNavigate: (path: string) => void;
  onStart: () => void;
  onResume: () => void;
  onReset: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  session,
  onNavigate,
  onStart,
  onResume,
  onReset,
}) => {
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const firstQuestion = QUESTIONS['ALG-01'];
  const hasActiveSession = Boolean(session && session.phase !== 'completed');

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#16181D] flex flex-col justify-between selection:bg-[#E9EDF8]">
      {/* Top Header Navigation */}
      <NavBar
        currentPath="/"
        onNavigate={onNavigate}
        hasActiveSession={hasActiveSession}
      />

      {/* Main Content Area */}
      <main className="max-w-[1120px] mx-auto px-6 py-12 md:py-16 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Eyebrow, H1, Lead, CTA */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="text-[13px] font-medium uppercase tracking-[0.08em] text-[#666B75]">
              A diagnostic math tutor
            </div>

            <h1 className="font-serif text-[38px] md:text-[48px] leading-[1.12] font-medium tracking-[-0.02em] text-[#16181D] max-w-[20ch]">
              Find the missing piece behind a mistake.
            </h1>

            <p className="text-[16px] leading-[1.6] text-[#4B505A] max-w-[54ch]">
              Mentora combines a universal AI mathematical solver with patient diagnostic tutoring.
              Solve any math problem across algebra, calculus, matrices, trigonometry, and statistics—or diagnose exactly where a concept slipped.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('/solve')}
                className="h-[40px] px-6 rounded-[6px] bg-[#16181D] text-[#FAF8F4] text-[15px] font-medium hover:bg-[#2C313A] transition-colors focus-visible:outline-2 focus-visible:outline-[#27408B] cursor-pointer"
              >
                Solve any math problem →
              </button>

              <button
                type="button"
                onClick={hasActiveSession ? onResume : onStart}
                className="h-[40px] px-5 rounded-[6px] border border-[#E6E1D8] bg-white text-[14px] font-medium text-[#16181D] hover:bg-[#FAF8F4] transition-colors cursor-pointer"
              >
                {hasActiveSession ? 'Resume diagnostic check' : 'Diagnostic check'}
              </button>

              {hasActiveSession && (
                <button
                  type="button"
                  onClick={() => setShowConfirmReset(true)}
                  className="h-[40px] px-3.5 rounded-[6px] text-[13px] text-[#666B75] hover:text-[#A23B22] transition-colors cursor-pointer"
                >
                  Start over
                </button>
              )}
            </div>
          </div>

          {/* Right Column: First Question Card Preview */}
          <div className="lg:col-span-5">
            <div
              onClick={hasActiveSession ? onResume : onStart}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  hasActiveSession ? onResume() : onStart();
                }
              }}
              className="group cursor-pointer rounded-[10px] border border-[#E6E1D8] bg-[#FFFFFF] p-6 text-left transition-all hover:border-[#16181D] focus-visible:outline-2 focus-visible:outline-[#27408B]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E6E1D8]">
                <span className="text-[12px] font-mono tracking-wide text-[#666B75] uppercase">
                  Anchor check · {firstQuestion.id}
                </span>
                <span className="text-[12px] text-[#27408B] font-medium group-hover:underline">
                  {hasActiveSession ? 'Continue' : 'Begin check'} →
                </span>
              </div>

              <div className="py-6">
                <div className="text-[13px] text-[#666B75] mb-2">Initial problem</div>
                <div className="font-serif text-[22px] md:text-[24px] text-[#16181D] leading-snug">
                  <MathView content={firstQuestion.prompt} />
                </div>
              </div>

              <div className="pt-3 border-t border-[#E6E1D8] text-[13px] text-[#666B75] flex items-center justify-between">
                <span>Scope: Difference of squares & rational expressions</span>
                <span className="font-mono text-[12px] text-[#4B505A]">Step 1 of 5</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Solver Card on Home */}
        <div className="mt-12 p-6 bg-white border border-[#E6E1D8] rounded-[10px] text-left">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div>
              <div className="text-[12px] font-mono uppercase tracking-wide text-[#666B75]">
                AI Math Solver
              </div>
              <h2 className="font-serif text-[20px] font-medium text-[#16181D]">
                Solve any problem with step-by-step reasoning
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/solve')}
              className="text-[13px] font-medium text-[#27408B] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Open full solver & tutor →
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onNavigate('/solve');
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              type="text"
              placeholder="Enter any math problem, e.g. \lim_{x \to 0} \frac{\sin(3x)}{x} or \int x e^{2x} dx or x^3 - 4x^2 + x + 6 = 0"
              className="flex-1 px-4 py-2.5 rounded-[6px] border border-[#E6E1D8] bg-[#FAF8F4] font-mono text-[14px] text-[#16181D] focus:outline-none focus:border-[#27408B]"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-[6px] bg-[#16181D] text-[#FAF8F4] text-[14px] font-medium hover:bg-[#2C313A] transition-colors cursor-pointer shrink-0"
            >
              Solve problem
            </button>
          </form>

          {/* Quick chips */}
          <div className="mt-3 flex items-center flex-wrap gap-2 text-[12px] text-[#666B75]">
            <span>Try:</span>
            <button
              type="button"
              onClick={() => onNavigate('/solve')}
              className="font-mono bg-[#FAF8F4] hover:bg-[#E9EDF8] px-2 py-0.5 rounded border border-[#E6E1D8] text-[#16181D] cursor-pointer"
            >
              <MathView content="\\lim_{x \\to 0} \\frac{\\sin 3x}{x}" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/solve')}
              className="font-mono bg-[#FAF8F4] hover:bg-[#E9EDF8] px-2 py-0.5 rounded border border-[#E6E1D8] text-[#16181D] cursor-pointer"
            >
              <MathView content="\\int x e^{2x} \\, dx" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/solve')}
              className="font-mono bg-[#FAF8F4] hover:bg-[#E9EDF8] px-2 py-0.5 rounded border border-[#E6E1D8] text-[#16181D] cursor-pointer"
            >
              <MathView content="x^3 - 4x^2 + x + 6 = 0" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/solve')}
              className="font-mono bg-[#FAF8F4] hover:bg-[#E9EDF8] px-2 py-0.5 rounded border border-[#E6E1D8] text-[#16181D] cursor-pointer"
            >
              <MathView content="\\det \\begin{pmatrix} 2 & 5 \\\\ 1 & 4 \\end{pmatrix}" />
            </button>
          </div>
        </div>

        {/* Three-step row: 01 Investigate / 02 Teach / 03 Verify */}
        <div className="mt-16 md:mt-24 pt-10 border-t border-[#E6E1D8]">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E6E1D8]">
            <div className="py-4 md:py-0 md:pr-8 text-left">
              <div className="font-mono text-[13px] text-[#666B75] mb-1.5">
                01 Investigate
              </div>
              <p className="text-[14px] leading-relaxed text-[#4B505A]">
                Mentora asks short questions to test why you got stuck.
              </p>
            </div>

            <div className="py-4 md:py-0 md:px-8 text-left">
              <div className="font-mono text-[13px] text-[#666B75] mb-1.5">
                02 Teach
              </div>
              <p className="text-[14px] leading-relaxed text-[#4B505A]">
                You get one focused explanation of the missing piece.
              </p>
            </div>

            <div className="py-4 md:py-0 md:pl-8 text-left">
              <div className="font-mono text-[13px] text-[#666B75] mb-1.5">
                03 Verify
              </div>
              <p className="text-[14px] leading-relaxed text-[#4B505A]">
                A fresh problem, no hints, shows whether it stuck.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E6E1D8] py-8 text-[13px] text-[#666B75]">
        <div className="max-w-[1120px] mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="max-w-[65ch] text-left">
            Prototype for algebra and introductory limits. Mentora tests hypotheses and can be wrong; it doesn't replace a teacher.
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowConfirmReset(true)}
              className="text-[#666B75] hover:text-[#16181D] underline underline-offset-2 transition-colors cursor-pointer"
            >
              Start over
            </button>
          </div>
        </div>
      </footer>

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
              This will clear your current session progress and reset all hypothesis and concept notes.
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
    </div>
  );
};
