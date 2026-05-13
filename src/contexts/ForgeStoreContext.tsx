import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAppState } from '../hooks/useAppState';
import { useRewards } from '../components/RewardToast';
import { soundService } from '../services/soundService';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Star, Flame, CloudCheck, CloudOff, RefreshCw } from 'lucide-react';
import { useAuthContext } from './AuthContext';
import { incrementUserStats } from '../services/dataService';
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
  unlockSkin: (skin: string) => void;
  setSkin: (skin: string) => void;
  unlockItem: (id: string) => void;
  addBadge: (badge: string) => void;
  activateBooster: (type: 'Power Hour') => void;
  trackQuestProgress: (id: string, amount?: number) => void;
  activeAssistantSkin: string;
  unlockedSkins: string[];
  unlockedItems: string[];
  badges: string[];
  isSyncing: boolean;
  syncError: boolean;
}

const ForgeStoreContext = createContext<ForgeStoreContextType | undefined>(undefined);

export const THEMES = {
  'Default Ember': '#FB923C',
  'Abyssal Current': '#3B82F6',
  'Nebula Pulse': '#A855F7',
  'Matrix Code': '#22C55E',
  'Inferno': '#EF4444',
};

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
}

export function ForgeStoreProvider({ children }: { children: React.ReactNode }) {
  const { state, setState } = useAppState();
  const { user } = useAuthContext();
  const { triggerReward } = useRewards();
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [leveledTo, setLeveledTo] = useState(1);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);

  const { xp, level, embers, currentTheme, unlockedThemes, activeAssistantSkin = 'Default', unlockedSkins = ['Default'], unlockedItems = [], badges = [], activeBoosters = [] } = state.stats;

  // Level Up logic to credit Embers
  const [lastLevelCredit, setLastLevelCredit] = useState(level);

  useEffect(() => {
    if (level > lastLevelCredit) {
      const diff = level - lastLevelCredit;
      const creditAmount = diff * 100;
      setState(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          embers: (prev.stats.embers || 0) + creditAmount
        }
      }));
      setLastLevelCredit(level);
    }
  }, [level, lastLevelCredit, setState]);

  // Cloud Sync is handled by AppStateContext. 
  // We only provide UI indicators here if needed, but AppStateContext.tsx is the authority.

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
    let newLevelVal = 1;
    let leveledUp = false;
    let embersGain = 0;

    setState(prev => {
      const today = new Date().toISOString().split('T')[0];
      const newXP = prev.stats.xp + amount;
      const newLevel = Math.floor(newXP / 1000) + 1;
      
      // Calculate Embers with Booster
      const isPowerHourActive = prev.stats.activeBoosters?.some(b => b.type === 'Power Hour' && b.expiresAt > Date.now());
      const baseEmbers = Math.round(amount / 5);
      const earned = isPowerHourActive ? baseEmbers * 2 : baseEmbers;
      
      const newEmbers = (prev.stats.embers || 0) + earned;
      
      newLevelVal = newLevel;
      embersGain = earned;

      let newStreak = prev.stats.streak;
      if (prev.stats.lastActiveDate !== today) {
        const lastActive = prev.stats.lastActiveDate ? new Date(prev.stats.lastActiveDate) : null;
        if (lastActive) {
          const diffInMs = new Date().getTime() - lastActive.getTime();
          const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
          if (diffInDays <= 1.5) {
            newStreak += 1;
          } else {
            // CHECK FOR STREAK FREEZE
            const hasStreakFreeze = prev.stats.unlockedItems?.includes('streak_freeze');
            if (hasStreakFreeze) {
              // Consume streak freeze
              const updatedItems = prev.stats.unlockedItems.filter(id => id !== 'streak_freeze');
              return {
                ...prev,
                stats: {
                  ...prev.stats,
                  unlockedItems: updatedItems,
                  lastActiveDate: today, // "Save" it
                  streak: (prev.stats.streak || 0) + 1
                }
              };
            }
            newStreak = 1;
          }
        } else {
          newStreak = 1;
        }
      }

      if (newLevel > prev.stats.level) {
        leveledUp = true;
      }

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

    // Side effects outside state updater
    if (leveledUp) {
      setLeveledTo(newLevelVal);
      setShowLevelUp(true);
      soundService.playLevelUp();
    } else if (amount > 0) {
      soundService.playSuccess();
    }

    if (amount > 0 || embersGain > 0) {
      triggerReward(amount, embersGain, "Session Complete!");
    }
  }, [setState, triggerReward]);

  const spendEmbers = useCallback((amount: number) => {
    if (embers >= amount) {
      setState(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          embers: prev.stats.embers - amount
        }
      }));
      return true;
    }
    return false;
  }, [embers, setState]);

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
    setState(prev => {
      const newUnlocked = [...new Set([...prev.stats.unlockedThemes, theme])];
      return {
        ...prev,
        stats: {
          ...prev.stats,
          unlockedThemes: newUnlocked,
          currentTheme: theme // Auto-apply on purchase/unlock
        }
      };
    });
  }, [setState]);

  const unlockSkin = useCallback((skin: string) => {
    setState(prev => {
      const newUnlocked = [...new Set([...(prev.stats.unlockedSkins || ['Default']), skin])];
      return {
        ...prev,
        stats: {
          ...prev.stats,
          unlockedSkins: newUnlocked,
          activeAssistantSkin: skin as any
        }
      };
    });
  }, [setState]);

  const setSkin = useCallback((skin: string) => {
    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        activeAssistantSkin: skin as any
      }
    }));
  }, [setState]);

  const unlockItem = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        unlockedItems: [...new Set([...(prev.stats.unlockedItems || []), id])]
      }
    }));
  }, [setState]);

  const addBadge = useCallback((badge: string) => {
    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        badges: [...new Set([...(prev.stats.badges || []), badge])]
      }
    }));
  }, [setState]);

  const activateBooster = useCallback((type: 'Power Hour') => {
    const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour
    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        activeBoosters: [...(prev.stats.activeBoosters || []), { type, expiresAt }]
      }
    }));
  }, [setState]);

  const trackQuestProgress = useCallback((id: string, amount: number = 1) => {
    const saved = localStorage.getItem('forge_quests_data');
    if (saved) {
      const quests = JSON.parse(saved);
      let awarded = false;
      let xpAward = 0;

      const newQuests = quests.map((q: any) => {
        if (q.id === id && !q.completed) {
          const nextCurrent = Math.min(q.target, q.current + amount);
          const isNowCompleted = nextCurrent >= q.target;
          if (isNowCompleted) {
            awarded = true;
            xpAward = q.rewardXP;
          }
          return { ...q, current: nextCurrent, completed: isNowCompleted };
        }
        return q;
      });

      localStorage.setItem('forge_quests_data', JSON.stringify(newQuests));
      if (awarded) {
        awardXP(xpAward);
      }
      
      // Dispatch custom event so components can refresh
      window.dispatchEvent(new CustomEvent('forge_quests_updated'));
    }
  }, [awardXP]);

  const completeFocusSession = useCallback(async (xpAmount: number, embersAmount: number) => {
    // Check for Early Bird Achievement (before 7:00 AM)
    const hour = new Date().getHours();
    let bonusEmbers = 0;
    if (hour < 7) {
      bonusEmbers = 50;
      addBadge('Early Bird');
    }

    trackQuestProgress('focus_session', 1);

    const finalXP = xpAmount;
    const finalEmbers = embersAmount + bonusEmbers;

    if (user) {
      setIsSyncing(true);
      try {
        await incrementUserStats(user.uid, finalXP, finalEmbers);
        awardXP(finalXP); 
      } catch (error) {
        setSyncError(true);
      } finally {
        setTimeout(() => setIsSyncing(false), 2000);
      }
    } else {
      awardXP(finalXP);
    }
  }, [user, awardXP, addBadge]);

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
      unlockSkin,
      setSkin,
      unlockItem,
      addBadge,
      activateBooster,
      trackQuestProgress,
      activeAssistantSkin,
      unlockedSkins,
      unlockedItems,
      badges,
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
