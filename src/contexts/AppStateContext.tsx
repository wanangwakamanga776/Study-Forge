import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, Deck, Quiz, Task, ForgeCastBlueprint } from '../types';
import { INITIAL_STATE } from '../constants';
import { soundService } from '../services/soundService';
import { useAuthContext } from './AuthContext';
import { 
  syncUserCollection, 
  saveUserItem, 
  deleteUserItem, 
  subscribeUserStats, 
  syncUserStats 
} from '../services/dataService';

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
  const { user } = useAuthContext();
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const isSyncingFromFirestore = useRef(false);

  // Load initial local state (Guest or Offline backup)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('studysprint_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        setState(prev => ({
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
        }));
      }
    } catch (e) {
      console.error('Failed to load local state:', e);
    }
  }, []);

  // Persist to local storage (Auto-save for guests/offline)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem('studysprint_state', JSON.stringify(state));
      } catch (e) {
        console.error('Failed to save local state:', e);
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [state]);

  // CLOUD SYNC LOGIC
  useEffect(() => {
    if (!user) return;

    const unsubscribes: (() => void)[] = [];

    // 1. Sync User Stats
    unsubscribes.push(subscribeUserStats(user.uid, (cloudStats) => {
      if (cloudStats) {
        isSyncingFromFirestore.current = true;
        setState(prev => ({
          ...prev,
          stats: { ...prev.stats, ...cloudStats }
        }));
        setTimeout(() => isSyncingFromFirestore.current = false, 100);
      }
    }));

    // 2. Sync Collections
    unsubscribes.push(syncUserCollection<Deck>(user.uid, 'decks', (cloudDecks) => {
      isSyncingFromFirestore.current = true;
      setState(prev => ({ ...prev, decks: cloudDecks }));
      setTimeout(() => isSyncingFromFirestore.current = false, 100);
    }));

    unsubscribes.push(syncUserCollection<Quiz>(user.uid, 'quizzes', (cloudQuizzes) => {
      isSyncingFromFirestore.current = true;
      setState(prev => ({ ...prev, quizzes: cloudQuizzes }));
      setTimeout(() => isSyncingFromFirestore.current = false, 100);
    }));

    unsubscribes.push(syncUserCollection<Task>(user.uid, 'tasks', (cloudTasks) => {
      isSyncingFromFirestore.current = true;
      setState(prev => ({ ...prev, tasks: cloudTasks }));
      setTimeout(() => isSyncingFromFirestore.current = false, 100);
    }));

    unsubscribes.push(syncUserCollection<ForgeCastBlueprint>(user.uid, 'forgeCasts', (cloudCasts) => {
      isSyncingFromFirestore.current = true;
      setState(prev => ({ ...prev, forgeCasts: cloudCasts }));
      setTimeout(() => isSyncingFromFirestore.current = false, 100);
    }));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user]);

  // SINK TO CLOUD LOGIC (When local state changes, if not caused by Firestore sync)
  const lastPushedState = useRef<string>('');

  useEffect(() => {
    if (!user || isSyncingFromFirestore.current) return;

    const currentStateStr = JSON.stringify({
        stats: state.stats,
        decks: state.decks.map(d => d.id),
        quizzes: state.quizzes.map(q => q.id),
        tasks: state.tasks.map(t => t.id),
        forgeCasts: state.forgeCasts.map(f => f.id)
    });

    if (currentStateStr === lastPushedState.current) return;
    lastPushedState.current = currentStateStr;

    const pushToCloud = async () => {
        // Sync everything in chunks
        await syncUserStats(user.uid, state.stats);
        
        // Items are saved individually when created/edited via setters generally, 
        // but this effect captures any state change.
        // To be safe, we'll iterate and save (Firestore set with merge is efficient)
        state.decks.forEach(d => saveUserItem(user.uid, 'decks', d));
        state.quizzes.forEach(q => saveUserItem(user.uid, 'quizzes', q));
        state.tasks.forEach(t => saveUserItem(user.uid, 'tasks', t));
        state.forgeCasts.forEach(f => saveUserItem(user.uid, 'forgeCasts', f));
    }

    const timeoutId = setTimeout(pushToCloud, 2000); // Debounced cloud push
    return () => clearTimeout(timeoutId);
  }, [state, user]);

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
    if (user) {
        deleteUserItem(user.uid, 'forgeCasts', id);
    }
    soundService.playClick();
  }, [user]);

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
