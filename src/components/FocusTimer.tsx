import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Zap, Loader2, Play, Pause, RotateCcw, AlertTriangle, ShieldCheck, Flame } from 'lucide-react';
import { useForgeStore } from '../contexts/ForgeStoreContext';
import { soundService } from '../services/soundService';
import { cn } from '../lib/utils';

const WORK_TIME = 25 * 60; // 25 minutes
const REWARD_XP = 100;
const REWARD_EMBERS = 50;
const CHEAT_WARNING_THRESHOLD = 10000; // 10 seconds

export const FocusTimer: React.FC = () => {
  const { awardXP, completeFocusSession } = useForgeStore();
  const [timeLeft, setTimeLeft] = useState(WORK_TIME);
  const [isActive, setIsActive] = useState(false);
  const [isCheatWarning, setIsCheatWarning] = useState(false);
  const [cheatTime, setCheatTime] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastVisibilityRef = useRef(Date.now());
  const cheatTimerRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinish = useCallback(async () => {
    setIsActive(false);
    soundService.playSuccess();
    if (completeFocusSession) {
      await completeFocusSession(REWARD_XP, REWARD_EMBERS);
    } else {
      awardXP(REWARD_XP);
    }
    setTimeLeft(WORK_TIME);
  }, [awardXP, completeFocusSession]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleFinish();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, handleFinish]);

  // Anti-Cheat Logic
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (isActive) {
          lastVisibilityRef.current = Date.now();
          // Start counting cheat time
          cheatTimerRef.current = setInterval(() => {
            const hiddenDuration = Date.now() - lastVisibilityRef.current;
            if (hiddenDuration > CHEAT_WARNING_THRESHOLD) {
              setIsCheatWarning(true);
              setIsActive(false); // Pauses the timer
              soundService.playSmelt(); // Warning sound
            }
          }, 1000);
        }
      } else {
        // Returned to page
        if (cheatTimerRef.current) {
          clearInterval(cheatTimerRef.current);
          cheatTimerRef.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isActive]);

  const toggleTimer = () => {
    soundService.playClick();
    if (isCheatWarning) {
      setIsCheatWarning(false);
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    soundService.playClick();
    setIsActive(false);
    setIsCheatWarning(false);
    setTimeLeft(WORK_TIME);
  };

  const progress = ((WORK_TIME - timeLeft) / WORK_TIME) * 100;

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-4xl font-display font-black uppercase italic tracking-tighter text-white mb-2">Focus Forge</h2>
        <p className="text-stone-500 text-[10px] font-bold uppercase tracking-widest">Master your time, Smelt your distractions</p>
      </div>

      <div className="relative aspect-square glass-card rounded-full p-12 flex flex-col items-center justify-center border border-white/5 overflow-hidden group shadow-[0_0_100px_rgba(251,146,60,0.05)]">
        {/* Progress Ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="48%"
            className="fill-none stroke-white/5"
            strokeWidth="4"
          />
          <motion.circle
            cx="50%"
            cy="50%"
            r="48%"
            className="fill-none stroke-forge-accent"
            strokeWidth="4"
            strokeDasharray="100 100"
            initial={{ strokeDashoffset: 100 }}
            animate={{ strokeDashoffset: 100 - progress }}
            transition={{ duration: 1, ease: "linear" }}
            strokeLinecap="round"
          />
        </svg>

        {/* Inner Content */}
        <div className="relative z-10 text-center space-y-2">
          <motion.div 
            animate={isActive ? { scale: [1, 1.05, 1] } : { scale: 1 }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-7xl sm:text-8xl font-display font-black tracking-tighter text-white italic drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            {formatTime(timeLeft)}
          </motion.div>
          <div className="flex items-center justify-center gap-2 text-stone-500 font-black uppercase tracking-widest text-[10px]">
            {isActive ? (
              <>
                <Zap size={12} className="text-forge-accent animate-pulse" />
                Forge is Hot
              </>
            ) : timeLeft < WORK_TIME ? (
              <>
                <ShieldCheck size={12} />
                Forge Idle
              </>
            ) : (
              'Ready for Smelting'
            )}
          </div>
        </div>

        {/* Background Ambience */}
        <div className={cn(
          "absolute inset-0 bg-forge-accent/5 opacity-0 transition-opacity duration-1000",
          isActive && "opacity-100"
        )} />
      </div>

      {/* Warning Modal Overlay */}
      <AnimatePresence>
        {isCheatWarning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-50 glass-card rounded-[2.5rem] bg-orange-950/40 backdrop-blur-xl border border-forge-accent/30 flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="w-20 h-20 bg-forge-accent/20 text-forge-accent rounded-full flex items-center justify-center mb-6 forge-glow">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter text-white mb-2">The Forge Cools Down</h3>
            <p className="text-stone-300 text-sm mb-8 leading-relaxed">
              "Master Smith says: Focus requires presence! Your attention drifted, and the fires have dimmed."
            </p>
            <button
              onClick={toggleTimer}
              className="px-8 py-3 bg-forge-accent text-forge-dark rounded-xl font-display font-black uppercase italic tracking-tighter hover:scale-105 transition-transform"
            >
              Re-Light the Forge
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-center gap-6">
        <button
          onClick={resetTimer}
          className="p-5 bg-white/5 text-stone-500 rounded-3xl hover:text-white transition-colors border border-white/5"
          title="Reset Forge"
        >
          <RotateCcw size={28} />
        </button>
        
        <button
          onClick={toggleTimer}
          className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 forge-glow",
            isActive 
              ? "bg-white/5 text-forge-accent border border-forge-accent/20" 
              : "bg-forge-accent text-forge-dark hover:scale-105"
          )}
        >
          {isActive ? <Pause size={40} /> : <Play size={40} className="ml-2" />}
        </button>

        <div className="p-5 bg-white/5 text-stone-700 rounded-3xl border border-white/5" title="Rewards">
           <div className="flex items-center gap-2 text-stone-400 font-black text-xs">
              <Flame size={14} className="text-forge-accent" fill="currentColor" />
              {REWARD_EMBERS}
           </div>
           <div className="mt-1 text-[8px] font-black uppercase tracking-widest text-stone-600">Reward</div>
        </div>
      </div>
      
      <div className="p-6 glass-card rounded-[2rem] border border-white/5 flex items-center gap-6">
        <div className="w-12 h-12 bg-forge-accent/10 rounded-2xl flex items-center justify-center text-forge-accent">
          <ShieldCheck size={24} />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-black text-white uppercase tracking-widest mb-1">Purity Protocol</h4>
          <p className="text-xs text-stone-500 leading-relaxed font-medium">Keep this tab active. The Smith detects absences. Stray for more than 10s, and the forge cools.</p>
        </div>
      </div>
    </div>
  );
};
