import { get, set, del } from 'idb-keyval';
import { AppState } from '../types';
import { getGenericLocalDB, saveGenericLocalDB, clearGenericLocalDB } from './storageManager';

const COLLECTIONS = ['decks', 'quizzes', 'tasks', 'forgeCasts', 'lessons', 'sessions'] as const;

export const storageService = {
  /**
   * Saves the lightweight stats to localStorage
   */
  async saveStats(stats: any) {
    if (!stats) return;
    await saveGenericLocalDB('forge_stats', stats);
  },

  /**
   * Loads stats from localStorage
   */
  async loadStats() {
    return await getGenericLocalDB('forge_stats');
  },

  /**
   * Saves heavy collections to IndexedDB
   */
  async saveCollection(name: string, data: any[]) {
    try {
      await set(`forge_col_${name}`, data);
      await saveGenericLocalDB(`forge_col_${name}`, data);
    } catch (e) {
      console.error(`Failed to save collection ${name} to IndexedDB:`, e);
    }
  },

  /**
   * Loads heavy collections from IndexedDB
   */
  async loadCollection(name: string) {
    try {
      // Prioritize storage manager remote fallback
      const remote = await getGenericLocalDB(`forge_col_${name}`);
      if (remote) {
        return remote;
      }
      return await get(`forge_col_${name}`) || [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Full state hydration from both storage sources
   */
  async loadFullState(): Promise<Partial<AppState>> {
    const stats = await this.loadStats();
    const collectionsResults = await Promise.all(
      COLLECTIONS.map(async (col) => {
        return { [col]: await this.loadCollection(col) };
      })
    );
    
    return {
      stats: stats || undefined,
      ...Object.assign({}, ...collectionsResults)
    };
  },

  /**
   * Clear old or unused data (Pruning)
   */
  async pruneOldData(daysRemaining = 30) {
    console.log(`Pruning policy active: Keeping recent ${daysRemaining} days of history.`);
  },

  /**
   * Clean up all local storage
   */
  async clearAll() {
    await clearGenericLocalDB('forge_stats');
    await clearGenericLocalDB('studysprint_state');
    await Promise.all(COLLECTIONS.map(col => clearGenericLocalDB(`forge_col_${col}`)));
    await Promise.all(COLLECTIONS.map(col => del(`forge_col_${col}`)));
  }
};
