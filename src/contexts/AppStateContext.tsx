import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState } from '../types';
import { INITIAL_STATE } from '../constants';
import { soundService } from '../services/soundService';

interface AppStateContextType {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  deleteForgeCast: (id: string) => void;
  setAdminMaxLevel: (active: boolean) => void;
  setAdminUnlimitedCurrency: (active: boolean) => void;
  setAdminMaxEverything: () => void;
  resetToDefault: () => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
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
    }, 1000);

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

  const deleteForgeCast = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      forgeCasts: prev.forgeCasts.filter(fc => fc.id !== id)
    }));
    soundService.playClick();
  }, []);

  const setAdminMaxLevel = useCallback((active: boolean) => {
    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        xp: active ? 1000000 : 0,
        level: active ? 100 : 1
      }
    }));
    if (active) soundService.playSuccess();
  }, []);

  const setAdminUnlimitedCurrency = useCallback((active: boolean) => {
    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        embers: active ? 1000000 : 100
      }
    }));
    if (active) soundService.playSuccess();
  }, []);

  const setAdminMaxEverything = useCallback(() => {
    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        xp: 1000000,
        level: 100,
        embers: 1000000,
        streak: 99,
        currentTheme: 'Inferno',
        unlockedThemes: [...new Set([...prev.stats.unlockedThemes, 'Inferno', 'Nebula Pulse', 'Matrix Code', 'Abyssal Current'])]
      }
    }));
    soundService.playSuccess();
  }, []);

  const resetToDefault = useCallback(() => {
    setState(INITIAL_STATE);
    localStorage.removeItem('studysprint_state');
  }, []);

  return (
    <AppStateContext.Provider value={{ 
      state, 
      setState, 
      deleteForgeCast,
      setAdminMaxLevel,
      setAdminUnlimitedCurrency,
      setAdminMaxEverything,
      resetToDefault
    }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppStateContext() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppStateContext must be used within an AppStateProvider');
  }
  return context;
}
