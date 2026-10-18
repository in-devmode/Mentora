import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { signUpWithEmail, signInWithEmail, signInWithGoogle } from '../lib/auth';
import { X, Lock, Mail, User, AlertCircle, ArrowRight } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, authModalMode, closeModals, openAuthModal } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(authModalMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMode(authModalMode);
    setError(null);
  }, [authModalMode, isAuthModalOpen]);

  useEffect(() => {
    if (isAuthModalOpen) {
      setTimeout(() => emailInputRef.current?.focus(), 50);
    }
  }, [isAuthModalOpen, mode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthModalOpen) {
        e.preventDefault();
        closeModals();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, closeModals]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide both email and password.');
      return;
    }

    if (password.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        await signUpWithEmail(email, password, name);
      } else {
        await signInWithEmail(email, password);
      }
      closeModals();
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = 'Authentication failed. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Try signing in.';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = 'Incorrect email or password. Please verify and try again.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'No account found with this email. Create one to get started!';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password is too weak. Please use at least 6 characters.';
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      closeModals();
    } catch (err: any) {
      console.error('Google sign in error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Google sign-in could not be completed. You can sign in with email instead.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-[#FFFFFF] rounded-[10px] border border-[#E6E1D8] shadow-xl max-w-[420px] w-full p-6 text-left space-y-5 animate-in zoom-in-95 duration-150 relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={closeModals}
          className="absolute top-4 right-4 text-[#666B75] hover:text-[#16181D] p-1.5 rounded-[4px] hover:bg-[#FAF8F4] transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-1 pr-6">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#27408B]">
            Mentora Profile
          </div>
          <h2 id="auth-modal-title" className="font-serif text-[24px] font-medium text-[#16181D]">
            {mode === 'signup' ? 'Create student profile' : 'Sign in to Mentora'}
          </h2>
          <p className="text-[13px] text-[#4B505A] leading-relaxed">
            {mode === 'signup'
              ? 'Save your complete math solving history, track mastery progress, and access solutions anywhere.'
              : 'Access your previous math solutions, steps, and diagnostic check history across devices.'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[#E6E1D8] text-[13px] font-medium">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
            className={`flex-1 pb-2.5 text-center transition-colors cursor-pointer border-b-2 -mb-[1px] ${
              mode === 'signin'
                ? 'border-[#27408B] text-[#27408B]'
                : 'border-transparent text-[#666B75] hover:text-[#16181D]'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`flex-1 pb-2.5 text-center transition-colors cursor-pointer border-b-2 -mb-[1px] ${
              mode === 'signup'
                ? 'border-[#27408B] text-[#27408B]'
                : 'border-transparent text-[#666B75] hover:text-[#16181D]'
            }`}
          >
            Create account
          </button>
        </div>

        {/* Error notice */}
        {error && (
          <div className="p-3 rounded-[6px] bg-[#FDE8E8] border border-[#F8B4B4] text-[13px] text-[#9B1C1C] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Google 1-click button */}
        <div>
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleSignIn}
            className="w-full h-[40px] px-4 rounded-[6px] border border-[#E6E1D8] bg-[#FAF8F4] hover:bg-white text-[13px] font-medium text-[#16181D] flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[12px] text-[#666B75]">
          <div className="flex-1 h-[1px] bg-[#E6E1D8]"></div>
          <span>or with email</span>
          <div className="flex-1 h-[1px] bg-[#E6E1D8]"></div>
        </div>

        {/* Email form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div className="space-y-1">
              <label className="block text-[12px] font-medium text-[#4B505A]">
                Full or preferred name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-[#666B75]" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full h-[38px] pl-9 pr-3 rounded-[6px] border border-[#E6E1D8] bg-[#FFFFFF] text-[13px] text-[#16181D] placeholder:text-[#666B75]/50 focus:border-[#27408B] focus:ring-1 focus:ring-[#27408B] focus:outline-hidden"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-[12px] font-medium text-[#4B505A]">
              Email address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-[#666B75]" />
              <input
                ref={emailInputRef}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-[38px] pl-9 pr-3 rounded-[6px] border border-[#E6E1D8] bg-[#FFFFFF] text-[13px] text-[#16181D] placeholder:text-[#666B75]/50 focus:border-[#27408B] focus:ring-1 focus:ring-[#27408B] focus:outline-hidden"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[12px] font-medium text-[#4B505A]">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-[#666B75]" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-[38px] pl-9 pr-3 rounded-[6px] border border-[#E6E1D8] bg-[#FFFFFF] text-[13px] text-[#16181D] placeholder:text-[#666B75]/50 focus:border-[#27408B] focus:ring-1 focus:ring-[#27408B] focus:outline-hidden"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[40px] px-4 rounded-[6px] bg-[#16181D] text-[#FAF8F4] text-[13px] font-medium hover:bg-[#2C313A] transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Please wait…</span>
            ) : (
              <>
                <span>{mode === 'signup' ? 'Create profile' : 'Sign in'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-[11px] text-[#666B75] text-center">
          Press <kbd className="px-1 py-0.5 rounded bg-[#EEECE7] text-[#16181D] border border-[#E6E1D8]">Esc</kbd> anytime to dismiss
        </div>
      </div>
    </div>
  );
};
