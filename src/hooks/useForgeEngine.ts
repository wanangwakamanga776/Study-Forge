import React, { useCallback, useMemo } from 'react';
import { useAppState } from './useAppState';
import { soundService } from '../services/soundService';

export interface Reward {
  id: string;
  xp: number;
  embers: number;
  message: string;
}

export function useForgeEngine() {
  const { 
    state, 
    setState, 
    setAdminMaxLevel, 
    setAdminUnlimitedCurrency, 
    setAdminMaxEverything 
  } = useAppState();

  const getLevelFromXp = (xp: number) => {
    // Sync with ForgeStoreContext: 1000 XP per level
    return Math.floor(xp / 1000) + 1;
  };

  const getXpThreshold = (level: number) => {
    return (level - 1) * 1000;
  };

  const getLevelProgress = (xp: number) => {
    const currentLvl = getLevelFromXp(xp);
    const currentThreshold = (currentLvl - 1) * 1000;
    const nextThreshold = currentLvl * 1000;
    const progress = ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const awardStudySession = useCallback((score: number, baseXP = 50, baseEmbers = 5) => {
    const multiplier = 1 + score / 100;
    const xpGain = Math.round(baseXP * multiplier);
    const embersGain = Math.round(baseEmbers * multiplier);
    let leveledUp = false;

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
        leveledUp = true;
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

    if (leveledUp) {
      soundService.playLevelUp();
    } else {
      soundService.playSuccess();
    }

    return { xpGain, embersGain };
  }, [setState]);

  const value = React.useMemo(() => ({
    stats: state.stats,
    getLevelFromXp,
    getXpThreshold,
    getLevelProgress,
    awardStudySession,
    setAdminMaxLevel,
    setAdminUnlimitedCurrency,
    setAdminMaxEverything,
  }), [
    state.stats,
    getLevelFromXp,
    getXpThreshold,
    getLevelProgress,
    awardStudySession,
    setAdminMaxLevel,
    setAdminUnlimitedCurrency,
    setAdminMaxEverything
  ]);

  return value;
}
