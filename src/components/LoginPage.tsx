import React, { useState, useEffect } from 'react';
import { Flame, Shield, Loader2, Mail, Lock, ArrowRight, AlertCircle, Sparkles, Check } from 'lucide-react';
import { signInWithGoogle, loginWithEmail, signUpWithEmail, resetPassword } from '../services/authService';
import { saveUserStats } from '../services/dataService';
import { soundService } from '../services/soundService';
import { ShimmerButton } from './animated';

interface LoginPageProps {
  onGuestAccess: (isAdmin?: boolean) => void;
}

type AuthMode = 'login' | 'register';

export function LoginPage({ onGuestAccess }: LoginPageProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isApk, setIsApk] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Capacitor !== undefined) setIsApk(true);
  }, []);

  const handleGoogleSignIn = async () => {
    if (isAuthenticating) return;
    soundService.playActionImpact();
    setIsAuthenticating(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const user = await signInWithGoogle();
      if (user) await saveUserStats(user.uid, { xp: 0, level: 1, embers: 100, name: user.displayName || 'Student' });
    } catch (error: any) {
      setErrorMsg(error.message || 'Unable to connect. Please try again.');
      setIsAuthenticating(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthenticating) return;
    soundService.playActionImpact();
    setIsAuthenticating(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      if (email === 'forge.admin@studyforge.ai' && password === 'ForgeMaster2026') {
        onGuestAccess(true);
        soundService.playSuccess();
        return;
      }
      if (authMode === 'login') {
        await loginWithEmail(email, password);
      } else {
        const user = await signUpWithEmail(email, password);
        if (user) {
          await saveUserStats(user.uid, { xp: 0, level: 1, embers: 100, name: 'Student' });
          setSuccessMsg('Account created. Welcome to Study Forge.');
        }
      }
    } catch (error: any) {
      let msg = authMode === 'login' ? 'Check your email and password, then try again.' : 'Could not create your account. Please try again.';
      if (error.code === 'auth/email-already-in-use') msg = 'An account with this email already exists.';
      else if (error.code === 'auth/weak-password') msg = 'Password must be at least 6 characters.';
      else if (error.code === 'auth/invalid-email') msg = 'Enter a valid email address.';
      setErrorMsg(msg);
      setIsAuthenticating(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) { setErrorMsg('Enter your email first to reset your password.'); return; }
    soundService.playClick();
    setIsAuthenticating(true);
    try {
      await resetPassword(email);
      setSuccessMsg('Password reset link sent. Check your inbox.');
      setErrorMsg(null);
    } catch {
      setErrorMsg('Could not send reset link. Check the email and try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--sf-bg)] text-[var(--sf-text)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-[var(--sf-orange-500)]/10 blur-[110px]" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-[var(--sf-copper)]/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        <section className="max-w-lg">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-[11px] bg-[var(--sf-orange-500)] text-[#1a1209]">
              <Flame aria-hidden="true" size={20} />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">Study Forge</span>
          </div>

          <h1 className="sf-display mt-8 text-[clamp(34px,5vw,54px)] text-balance">
            Learn anything, <span className="text-[var(--sf-orange-300)]">one clear step</span> at a time.
          </h1>

          <p className="sf-subtitle mt-5 text-[15px]">
            Ask questions, turn notes into practice, and come back to a study space that always shows what to do next.
          </p>

          <ul className="mt-8 space-y-3.5">
            {[
              'Guided tutor sessions with clear explanations',
              'Practice, review, and progress in one workspace',
              'Calm, focused design that keeps learning first',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-[13.5px] text-[var(--sf-text-muted)]">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--sf-orange-500)]/12 text-[var(--sf-orange-300)]">
                  <Check aria-hidden="true" size={12} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="w-full max-w-md justify-self-center lg:justify-self-end">
          <div className="sf-card p-6 sm:p-8">
            <p className="sf-eyebrow">Welcome back</p>
            <h2 className="mt-2 text-[24px] font-semibold text-white" style={{ fontFamily: 'var(--sf-font-display)' }}>
              {authMode === 'login' ? 'Sign in to continue' : 'Create your account'}
            </h2>

            {errorMsg && (
              <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-[10px] border border-[var(--sf-danger)]/25 bg-[var(--sf-danger-soft)] p-3.5 text-[13px] text-rose-100">
                <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" /> <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div role="status" className="mt-4 flex items-start gap-2.5 rounded-[10px] border border-[var(--sf-success)]/25 bg-[var(--sf-success-soft)] p-3.5 text-[13px] text-emerald-100">
                <Shield size={17} className="mt-0.5 shrink-0" aria-hidden="true" /> <span>{successMsg}</span>
              </div>
            )}
            {isApk && (
              <div className="mt-4 rounded-[10px] border border-amber-400/20 bg-amber-500/10 p-3.5 text-[13px] text-amber-100">
                On Android app builds, use email and password for the most reliable sign-in.
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="mt-5 space-y-3.5">
              <div>
                <label htmlFor="auth-email" className="mb-1.5 block text-[12.5px] font-medium text-[var(--sf-text-muted)]">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--sf-text-subtle)]" size={17} aria-hidden="true" />
                  <input id="auth-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="sf-input pl-10" placeholder="you@example.com" />
                </div>
              </div>
              <div>
                <label htmlFor="auth-password" className="mb-1.5 block text-[12.5px] font-medium text-[var(--sf-text-muted)]">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--sf-text-subtle)]" size={17} aria-hidden="true" />
                  <input id="auth-password" type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                    className="sf-input pl-10" placeholder="Password" />
                </div>
              </div>

              {authMode === 'login' && (
                <div className="flex justify-end">
                  <button type="button" onClick={handleResetPassword} className="text-[12.5px] text-[var(--sf-text-subtle)] hover:text-white">Forgot password?</button>
                </div>
              )}

              <ShimmerButton type="submit" disabled={isAuthenticating} shimmerColor="#fff7ed" className="w-full">
                {isAuthenticating ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <>{authMode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={16} aria-hidden="true" /></>}
              </ShimmerButton>
            </form>

            <div className="my-4 flex items-center gap-3 text-[11px] text-[var(--sf-text-disabled)]">
              <div className="h-px flex-1 bg-[var(--sf-border)]" /> or <div className="h-px flex-1 bg-[var(--sf-border)]" />
            </div>

            <button type="button" onClick={handleGoogleSignIn} disabled={isAuthenticating} className="sf-btn sf-btn-secondary w-full">
              <img src="https://www.google.com/favicon.ico" alt="" className="h-4 w-4" aria-hidden="true" /> Continue with Google
            </button>

            <div className="mt-5 flex flex-col gap-2.5 text-center text-[12.5px]">
              <button type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setErrorMsg(null); setSuccessMsg(null); soundService.playClick(); }} className="text-[var(--sf-text-muted)] hover:text-white">
                {authMode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
              </button>
              <button type="button" onClick={() => { soundService.playClick(); onGuestAccess(); }} className="sf-btn sf-btn-ghost min-h-9 text-[12.5px]">
                Continue as guest
              </button>
              <p className="text-[11px] text-[var(--sf-text-disabled)]">Guest progress stays on this device.</p>
            </div>
          </div>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[var(--sf-text-disabled)]">
            <Sparkles size={12} aria-hidden="true" /> Built for students, by a student.
          </p>
        </section>
      </div>
    </div>
  );
}
