import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAppState } from '../hooks/useAppState';
import { useRewards } from '../components/RewardToast';
import { soundService } from '../services/soundService';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Star, Flame, CloudCheck, CloudOff, RefreshCw } from 'lucide-react';
import { useAuth } from '../services/authService';
import { saveUserStats, loadUserStats, incrementUserStats } from '../services/dataService';
import { UserStats } from '../types';

interface ForgeStoreContextType {
  xp: number;
  level: number;
  embers: number;
  awardXP: (amount: number) => void;
  spendEmbers: (amount: number) => boolean;
  completeFocusSession: (xp: number, embers: number) => Promise<void>;
  currentTheme: string;
  setTheme: (theme: string) => void;
  unlockedThemes: string[];
  unlockTheme: (theme: string) => void;
  isSyncing: boolean;
  syncError: boolean;
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
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
          triggerReward(0, 0, "Session Initialized");
        } else {
          // Initialize New User
          const initialStats: UserStats = {
            xp: 0,
            level: 1,
            streak: 0,
            embers: 100,
            name: user.displayName || 'Student',
            avatarUrl: user.photoURL,
            lastActiveDate: new Date().toISOString().split('T')[0],
            currentTheme: 'Default Ember',
            unlockedThemes: ['Default Ember'],
            aiUsage: {
              quizzes: 0,
              flashcards: 0,
              forgeCasts: 0,
              lastResetDate: new Date().toISOString()
            },
            plan: 'Free'
          };
          saveUserStats(user.uid, initialStats);
          setState(prev => ({
            ...prev,
            stats: initialStats
          }));
          triggerReward(0, 0, "New Profile Created");
        }
        isInitialLoad.current = false;
      });
    } else if (!user) {
      isInitialLoad.current = true;
    }
  }, [user, setState, triggerReward]);

  // Cloud Sync: Save stats on change
  useEffect(() => {
    if (user && !isInitialLoad.current) {
      setIsSyncing(true);
      setSyncError(false);
      saveUserStats(user.uid, state.stats)
        .then(() => {
          setTimeout(() => setIsSyncing(false), 2000); // Keep status visible for a bit
        })
        .catch(() => {
          setIsSyncing(false);
          setSyncError(true);
        });
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
      triggerReward(amount, Math.round(amount/5), "Session Complete!");

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

  const completeFocusSession = useCallback(async (xpAmount: number, embersAmount: number) => {
    if (user) {
      setIsSyncing(true);
      try {
        await incrementUserStats(user.uid, xpAmount, embersAmount);
        awardXP(xpAmount); // This handles the local XP/Level/Streak and also fires a standard Reward Toast
        // Embers are also updated locally via awardXP logic, but we've already done the cloud update atomically.
        // The standard reward toast is handled by awardXP.
      } catch (error) {
        setSyncError(true);
      } finally {
        setTimeout(() => setIsSyncing(false), 2000);
      }
    } else {
      awardXP(xpAmount);
    }
  }, [user, awardXP]);

  return (
    <ForgeStoreContext.Provider value={{
      xp,
      level,
      embers,
      awardXP,
      spendEmbers,
      completeFocusSession,
      currentTheme,
      setTheme,
      unlockedThemes,
      unlockTheme,
      isSyncing,
      syncError
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
              <p className="text-stone-500 font-bold uppercase tracking-widest text-xs mb-8">You have reached Level {leveledTo}</p>
              
              <div className="flex justify-center gap-4 mb-8">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                    <Star size={16} className="text-forge-accent fill-current" />
                    <span className="text-sm font-black text-white">New Features Unlocked</span>
                </div>
              </div>

              <button
                onClick={() => setShowLevelUp(false)}
                className="w-full py-4 bg-forge-accent text-forge-dark rounded-xl font-display font-black uppercase italic tracking-tighter hover:scale-105 transition-transform forge-glow"
              >
                Continue Learning
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
