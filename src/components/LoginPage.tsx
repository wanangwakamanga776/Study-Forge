import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Hammer, Flame, Shield, User, Loader2 } from 'lucide-react';
import { signInWithGoogle } from '../services/authService';
import { soundService } from '../services/soundService';

interface LoginPageProps {
  onGuestAccess: () => void;
}

export function LoginPage({ onGuestAccess }: LoginPageProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    if (isAuthenticating) return;
    
    soundService.playClick();
    setIsAuthenticating(true);
    setErrorMsg(null);
    
    try {
      await signInWithGoogle();
      // Success is handled by useAuth in App.tsx
    } catch (error: any) {
      console.error("Sign in failed", error);
      setErrorMsg(error.message || "The Forge failed to light.");
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen bg-forge-dark flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(251,146,60,0.05)_0%,transparent_70%)]" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-forge-accent/20 to-transparent" />
      
      {/* Cinematic Logo Section */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center mb-12 relative"
      >
        <div className="w-32 h-32 bg-forge-accent/20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 forge-glow border-2 border-forge-accent/40 shadow-[0_0_50px_rgba(251,146,60,0.2)]">
          <Flame size={64} className="text-forge-accent" />
        </div>
        <h1 className="text-8xl font-display font-black uppercase italic tracking-tighter text-white drop-shadow-[0_0_30px_rgba(251,146,60,0.5)]">
          Study Forge
        </h1>
        <p className="text-forge-accent/60 font-black uppercase tracking-[0.4em] text-[10px] mt-4">
          Smelt Knowledge • Forge Character
        </p>
      </motion.div>

      {/* Main Login Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="w-full max-w-sm bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 backdrop-blur-md relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Hammer size={80} className="text-white -rotate-12" />
        </div>

        <div className="space-y-6 relative z-10">
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-black uppercase text-red-500 tracking-widest text-center"
            >
              {errorMsg}
            </motion.div>
          )}
          <button
            onClick={handleGoogleSignIn}
            disabled={isAuthenticating}
            className="w-full flex items-center justify-center gap-3 py-4 bg-white text-forge-dark rounded-xl font-display font-black uppercase italic tracking-tighter hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAuthenticating ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Lighting the Forge...
              </>
            ) : (
              <>
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                Continue with Google
              </>
            )}
          </button>

          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-[10px] font-bold text-stone-600 uppercase tracking-widest">Or</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          <button
            onClick={() => {
              soundService.playClick();
              onGuestAccess();
            }}
            className="w-full flex items-center justify-center gap-3 py-4 bg-white/5 text-stone-400 border border-white/5 rounded-xl font-display font-black uppercase italic tracking-tighter hover:bg-white/10 hover:text-white transition-all"
          >
            <User size={20} />
            Enter as Guest
          </button>
          
          <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-4 flex gap-3">
            <Shield size={16} className="text-orange-500/50 shrink-0 mt-1" />
            <p className="text-[10px] text-stone-500 font-medium leading-relaxed">
              Quest status and Embers are only forged in the Cloud for Google users. Guest progress is stored locally.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Footer Decoration */}
      <div className="mt-12 opacity-30">
        <div className="h-px w-64 bg-gradient-to-r from-transparent via-stone-700 to-transparent" />
      </div>
    </div>
  );
}
