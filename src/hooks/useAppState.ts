import { useCallback } from 'react';
import { useAppStateContext } from '../contexts/AppStateContext';

export function useAppState() {
  const { 
    state, 
    setState, 
    deleteForgeCast, 
    setAdminMaxLevel, 
    setAdminUnlimitedCurrency, 
    setAdminMaxEverything,
    resetToDefault,
    isSyncing,
    syncError
  } = useAppStateContext();

  const updateStats = useCallback((xpGain: number) => {
    // Legacy support
    console.warn("updateStats is deprecated. Use awardXP from ForgeStore instead.");
  }, []);

  return { 
    state, 
    setState, 
    updateStats, 
    deleteForgeCast,
    setAdminMaxLevel,
    setAdminUnlimitedCurrency,
    setAdminMaxEverything,
    resetToDefault,
    isSyncing,
    syncError
  };
}
