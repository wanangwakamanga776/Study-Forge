import React from 'react';
import { motion } from 'motion/react';
import { Hammer, Flame, Shield, User } from 'lucide-react';
import { signInWithGoogle } from '../services/authService';
import { soundService } from '../services/soundService';

interface LoginPageProps {
  onGuestAccess: () => void;
}

export function LoginPage({ onGuestAccess }: LoginPageProps) {
  const handleGoogleSignIn = async () => {
    soundService.playClick();
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in failed", error);
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
        <div className="w-24 h-24 bg-forge-accent/10 rounded-3xl flex items-center justify-center mx-auto mb-6 forge-glow border border-forge-accent/20">
          <Flame size={48} className="text-forge-accent animate-pulse" />
        </div>
        <h1 className="text-6xl font-display font-black uppercase italic tracking-tighter text-white drop-shadow-[0_0_15px_rgba(251,146,60,0.3)]">
          Study Forge
        </h1>
        <p className="text-stone-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-2">
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
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 py-4 bg-white text-forge-dark rounded-xl font-display font-black uppercase italic tracking-tighter hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(255,255,255,0.1)]"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Continue with Google
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
