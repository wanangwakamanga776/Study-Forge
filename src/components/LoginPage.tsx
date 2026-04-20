import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hammer, Flame, Shield, User, Loader2, Mail, Lock, Sparkles, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { signInWithGoogle, loginWithEmail, signUpWithEmail, resetPassword } from '../services/authService';
import { soundService } from '../services/soundService';
import { cn } from '../lib/utils';

interface LoginPageProps {
  onGuestAccess: () => void;
}

type AuthType = 'forge' | 'google';
type ForgeMode = 'login' | 'register';

export function LoginPage({ onGuestAccess }: LoginPageProps) {
  const [authType, setAuthType] = useState<AuthType>('forge');
  const [forgeMode, setForgeMode] = useState<ForgeMode>('login');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sparks/Particles state
  const [sparks, setSparks] = useState<{ id: number; x: number; y: number; size: number; duration: number }[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSparks(prev => [
        ...prev.slice(-20),
        {
          id: Math.random(),
          x: Math.random() * 100,
          y: 100,
          size: Math.random() * 3 + 1,
          duration: Math.random() * 2 + 1
        }
      ]);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const handleGoogleSignIn = async () => {
    if (isAuthenticating) return;
    soundService.playAnvilClink();
    setIsAuthenticating(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    
    try {
      await signInWithGoogle();
    } catch (error: any) {
      if (error.message.includes("Security Lock")) {
        setAuthType('forge');
      }
      setErrorMsg(error.message || "The Forge failed to light. Check your connection.");
      setIsAuthenticating(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthenticating) return;
    soundService.playAnvilClink();
    setIsAuthenticating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (forgeMode === 'login') {
        await loginWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
    } catch (error: any) {
      let msg = "The Forge does not recognize these credentials.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        msg = "The Forge does not recognize these credentials. Verify your scrolls.";
      } else if (error.code === 'auth/email-already-in-use') {
        msg = "An apprentice already uses this email. Return to the Login Gate.";
      } else if (error.code === 'auth/weak-password') {
        msg = "Your password isn't strong enough for the heat of the Forge.";
      } else if (error.code === 'auth/invalid-email') {
        msg = "That email scroll is not formatted correctly.";
      }
      setErrorMsg(msg);
      setIsAuthenticating(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setErrorMsg("Please enter your email to reset your password.");
      return;
    }
    soundService.playClick();
    setIsAuthenticating(true);
    try {
      await resetPassword(email);
      setSuccessMsg("Reset link sent! Check your inbox.");
      setErrorMsg(null);
    } catch (error: any) {
      setErrorMsg("Failed to send reset link. Verify your email.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen bg-forge-dark flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(251,146,60,0.1)_0%,transparent_70%)]" />
      
      {/* Sparks/Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {sparks.map(spark => (
          <motion.div
            key={spark.id}
            initial={{ opacity: 1, y: '100vh', x: `${spark.x}vw` }}
            animate={{ 
              opacity: 0, 
              y: '-10vh',
              x: `${spark.x + (Math.random() * 20 - 10)}vw`
            }}
            transition={{ duration: spark.duration, ease: "linear" }}
            className="absolute w-1 h-1 bg-forge-accent rounded-full blur-[1px]"
            style={{ width: spark.size, height: spark.size }}
          />
        ))}
      </div>

      {/* Cinematic Logo Section */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center mb-10 relative z-10"
      >
        <div className="w-24 h-24 bg-forge-accent/20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 forge-glow border-2 border-forge-accent/40 shadow-[0_0_50px_rgba(251,146,60,0.2)]">
          <Flame size={48} className="text-forge-accent" />
        </div>
        <h1 className="text-6xl sm:text-7xl font-display font-black uppercase italic tracking-tighter text-white drop-shadow-[0_0_30px_rgba(251,146,60,0.4)]">
          Study Forge
        </h1>
        <p className="text-forge-accent/60 font-black uppercase tracking-[0.4em] text-[8px] mt-3">
          Master the Heat • Forge Your Future
        </p>
      </motion.div>

      {/* Auth Container */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Toggle Switch */}
        <div className="flex p-1 bg-white/[0.03] border border-white/5 rounded-2xl mb-6 backdrop-blur-md">
          <button
            onClick={() => { setAuthType('forge'); soundService.playClick(); }}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              authType === 'forge' ? "bg-forge-accent text-forge-dark shadow-lg" : "text-stone-500 hover:text-stone-300"
            )}
          >
            Forge Sign-In
          </button>
          <button
            onClick={() => { setAuthType('google'); soundService.playClick(); }}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              authType === 'google' ? "bg-forge-accent text-forge-dark shadow-lg" : "text-stone-500 hover:text-stone-300"
            )}
          >
            Google Access
          </button>
        </div>

        {/* Form Card */}
        <div className="bg-white/[0.02] border border-white/10 rounded-[3rem] p-8 sm:p-10 backdrop-blur-xl relative overflow-hidden shadow-2xl group transition-all hover:border-white/20">
          {/* Brushed Steel Visual Effect */}
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.05)_0%,transparent_50%,rgba(255,255,255,0.05)_100%)] pointer-events-none" />
          
          <div className="relative z-10">
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3"
              >
                <AlertCircle size={16} className="text-red-500 shrink-0" />
                <p className="text-[10px] font-black uppercase text-red-500 tracking-widest leading-tight">
                  {errorMsg}
                </p>
              </motion.div>
            )}

            {successMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-3"
              >
                <Shield size={16} className="text-green-500 shrink-0" />
                <p className="text-[10px] font-black uppercase text-green-500 tracking-widest leading-tight">
                  {successMsg}
                </p>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {authType === 'google' ? (
                <motion.div
                  key="google"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2 mb-8">
                    <h2 className="text-2xl font-display font-black uppercase italic tracking-tighter text-white">The Golden Gate</h2>
                    <p className="text-stone-500 text-[10px] font-bold uppercase tracking-widest">Instant entry through the Forge's trusted partner.</p>
                  </div>
                  
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={isAuthenticating}
                    className="w-full h-16 flex items-center justify-center gap-4 bg-white text-forge-dark rounded-2xl font-display font-black uppercase italic tracking-tighter hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] group/btn"
                  >
                    {isAuthenticating ? (
                      <Loader2 className="animate-spin" size={24} />
                    ) : (
                      <>
                        <img src="https://www.google.com/favicon.ico" alt="" className="w-6 h-6 grayscale group-hover/btn:grayscale-0 transition-all" />
                        <span className="text-xl">Continue with Google</span>
                      </>
                    )}
                  </button>
                  
                  <div className="pt-4 flex items-center gap-4">
                    <div className="flex-1 h-px bg-white/5" />
                    <span className="text-[9px] font-bold text-stone-600 uppercase tracking-[0.3em]">Protocol</span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key={forgeMode}
                  onSubmit={handleEmailAuth}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="text-center space-y-1 mb-6">
                    <h2 className="text-2xl font-display font-black uppercase italic tracking-tighter text-white">
                      {forgeMode === 'login' ? 'Returning Forger' : 'New Apprentice'}
                    </h2>
                    <div className="flex items-center justify-center gap-4 mt-2">
                      <button 
                        type="button"
                        onClick={() => { setForgeMode('login'); soundService.playClick(); }}
                        className={cn(
                          "text-[9px] font-black uppercase tracking-widest transition-all px-3 py-1 rounded-full border",
                          forgeMode === 'login' ? "border-forge-accent text-forge-accent" : "border-white/10 text-stone-600 hover:text-stone-400"
                        )}
                      >
                        Login
                      </button>
                      <button 
                        type="button"
                        onClick={() => { setForgeMode('register'); soundService.playClick(); }}
                        className={cn(
                          "text-[9px] font-black uppercase tracking-widest transition-all px-3 py-1 rounded-full border",
                          forgeMode === 'register' ? "border-forge-accent text-forge-accent" : "border-white/10 text-stone-600 hover:text-stone-400"
                        )}
                      >
                        Register
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="relative group/input">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-600 group-focus-within/input:text-forge-accent transition-colors" size={18} />
                      <input
                        type="email"
                        placeholder="Master Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full h-14 bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-4 text-white text-sm font-bold placeholder:text-stone-700 focus:outline-none focus:border-forge-accent focus:ring-4 focus:ring-forge-accent/10 transition-all"
                      />
                    </div>
                    <div className="relative group/input">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-600 group-focus-within/input:text-forge-accent transition-colors" size={18} />
                      <input
                        type="password"
                        placeholder="Secure Parchment"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full h-14 bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-4 text-white text-sm font-bold placeholder:text-stone-700 focus:outline-none focus:border-forge-accent focus:ring-4 focus:ring-forge-accent/10 transition-all"
                      />
                    </div>
                  </div>

                  {forgeMode === 'login' && (
                    <div className="flex justify-between items-center px-1">
                      <button
                        type="button"
                        onClick={handleResetPassword}
                        className="text-[9px] font-black uppercase text-stone-500 hover:text-stone-300 transition-colors tracking-widest"
                      >
                        Lost your key?
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isAuthenticating}
                    className="w-full h-16 bg-forge-accent text-forge-dark rounded-2xl font-display font-black uppercase italic tracking-tighter hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 forge-glow"
                  >
                    {isAuthenticating ? (
                      <Loader2 className="animate-spin" size={24} />
                    ) : (
                      <>
                        <span className="text-xl">{forgeMode === 'login' ? 'Login' : 'Register'}</span>
                        <ChevronRight size={20} />
                      </>
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            <button
              onClick={() => { soundService.playClick(); onGuestAccess(); }}
              className="w-full py-4 mt-8 bg-white/5 text-stone-500 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} />
              Continue as Guest
            </button>
          </div>

          {/* Corner Branding */}
          <div className="absolute bottom-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <Hammer size={120} className="-rotate-12" />
          </div>
        </div>
      </motion.div>

      {/* Security Footer */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-12 flex items-center gap-3 px-6 py-3 bg-white/[0.02] border border-white/5 rounded-full backdrop-blur-sm"
      >
        <Shield size={12} className="text-forge-accent/50" />
        <span className="text-[10px] font-bold text-stone-600 uppercase tracking-widest">
          End-to-End Encryption • Forge Verified
        </span>
      </motion.div>
    </div>
  );
}
