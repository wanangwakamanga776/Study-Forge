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
    // Legacy support, now managed by ForgeStore
    console.warn("updateStats is deprecated. Use awardXP from ForgeStore instead.");
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
