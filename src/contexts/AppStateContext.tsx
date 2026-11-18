import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, Deck, Quiz, Task, ForgeCastBlueprint, LessonArchitectAudit, ModeEngineSession } from '../types';
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
import { storageService } from '../services/storageService';
import { clearGenericLocalDB } from '../services/storageManager';

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
  const [state, setInternalState] = useState<AppState>(INITIAL_STATE);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const isSyncingFromFirestore = useRef(false);
  const hasLoadedFromCloud = useRef(false);

  const setState: React.Dispatch<React.SetStateAction<AppState>> = useCallback((update) => {
    setInternalState(prev => {
      const newState = typeof update === 'function' ? (update as any)(prev) : update;
      return newState;
    });
  }, []);

  const deleteForgeCast = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      forgeCasts: prev.forgeCasts.filter(fc => fc.id !== id)
    }));
    if (user) {
        deleteUserItem(user.uid, 'forgeCasts', id);
    }
    soundService.playClick();
  }, [user, setState]);

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
  }, [setState]);

  const setAdminUnlimitedCurrency = useCallback((active: boolean) => {
    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        embers: active ? 1000000 : 100
      }
    }));
    if (active) soundService.playSuccess();
  }, [setState]);

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
  }, [setState]);

  const resetToDefault = useCallback(async () => {
    setState(INITIAL_STATE);
    await storageService.clearAll();
    try {
      await clearGenericLocalDB('forge_chat_history');
    } catch (e) {}
  }, [setState]);

  // Load initial local state (Guest or Offline backup)
  useEffect(() => {
    const hydrate = async () => {
      try {
        const localData = await storageService.loadFullState();
        if (localData) {
          setInternalState(prev => ({
            ...prev,
            ...localData,
            stats: {
              ...prev.stats,
              ...(localData.stats || {}),
              aiUsage: {
                ...prev.stats.aiUsage,
                ...(localData.stats?.aiUsage || {}),
              }
            }
          }));
        }

        // Cleanup legacy storage to free up space
        localStorage.removeItem('studysprint_state');
      } catch (e) {
        console.error('Failed to hydrate local state:', e);
      }
    };
    hydrate();
  }, []);

  // Persist to local storage & IndexedDB (Auto-save for guests/offline)
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      try {
        await storageService.saveStats(state.stats);
        await storageService.saveCollection('decks', state.decks);
        await storageService.saveCollection('quizzes', state.quizzes);
        await storageService.saveCollection('tasks', state.tasks);
        await storageService.saveCollection('forgeCasts', state.forgeCasts);
        await storageService.saveCollection('lessons', state.lessons);
        await storageService.saveCollection('sessions', state.sessions);
      } catch (e) {
        console.error('Failed to save to local storage/IndexedDB:', e);
      }
    }, 2000);
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
        setTimeout(() => {
          setInternalState(prev => ({
            ...prev,
            stats: { ...prev.stats, ...cloudStats }
          }));
        }, 0);
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
      setTimeout(() => {
        setInternalState(prev => ({ ...prev, decks: cloudDecks }));
      }, 0);
      hasLoadedFromCloud.current = true;
      setTimeout(() => isSyncingFromFirestore.current = false, 500);
    }));

    unsubscribes.push(syncUserCollection<Quiz>(user.uid, 'quizzes', (cloudQuizzes) => {
      isSyncingFromFirestore.current = true;
      setTimeout(() => {
        setInternalState(prev => ({ ...prev, quizzes: cloudQuizzes }));
      }, 0);
      hasLoadedFromCloud.current = true;
      setTimeout(() => isSyncingFromFirestore.current = false, 500);
    }));

    unsubscribes.push(syncUserCollection<Task>(user.uid, 'tasks', (cloudTasks) => {
      isSyncingFromFirestore.current = true;
      setTimeout(() => {
        setInternalState(prev => ({ ...prev, tasks: cloudTasks }));
      }, 0);
      hasLoadedFromCloud.current = true;
      setTimeout(() => isSyncingFromFirestore.current = false, 500);
    }));

    unsubscribes.push(syncUserCollection<ForgeCastBlueprint>(user.uid, 'forgeCasts', (cloudCasts) => {
      isSyncingFromFirestore.current = true;
      setTimeout(() => {
        setInternalState(prev => ({ ...prev, forgeCasts: cloudCasts }));
      }, 0);
      hasLoadedFromCloud.current = true;
      setTimeout(() => isSyncingFromFirestore.current = false, 500);
    }));

    unsubscribes.push(syncUserCollection<LessonArchitectAudit>(user.uid, 'lessons', (cloudLessons) => {
      isSyncingFromFirestore.current = true;
      setTimeout(() => {
        setInternalState(prev => ({ ...prev, lessons: cloudLessons }));
      }, 0);
      hasLoadedFromCloud.current = true;
      setTimeout(() => isSyncingFromFirestore.current = false, 500);
    }));

    unsubscribes.push(syncUserCollection<ModeEngineSession>(user.uid, 'sessions', (cloudSessions) => {
      isSyncingFromFirestore.current = true;
      setTimeout(() => {
        setInternalState(prev => ({ ...prev, sessions: cloudSessions }));
      }, 0);
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
        forgeCasts: state.forgeCasts,
        lessons: state.lessons,
        sessions: state.sessions
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
            const collections: ('decks' | 'quizzes' | 'tasks' | 'forgeCasts' | 'lessons' | 'sessions')[] = ['decks', 'quizzes', 'tasks', 'forgeCasts', 'lessons', 'sessions'];
            
            collections.forEach(col => {
                const currentItems = (state[col] || []) as any[];
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
              studyGuides: 0,
              lessons: 0,
              lastResetDate: today,
            }
          }
        };
      });
    }
  }, [state.stats?.aiUsage?.lastResetDate, setState]);

  const value = React.useMemo(() => ({ 
    state, 
    setState, 
    deleteForgeCast,
    setAdminMaxLevel,
    setAdminUnlimitedCurrency,
    setAdminMaxEverything,
    resetToDefault,
    isSyncing,
    syncError
  }), [
    state, 
    setState, 
    deleteForgeCast, 
    setAdminMaxLevel, 
    setAdminUnlimitedCurrency, 
    setAdminMaxEverything, 
    resetToDefault, 
    isSyncing, 
    syncError
  ]);

  return (
    <AppStateContext.Provider value={value}>
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
