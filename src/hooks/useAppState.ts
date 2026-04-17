import { useState, useEffect, useCallback } from 'react';
import { AppState } from '../types';
import { INITIAL_STATE } from '../constants';
import { soundService } from '../services/soundService';

export function useAppState() {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem('studysprint_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_STATE,
          ...parsed,
          stats: {
            ...INITIAL_STATE.stats,
            ...(parsed.stats || {}),
            aiUsage: {
              ...INITIAL_STATE.stats.aiUsage,
              ...(parsed.stats?.aiUsage || {}),
            }
          }
        };
      }
    } catch (e) {
      console.error('Failed to load state:', e);
    }
    return INITIAL_STATE;
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem('studysprint_state', JSON.stringify(state));
      } catch (e) {
        console.error('Failed to save state:', e);
      }
    }, 1000); // Debounce save by 1 second

    return () => clearTimeout(timeoutId);
  }, [state]);

  // Reset daily limits
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (state.stats?.aiUsage?.lastResetDate !== today) {
      setState(prev => {
        if (prev.stats?.aiUsage?.lastResetDate === today) return prev;
        return {
          ...prev,
          stats: {
            ...prev.stats,
            aiUsage: {
              ...prev.stats.aiUsage,
              quizzes: 0,
              flashcards: 0,
              forgeCasts: 0,
              lastResetDate: today,
            }
          }
        };
      });
    }
  }, [state.stats?.aiUsage?.lastResetDate]);

  const updateStats = useCallback((xpGain: number) => {
    setState(prev => {
      const newXp = prev.stats.xp + xpGain;
      const newLevel = Math.floor(newXp / 100) + 1;
      
      if (newLevel > prev.stats.level) {
        soundService.playLevelUp();
      }
      
      const today = new Date().toISOString().split('T')[0];
      let newStreak = prev.stats.streak;
      
      if (prev.stats.lastActiveDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (prev.stats.lastActiveDate === yesterdayStr) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }
      }

      return {
        ...prev,
        stats: {
          ...prev.stats,
          xp: newXp,
          level: newLevel,
          streak: newStreak,
          lastActiveDate: today,
        }
      };
    });
  }, []);

  const deleteForgeCast = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      forgeCasts: prev.forgeCasts.filter(fc => fc.id !== id)
    }));
    soundService.playClick();
  }, []);

  return { state, setState, updateStats, deleteForgeCast };
}
