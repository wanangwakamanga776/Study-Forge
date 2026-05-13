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
  isSyncing: boolean;
  syncError: boolean;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const isSyncingFromFirestore = useRef(false);
  const hasLoadedFromCloud = useRef(false);

  // Load initial local state (Guest or Offline backup)
  useEffect(() => {
    // Only load local storage if not already logged in? 
    // Actually, we load it as a baseline, but Cloud will overwrite.
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
    hasLoadedFromCloud.current = false;

    // 1. Sync User Stats
    unsubscribes.push(subscribeUserStats(user.uid, (cloudStats) => {
      if (cloudStats) {
        isSyncingFromFirestore.current = true;
        setState(prev => ({
            ...prev,
            stats: { ...prev.stats, ...cloudStats }
        }));
        hasLoadedFromCloud.current = true;
        setTimeout(() => isSyncingFromFirestore.current = false, 500);
      } else {
        // Initialize New User
        const initialStats = { ...INITIAL_STATE.stats, name: user.displayName || 'Hero' };
        syncUserStats(user.uid, initialStats).then(() => {
             hasLoadedFromCloud.current = true;
        });
      }
    }));

    // 2. Sync Collections
    unsubscribes.push(syncUserCollection<Deck>(user.uid, 'decks', (cloudDecks) => {
      isSyncingFromFirestore.current = true;
      setState(prev => ({ ...prev, decks: cloudDecks }));
      hasLoadedFromCloud.current = true;
      setTimeout(() => isSyncingFromFirestore.current = false, 500);
    }));

    unsubscribes.push(syncUserCollection<Quiz>(user.uid, 'quizzes', (cloudQuizzes) => {
      isSyncingFromFirestore.current = true;
      setState(prev => ({ ...prev, quizzes: cloudQuizzes }));
      hasLoadedFromCloud.current = true;
      setTimeout(() => isSyncingFromFirestore.current = false, 500);
    }));

    unsubscribes.push(syncUserCollection<Task>(user.uid, 'tasks', (cloudTasks) => {
      isSyncingFromFirestore.current = true;
      setState(prev => ({ ...prev, tasks: cloudTasks }));
      hasLoadedFromCloud.current = true;
      setTimeout(() => isSyncingFromFirestore.current = false, 500);
    }));

    unsubscribes.push(syncUserCollection<ForgeCastBlueprint>(user.uid, 'forgeCasts', (cloudCasts) => {
      isSyncingFromFirestore.current = true;
      setState(prev => ({ ...prev, forgeCasts: cloudCasts }));
      hasLoadedFromCloud.current = true;
      setTimeout(() => isSyncingFromFirestore.current = false, 500);
    }));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user]);

  // SINK TO CLOUD LOGIC (When local state changes, if not caused by Firestore sync)
  const lastPushedState = useRef<string>('');

  useEffect(() => {
    if (!user || isSyncingFromFirestore.current || !hasLoadedFromCloud.current) return;

    const currentStateStr = JSON.stringify({
        stats: state.stats,
        decks: state.decks,
        quizzes: state.quizzes,
        tasks: state.tasks,
        forgeCasts: state.forgeCasts
    });

    if (currentStateStr === lastPushedState.current) return;
    lastPushedState.current = currentStateStr;

    const pushToCloud = async () => {
        setIsSyncing(true);
        setSyncError(false);
        try {
            // Track what actually needs saving
            const lastState = lastPushedState.current ? JSON.parse(lastPushedState.current) : null;
            
            const syncTasks: Promise<any>[] = [];

            // 1. Stats Sync - Always safe to sync if string changed
            if (!lastState || JSON.stringify(state.stats) !== JSON.stringify(lastState.stats)) {
                syncTasks.push(syncUserStats(user.uid, state.stats));
            }
            
            // 2. Collection Sync - only save changed items
            // We use a small optimization: Firestore set with merge is mostly fine, 
            // but we can avoid some network overhead by strictly checking.
            const collections: ('decks' | 'quizzes' | 'tasks' | 'forgeCasts')[] = ['decks', 'quizzes', 'tasks', 'forgeCasts'];
            
            collections.forEach(col => {
                const currentItems = state[col] as any[];
                const lastItems = lastState ? (lastState[col] as any[]) : [];
                
                currentItems.forEach(item => {
                    const lastItem = lastItems.find(li => li.id === item.id);
                    if (!lastItem || JSON.stringify(item) !== JSON.stringify(lastItem)) {
                        syncTasks.push(saveUserItem(user.uid, col, item));
                    }
                });
            });

            if (syncTasks.length > 0) {
                await Promise.all(syncTasks);
            }
            
            lastPushedState.current = currentStateStr;
            setTimeout(() => setIsSyncing(false), 1000);
        } catch (error) {
            console.error("Cloud Sync Error:", error);
            setSyncError(true);
            setIsSyncing(false);
        }
    }

    // Use requestIdleCallback if available, otherwise fallback to setTimeout
    const scheduleSync = (callback: () => void) => {
        if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(callback, { timeout: 3000 });
        } else {
            setTimeout(callback, 0);
        }
    };

    const timeoutId = setTimeout(() => scheduleSync(pushToCloud), 2000); // Debounced and deferred
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
      resetToDefault,
      isSyncing,
      syncError
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
