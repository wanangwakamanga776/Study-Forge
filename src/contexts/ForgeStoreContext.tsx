import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAppState } from '../hooks/useAppState';
import { useRewards } from '../components/RewardToast';
import { soundService } from '../services/soundService';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Star, Flame } from 'lucide-react';
import { useAuth } from '../services/authService';
import { saveUserStats, loadUserStats } from '../services/dataService';
import { UserStats } from '../types';

interface ForgeStoreContextType {
  xp: number;
  level: number;
  embers: number;
  awardXP: (amount: number) => void;
  spendEmbers: (amount: number) => boolean;
  currentTheme: string;
  setTheme: (theme: string) => void;
  unlockedThemes: string[];
  unlockTheme: (theme: string) => void;
}

const ForgeStoreContext = createContext<ForgeStoreContextType | undefined>(undefined);

export const THEMES = {
  'Default Ember': '#FB923C',
  'Deep Sea Blue': '#3B82F6',
  'Midnight Purple': '#A855F7',
};

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
}

export function ForgeStoreProvider({ children }: { children: React.ReactNode }) {
  const { state, setState } = useAppState();
  const { user } = useAuth();
  const { triggerReward } = useRewards();
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [leveledTo, setLeveledTo] = useState(1);
  const isInitialLoad = useRef(true);

  const { xp, level, embers, currentTheme, unlockedThemes } = state.stats;

  // Cloud Sync: Load stats on login
  useEffect(() => {
    if (user && isInitialLoad.current) {
      loadUserStats(user.uid).then(cloudStats => {
        if (cloudStats) {
          setState(prev => ({
            ...prev,
            stats: { ...prev.stats, ...cloudStats }
          }));
        }
        isInitialLoad.current = false;
      });
    } else if (!user) {
      isInitialLoad.current = true;
    }
  }, [user, setState]);

  // Cloud Sync: Save stats on change
  useEffect(() => {
    if (user && !isInitialLoad.current) {
      saveUserStats(user.uid, state.stats);
    }
  }, [state.stats, user]);

  // Apply theme to CSS variables
  useEffect(() => {
    const color = THEMES[currentTheme as keyof typeof THEMES] || THEMES['Default Ember'];
    const rgb = hexToRgb(color);
    document.documentElement.style.setProperty('--forge-accent', color);
    if (rgb) {
      document.documentElement.style.setProperty('--forge-accent-rgb', rgb);
    }
  }, [currentTheme]);

  const awardXP = useCallback((amount: number) => {
    setState(prev => {
      const today = new Date().toISOString().split('T')[0];
      const newXP = prev.stats.xp + amount;
      const newLevel = Math.floor(newXP / 1000) + 1;
      const newEmbers = (prev.stats.embers || 0) + Math.round(amount / 5);

      let newStreak = prev.stats.streak;
      if (prev.stats.lastActiveDate !== today) {
        const lastActive = prev.stats.lastActiveDate ? new Date(prev.stats.lastActiveDate) : null;
        if (lastActive) {
          const diffInMs = new Date().getTime() - lastActive.getTime();
          const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
          if (diffInDays <= 1.5) {
            newStreak += 1;
          } else {
            newStreak = 1;
          }
        } else {
          newStreak = 1;
        }
      }

      if (newLevel > prev.stats.level) {
        setLeveledTo(newLevel);
        setShowLevelUp(true);
        soundService.playLevelUp();
      }

      // Trigger standard reward toast
      triggerReward(amount, Math.round(amount/5), "Forge Activity Complete!");

      return {
        ...prev,
        stats: {
          ...prev.stats,
          xp: newXP,
          level: newLevel,
          embers: newEmbers,
          streak: newStreak,
          lastActiveDate: today,
        }
      };
    });
  }, [setState]);

  const spendEmbers = useCallback((amount: number) => {
    let success = false;
    setState(prev => {
      if (prev.stats.embers >= amount) {
        success = true;
        return {
          ...prev,
          stats: {
            ...prev.stats,
            embers: prev.stats.embers - amount
          }
        };
      }
      return prev;
    });
    return success;
  }, [setState]);

  const setTheme = useCallback((theme: string) => {
    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        currentTheme: theme
      }
    }));
  }, [setState]);

  const unlockTheme = useCallback((theme: string) => {
    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        unlockedThemes: [...new Set([...prev.stats.unlockedThemes, theme])]
      }
    }));
  }, [setState]);

  return (
    <ForgeStoreContext.Provider value={{
      xp,
      level,
      embers,
      awardXP,
      spendEmbers,
      currentTheme,
      setTheme,
      unlockedThemes,
      unlockTheme
    }}>
      {children}
      
      <AnimatePresence>
        {showLevelUp && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="max-w-sm w-full bg-forge-dark border border-forge-accent/30 rounded-[2.5rem] p-12 text-center relative overflow-hidden shadow-[0_0_50px_rgba(251,146,60,0.2)]"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-forge-accent" />
              <div className="w-24 h-24 bg-forge-accent/10 rounded-full flex items-center justify-center mx-auto mb-8 forge-glow">
                <Trophy size={48} className="text-forge-accent" />
              </div>
              <h2 className="text-4xl font-display font-black uppercase italic tracking-tighter text-white mb-2">Level Up!</h2>
              <p className="text-stone-500 font-bold uppercase tracking-widest text-xs mb-8">You have reached Rank {leveledTo}</p>
              
              <div className="flex justify-center gap-4 mb-8">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                    <Star size={16} className="text-forge-accent fill-current" />
                    <span className="text-sm font-black text-white">New Blueprint Slots</span>
                </div>
              </div>

              <button
                onClick={() => setShowLevelUp(false)}
                className="w-full py-4 bg-forge-accent text-forge-dark rounded-xl font-display font-black uppercase italic tracking-tighter hover:scale-105 transition-transform forge-glow"
              >
                Continue Ascent
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ForgeStoreContext.Provider>
  );
}

export function useForgeStore() {
  const context = useContext(ForgeStoreContext);
  if (!context) throw new Error('useForgeStore must be used within a ForgeStoreProvider');
  return context;
}
