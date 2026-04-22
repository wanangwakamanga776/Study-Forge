import { useCallback } from 'react';
import { useAppState } from './useAppState';
import { soundService } from '../services/soundService';

export interface Reward {
  id: string;
  xp: number;
  embers: number;
  message: string;
}

export function useForgeEngine() {
  const { state, setState } = useAppState();

  const getLevelFromXp = (xp: number) => {
    // n=1: 500
    // n=2: 1500
    // n=3: 3000
    // Formula: 500 * (n * (n + 1)) / 2
    // Let 500 * (n * (n + 1)) / 2 = xp
    // n^2 + n - (2*xp/500) = 0
    // n = (-1 + sqrt(1 + 8*xp/500)) / 2
    if (xp <= 0) return 1;
    const n = Math.floor((-1 + Math.sqrt(1 + (8 * xp) / 500)) / 2);
    return n + 1;
  };

  const getXpThreshold = (level: number) => {
    return (500 * level * (level + 1)) / 2;
  };

  const getLevelProgress = (xp: number) => {
    const level = getLevelFromXp(xp);
    const currentThreshold = level === 1 ? 0 : getXpThreshold(level - 1);
    const nextThreshold = getXpThreshold(level);
    const progress = ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const awardStudySession = useCallback((score: number, baseXP = 50, baseEmbers = 5) => {
    const multiplier = 1 + score / 100;
    const xpGain = Math.round(baseXP * multiplier);
    const embersGain = Math.round(baseEmbers * multiplier);

    setState(prev => {
      const newXp = prev.stats.xp + xpGain;
      const newEmbers = (prev.stats.embers || 0) + embersGain;
      const newLevel = getLevelFromXp(newXp);
      
      const today = new Date().toISOString().split('T')[0];
      let newStreak = prev.stats.streak;
      
      if (prev.stats.lastActiveDate !== today) {
        const lastActive = prev.stats.lastActiveDate ? new Date(prev.stats.lastActiveDate) : null;
        const now = new Date();
        
        if (lastActive) {
          const diffInMs = now.getTime() - lastActive.getTime();
          const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
          
          if (diffInDays <= 1.5) { // Within 36 hours (grace period)
            newStreak += 1;
          } else {
            newStreak = 1;
          }
        } else {
          newStreak = 1;
        }
      }

      if (newLevel > prev.stats.level) {
        soundService.playLevelUp();
      } else {
        soundService.playSuccess();
      }

      return {
        ...prev,
        stats: {
          ...prev.stats,
          xp: newXp,
          embers: newEmbers,
          level: newLevel,
          streak: newStreak,
          lastActiveDate: today,
        }
      };
    });

    // We can also trigger notifications here if we had a notification context
    return { xpGain, embersGain };
  }, [setState]);

  const setAdminMaxLevel = useCallback((active: boolean) => {
    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        xp: active ? 1000000 : 0,
        level: getLevelFromXp(active ? 1000000 : 0),
        plan: active ? 'Premium' : prev.stats.plan
      }
    }));
    if (active) soundService.playLevelUp();
  }, [setState, getLevelFromXp]);

  const setAdminUnlimitedCurrency = useCallback((active: boolean) => {
    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        embers: active ? 999999 : 100
      }
    }));
    if (active) soundService.playSuccess();
  }, [setState]);

  return {
    stats: state.stats,
    getLevelFromXp,
    getXpThreshold,
    getLevelProgress,
    awardStudySession,
    setAdminMaxLevel,
    setAdminUnlimitedCurrency,
  };
}
