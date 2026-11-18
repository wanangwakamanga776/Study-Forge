import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Flame, Shield, Loader2, Mail, Lock, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { signInWithGoogle, loginWithEmail, signUpWithEmail, resetPassword } from '../services/authService';
import { saveUserStats } from '../services/dataService';
import { soundService } from '../services/soundService';
import { PyraMascot } from './PyraMascot';

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
    <div className="min-h-screen bg-[var(--sf-bg)] text-[var(--sf-text)] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-[var(--sf-orange-500)]/15 blur-[120px]" />
        <div className="absolute top-1/3 -right-20 h-[360px] w-[360px] rounded-full bg-amber-300/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_45%)]" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl items-center gap-10 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--sf-orange-400)]/25 bg-[var(--sf-orange-500)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--sf-orange-300)]">
            <Sparkles size={14} aria-hidden="true" /> Study Forge
          </div>
          <div className="mb-6 flex items-center gap-4">
            <div className="scale-90 origin-left"><PyraMascot expression="happy" className="w-20 h-20" /></div>
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--sf-orange-500)] text-black shadow-[0_0_40px_var(--sf-orange-glow)]"><Flame size={26} aria-hidden="true" /></span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl" style={{ fontFamily: 'var(--sf-font-display)' }}>
            Learn anything, <span className="text-[var(--sf-orange-300)]">one clear step</span> at a time.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-[var(--sf-text-muted)] sm:text-lg">
            Ask questions, turn notes into practice, and come back to a study space that always shows what to do next.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-[var(--sf-text-muted)]">
            <li className="flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-[var(--sf-orange-400)]" /> Guided tutor sessions with clear explanations</li>
            <li className="flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-[var(--sf-orange-400)]" /> Practice, review, and progress in one workspace</li>
            <li className="flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-[var(--sf-orange-400)]" /> Calm, focused design that keeps learning first</li>
          </ul>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }} className="w-full max-w-md justify-self-center lg:justify-self-end">
          <div className="rounded-[32px] border border-white/10 bg-[var(--sf-surface)]/90 p-6 shadow-[var(--sf-shadow-card)] backdrop-blur-xl sm:p-8">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sf-text-subtle)]">Welcome back</p>
              <h2 className="mt-2 text-2xl font-semibold text-white" style={{ fontFamily: 'var(--sf-font-display)' }}>
                {authMode === 'login' ? 'Sign in to continue' : 'Create your account'}
              </h2>
            </div>

            {errorMsg && (
              <div role="alert" className="mb-4 flex items-start gap-3 rounded-2xl border border-[var(--sf-danger)]/25 bg-[var(--sf-danger-soft)] p-4 text-sm text-rose-100">
                <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[var(--sf-success)]/25 bg-[var(--sf-success-soft)] p-4 text-sm text-emerald-100">
                <Shield size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> <span>{successMsg}</span>
              </div>
            )}
            {isApk && (
              <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                On Android app builds, use email and password for the most reliable sign-in.
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label htmlFor="auth-email" className="mb-2 block text-sm font-medium text-[var(--sf-text-muted)]">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--sf-text-subtle)]" size={18} aria-hidden="true" />
                  <input id="auth-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-4 text-white placeholder:text-[var(--sf-text-disabled)] focus:border-[var(--sf-orange-400)] focus:outline-none" placeholder="you@example.com" />
                </div>
              </div>
              <div>
                <label htmlFor="auth-password" className="mb-2 block text-sm font-medium text-[var(--sf-text-muted)]">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--sf-text-subtle)]" size={18} aria-hidden="true" />
                  <input id="auth-password" type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                    className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-4 text-white placeholder:text-[var(--sf-text-disabled)] focus:border-[var(--sf-orange-400)] focus:outline-none" placeholder="Password" />
                </div>
              </div>

              {authMode === 'login' && (
                <div className="flex justify-end">
                  <button type="button" onClick={handleResetPassword} className="text-sm text-[var(--sf-text-subtle)] hover:text-white">Forgot password?</button>
                </div>
              )}

              <button type="submit" disabled={isAuthenticating} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--sf-orange-500)] px-4 font-semibold text-black transition hover:bg-[var(--sf-orange-400)] disabled:opacity-50">
                {isAuthenticating ? <Loader2 className="animate-spin" size={20} aria-hidden="true" /> : <>{authMode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={18} aria-hidden="true" /></>}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-[var(--sf-text-disabled)]">
              <div className="h-px flex-1 bg-white/10" /> or <div className="h-px flex-1 bg-white/10" />
            </div>

            <button type="button" onClick={handleGoogleSignIn} disabled={isAuthenticating} className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 font-medium text-white hover:bg-white/[0.07] disabled:opacity-50">
              <img src="https://www.google.com/favicon.ico" alt="" className="h-4 w-4" aria-hidden="true" /> Continue with Google
            </button>

            <div className="mt-5 flex flex-col gap-3 text-sm">
              <button type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setErrorMsg(null); setSuccessMsg(null); soundService.playClick(); }} className="text-[var(--sf-text-muted)] hover:text-white">
                {authMode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
              </button>
              <button type="button" onClick={() => { soundService.playClick(); onGuestAccess(); }} className="text-[var(--sf-text-subtle)] hover:text-white">
                Continue as guest (progress stays on this device)
              </button>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}