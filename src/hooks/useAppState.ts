import { useState, useEffect } from 'react';
import { AppState } from '../types';
import { INITIAL_STATE } from '../constants';

export function useAppState() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('studysprint_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with INITIAL_STATE to ensure new fields exist
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
      } catch (e) {
        return INITIAL_STATE;
      }
    }
    return INITIAL_STATE;
  });

  useEffect(() => {
    localStorage.setItem('studysprint_state', JSON.stringify(state));
  }, [state]);

  // Reset daily limits
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (state.stats?.aiUsage?.lastResetDate !== today) {
      setState(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          aiUsage: {
            ...prev.stats.aiUsage,
            quizzes: 0,
            flashcards: 0,
            lastResetDate: today,
          }
        }
      }));
    }
  }, []);

  const updateStats = (xpGain: number) => {
    setState(prev => {
      const newXp = prev.stats.xp + xpGain;
      const newLevel = Math.floor(newXp / 100) + 1;
      
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
  };

  return { state, setState, updateStats };
}
