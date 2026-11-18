import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAppState } from '../hooks/useAppState';
import { useRewards } from '../components/RewardToast';
import { soundService } from '../services/soundService';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Star, Flame, CloudCheck, CloudOff, RefreshCw } from 'lucide-react';
import { ProgressionEngine } from '../services/progressionEngine';
import { generateAtmosphere, generateRewardContent } from '../services/aiService';
import { useAuthContext } from './AuthContext';
import { incrementUserStats } from '../services/dataService';
import { UserStats, EmberSessionData, EmberStudentData, EmberEarningsResponse, EmberRewardResponse, AtmosphereRequest, AtmosphereResponse } from '../types';
import { emberService } from '../services/emberService';
import { getGenericLocalDB, saveGenericLocalDB } from '../services/storageManager';

interface ForgeStoreContextType {
  xp: number;
  level: number;
  embers: number;
  awardXP: (amount: number) => void;
  spendEmbers: (amount: number) => boolean;
  completeFocusSession: (xp: number, embers: number) => Promise<void>;
  processSessionCompletion: (sessionData: EmberSessionData) => Promise<EmberEarningsResponse>;
  purchaseEmberItem: (itemId: string, metadata?: any) => Promise<EmberRewardResponse>;
  currentTheme: string;
  setTheme: (theme: string) => void;
  unlockedThemes: string[];
  unlockTheme: (theme: string) => void;
  unlockSkin: (skin: string) => void;
  setSkin: (skin: string) => void;
  unlockItem: (id: string) => void;
  addBadge: (badge: string) => void;
  activateBooster: (type: 'Power Hour') => void;
  trackQuestProgress: (id: string, amount?: number) => void;
  activeAssistantSkin: string;
  unlockedSkins: string[];
  unlockedItems: string[];
  badges: string[];
  atmosphere: AtmosphereResponse | null;
  updateAtmosphere: (trigger: AtmosphereRequest['trigger'], subject?: string, themeOverride?: string) => Promise<void>;
  clearAtmosphere: () => void;
  isSyncing: boolean;
  syncError: boolean;
  stats: UserStats;
  decks: any[];
  lessons: any[];
}

const ForgeStoreContext = createContext<ForgeStoreContextType | undefined>(undefined);

export const THEMES = {
  'Default Ember': '#FB923C',
  'Map Explorer': '#000000',
  'Inner Fire': '#B91C1C',
  'Radio Mystery': '#312E81',
  'Grand Archive': '#78350F',
  'Perfect Focus': '#064E3B',
  'Brain Link': '#831843',
  'Deep Ocean': '#1E3A8A',
  'Star Field': '#4C1D95',
};

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
}

export function ForgeStoreProvider({ children }: { children: React.ReactNode }) {
  const { state, setState } = useAppState();
  const { user } = useAuthContext();
  const { triggerReward } = useRewards();
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [leveledTo, setLeveledTo] = useState(1);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);

  const { xp, level, embers, currentTheme, unlockedThemes, activeAssistantSkin = 'Default', unlockedSkins = ['Default'], unlockedItems = [], badges = [], activeBoosters = [] } = state.stats;
  const [atmosphere, setAtmosphere] = useState<AtmosphereResponse | null>(null);
  const statsRef = useRef(state.stats);

  useEffect(() => {
    statsRef.current = state.stats;
  }, [state.stats]);

  // Level Up logic to credit Embers
  const [lastLevelCredit, setLastLevelCredit] = useState(level);

  useEffect(() => {
    if (level > lastLevelCredit) {
      const diff = level - lastLevelCredit;
      const creditAmount = diff * 100;
      setState(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          embers: (prev.stats.embers || 0) + creditAmount
        }
      }));
      setLastLevelCredit(level);
    }
  }, [level, lastLevelCredit, setState]);

  // Cloud Sync is handled by AppStateContext. 
  // We only provide UI indicators here if needed, but AppStateContext.tsx is the authority.

  // Apply theme to CSS variables
  useEffect(() => {
    const color = THEMES[currentTheme as keyof typeof THEMES] || THEMES['Default Ember'];
    const rgb = hexToRgb(color);
    document.documentElement.style.setProperty('--forge-accent', color);
    if (rgb) {
      document.documentElement.style.setProperty('--forge-accent-rgb', rgb);
    }
  }, [currentTheme]);

  const awardXP = useCallback((amount: number) => {
    let newLevelVal = 1;
    let leveledUp = false;
    let embersGain = 0;

    setState(prev => {
      const today = new Date().toISOString().split('T')[0];
      const newXP = prev.stats.xp + amount;
      const newLevel = Math.floor(newXP / 1000) + 1;
      
      // Calculate Embers with Booster
      const isPowerHourActive = prev.stats.activeBoosters?.some(b => b.type === 'Power Hour' && b.expiresAt > Date.now());
      const baseEmbers = Math.round(amount / 5);
      const earned = isPowerHourActive ? baseEmbers * 2 : baseEmbers;
      
      const newEmbers = (prev.stats.embers || 0) + earned;
      
      newLevelVal = newLevel;
      embersGain = earned;

      let newStreak = prev.stats.streak;
      if (prev.stats.lastActiveDate !== today) {
        const lastActive = prev.stats.lastActiveDate ? new Date(prev.stats.lastActiveDate) : null;
        if (lastActive) {
          const diffInMs = new Date().getTime() - lastActive.getTime();
          const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
          if (diffInDays <= 1.5) {
            newStreak += 1;
          } else {
            // CHECK FOR STREAK FREEZE
            const hasStreakFreeze = prev.stats.unlockedItems?.includes('streak_freeze');
            if (hasStreakFreeze) {
              // Consume streak freeze
              const updatedItems = prev.stats.unlockedItems.filter(id => id !== 'streak_freeze');
              return {
                ...prev,
                stats: {
                  ...prev.stats,
                  unlockedItems: updatedItems,
                  lastActiveDate: today, // "Save" it
                  streak: (prev.stats.streak || 0) + 1
                }
              };
            }
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
          xp: newXP,
          level: newLevel,
          embers: newEmbers,
          streak: newStreak,
          lastActiveDate: today,
        }
      };
    });

    // Side effects outside state updater
    if (leveledUp) {
      setLeveledTo(newLevelVal);
      setShowLevelUp(true);
      soundService.playLevelUp();
    } else if (amount > 0) {
      soundService.playSuccess();
    }

    if (amount > 0 || embersGain > 0) {
      triggerReward(amount, embersGain, "Session Complete!");
    }
  }, [setState, triggerReward]);

  const spendEmbers = useCallback((amount: number) => {
    if (embers >= amount) {
      setState(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          embers: prev.stats.embers - amount
        }
      }));
      return true;
    }
    return false;
  }, [embers, setState]);

  const setTheme = useCallback((theme: string) => {
    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        currentTheme: theme
      }
    }));
  }, [setState]);

  const updateAtmosphere = useCallback(async (trigger: AtmosphereRequest['trigger'], subject?: string, themeOverride?: string) => {
    try {
      const idMap: Record<string, string> = {
        'Default Ember': 'default',
        'Map Explorer': 'void_cartographer',
        'Inner Fire': 'deep_forge',
        'Radio Mystery': 'signal_lost',
        'Grand Archive': 'the_library_at_the_end',
        'Perfect Focus': 'eigenstate',
        'Brain Link': 'bone_circuit',
        'Deep Ocean': 'abyssal_current',
        'Star Field': 'nebula_pulse'
      };
      
      const themeToUse = themeOverride || currentTheme;
      
      const response = await generateAtmosphere({
        active_theme: idMap[themeToUse] || 'default',
        student_name: statsRef.current.studentName || statsRef.current.name || 'Student',
        subject_context: subject,
        trigger
      });
      setAtmosphere(response);
      
      // Auto-clear after 1 minute
      setTimeout(() => {
        setAtmosphere(null);
      }, 60000);
    } catch (error: any) {
      if (error.message === 'QUOTA_EXCEEDED') {
        console.warn("Atmosphere Engine: Quota exceeded");
      } else {
        console.error("Atmosphere Engine failed to generate:", error);
      }
    }
  }, [currentTheme]);

  const clearAtmosphere = useCallback(() => {
    setAtmosphere(null);
  }, []);

  const unlockTheme = useCallback((theme: string) => {
    setState(prev => {
      const newUnlocked = [...new Set([...prev.stats.unlockedThemes, theme])];
      return {
        ...prev,
        stats: {
          ...prev.stats,
          unlockedThemes: newUnlocked,
          currentTheme: theme // Auto-apply on purchase/unlock
        }
      };
    });
  }, [setState]);

  const unlockSkin = useCallback((skin: string) => {
    setState(prev => {
      const newUnlocked = [...new Set([...(prev.stats.unlockedSkins || ['Default']), skin])];
      return {
        ...prev,
        stats: {
          ...prev.stats,
          unlockedSkins: newUnlocked,
          activeAssistantSkin: skin as any
        }
      };
    });
  }, [setState]);

  const setSkin = useCallback((skin: string) => {
    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        activeAssistantSkin: skin as any
      }
    }));
  }, [setState]);

  const unlockItem = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        unlockedItems: [...new Set([...(prev.stats.unlockedItems || []), id])]
      }
    }));
  }, [setState]);

  const addBadge = useCallback((badge: string) => {
    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        badges: [...new Set([...(prev.stats.badges || []), badge])]
      }
    }));
  }, [setState]);

  const activateBooster = useCallback((type: 'Power Hour') => {
    const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour
    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        activeBoosters: [...(prev.stats.activeBoosters || []), { type, expiresAt }]
      }
    }));
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
        currentTheme: 'Inner Fire',
        unlockedThemes: [...new Set([...prev.stats.unlockedThemes, 'Inner Fire', 'Star Field', 'Perfect Focus', 'Deep Ocean'])]
      }
    }));
    soundService.playSuccess();
  }, [setState]);

  const trackQuestProgress = useCallback(async (id: string, amount: number = 1) => {
    const quests = await getGenericLocalDB('forge_quests_data');
    if (quests) {
      let awarded = false;
      let xpAward = 0;

      const newQuests = quests.map((q: any) => {
        if (q.id === id && !q.completed) {
          const nextCurrent = Math.min(q.target, q.current + amount);
          const isNowCompleted = nextCurrent >= q.target;
          if (isNowCompleted) {
            awarded = true;
            xpAward = q.rewardXP;
          }
          return { ...q, current: nextCurrent, completed: isNowCompleted };
        }
        return q;
      });

      await saveGenericLocalDB('forge_quests_data', newQuests);
      if (awarded) {
        awardXP(xpAward);
      }
      
      // Dispatch custom event so components can refresh
      window.dispatchEvent(new CustomEvent('forge_quests_updated'));
    }
  }, [awardXP]);

  const completeFocusSession = useCallback(async (xpAmount: number, embersAmount: number) => {
    // Check for Early Bird Achievement (before 7:00 AM)
    const hour = new Date().getHours();
    let bonusEmbers = 0;
    if (hour < 7) {
      bonusEmbers = 50;
      addBadge('Early Bird');
    }

    trackQuestProgress('focus_session', 1);

    const finalXP = xpAmount;
    const finalEmbers = embersAmount + bonusEmbers;

    if (user) {
      setIsSyncing(true);
      try {
        await incrementUserStats(user.uid, finalXP, finalEmbers);
        awardXP(finalXP); 
      } catch (error) {
        setSyncError(true);
      } finally {
        setTimeout(() => setIsSyncing(false), 2000);
      }
    } else {
      awardXP(finalXP);
    }
  }, [user, awardXP, addBadge]);

  const processSessionCompletion = useCallback(async (sessionData: EmberSessionData): Promise<EmberEarningsResponse> => {
    const studentData: EmberStudentData = {
      name: state.stats.name || 'Student',
      current_embers: state.stats.embers || 0,
      lifetime_embers_earned: (state.stats as any).lifetime_embers_earned || 0, // Fallback if not in type
      streak_days: state.stats.streak || 0,
      level: `Level ${state.stats.level}`,
      subject_focus: 'General'
    };

    const result = emberService.calculateEarnings(studentData, sessionData);
    const { total_earned } = result.embers_earned;

    // Evaluate Progression
    const progStudent = {
        id: user?.uid || 'guest',
        name: state.stats.studentName || state.stats.name || 'Student',
        level: 'a_level' as const, // default for now
        current_forge_score: state.stats.forgeScore || 0,
        current_rank: state.stats.rank || 'Ember',
        current_rank_index: state.stats.rankIndex || 0,
        titles_earned: state.stats.titlesEarned || [],
        active_title: state.stats.activeTitle || null,
        path_tiers: state.stats.pathTiers || { archivist: 0, duelist: 0, architect: 0, forgemaster: 0 },
        milestones_triggered: state.stats.milestonesTriggered || []
      };

      const dateStr = new Date().toISOString();
      const sTotalCards = state.decks.reduce((sum, d) => sum + d.cards.length, 0);
      const sMatureCards = state.decks.reduce((sum, d) => sum + d.cards.filter(c => (c.interval || 0) >= 21).length, 0);
      
      const newMatureThisSession = sessionData.new_mature_cards || 0;
      
      // Calculate retention percent
      const allStudied = state.decks.flatMap(d => d.cards.filter(c => c.totalAttempts));
      const totalAttempts = allStudied.reduce((sum, c) => sum + (c.totalAttempts || 0), 0);
      const totalMisses = allStudied.reduce((sum, c) => sum + (c.wrongCount || 0), 0);
      let rollingRetention = 80; // default initial
      if (totalAttempts > 0) {
        rollingRetention = Math.round(((totalAttempts - totalMisses) / totalAttempts) * 100);
      }

      const progSession = {
        session_type: sessionData.session_type,
        timestamp: dateStr,
        duration_minutes: sessionData.session_duration_minutes || 5,
        srs_data: {
          cards_reviewed: sessionData.cards_reviewed || 0,
          cards_correct: sessionData.cards_correct || 0,
          session_accuracy_percent: sessionData.accuracy_percent || 0,
          rolling_30day_retention_percent: rollingRetention,
          total_cards_in_deck: sTotalCards,
          mature_cards_total: sMatureCards + newMatureThisSession,
          new_mature_cards_this_session: newMatureThisSession,
          average_ease_factor: 2.2,
          weakest_card_topic: 'Unknown'
        },
        exam_data: {
          exam_completed: sessionData.session_type === 'exam_completed',
          exam_score_percent: sessionData.exam_score_percent || 0,
          exam_grade: sessionData.exam_grade || '',
          total_exams_completed_lifetime: (state.stats.totalExamsCompletedLifetime || 0) + (sessionData.session_type === 'exam_completed' ? 1 : 0),
          rolling_exam_average_percent: state.stats.rollingExamAveragePercent || 0, // Would be updated dynamically
          consecutive_exams_above_80: state.stats.consecutiveExamsAbove80 || 0,
          consecutive_exams_above_90: state.stats.consecutiveExamsAbove90 || 0
        },
        consistency_data: {
          current_streak_days: state.stats.streak,
          streak_gaps_this_month: 0, // Placeholder
          study_days_this_month: 10, // Placeholder
          total_study_days_lifetime: (state.stats.totalStudyDaysLifetime || 0) + 1,
          longest_streak_ever: Math.max(state.stats.longestStreakEver || 0, state.stats.streak)
        },
        upload_data: {
          total_subjects_uploaded: state.stats.totalSubjectsUploaded || 0,
          total_words_audited_lifetime: state.stats.totalWordsAuditedLifetime || 0,
          new_upload_this_session: sessionData.session_type === 'upload_completed'
        },
        embers_data: {
          embers_earned_this_session: total_earned,
          lifetime_embers_earned: (state.stats.lifetimeEmbersEarned || 0) + total_earned,
          current_embers_balance: state.stats.embers + total_earned
        }
      };

      const output = ProgressionEngine.evaluateSession({
        action: 'evaluate_session',
        student: progStudent as any,
        session_data: progSession as any
      });

      setState(prev => {
        let nextConsecutive80 = prev.stats.consecutiveExamsAbove80 || 0;
        let nextConsecutive90 = prev.stats.consecutiveExamsAbove90 || 0;
        if (sessionData.session_type === 'exam_completed' && sessionData.exam_score_percent) {
          if (sessionData.exam_score_percent >= 90) {
            nextConsecutive90++; nextConsecutive80++;
          } else if (sessionData.exam_score_percent >= 80) {
            nextConsecutive90 = 0; nextConsecutive80++;
          } else {
            nextConsecutive80 = 0; nextConsecutive90 = 0;
          }
        }

        let nextRollingExam = prev.stats.rollingExamAveragePercent || 0;
        if (sessionData.session_type === 'exam_completed' && sessionData.exam_score_percent) {
          const pastExams = prev.stats.totalExamsCompletedLifetime || 0;
          nextRollingExam = Math.round(((nextRollingExam * pastExams) + sessionData.exam_score_percent) / (pastExams + 1));
        }

        return {
          ...prev,
          stats: {
            ...prev.stats,
            embers: output.ember_awards_this_session.new_balance,
            lifetimeEmbersEarned: progSession.embers_data.lifetime_embers_earned,
            forgeScore: output.forge_score.new,
            rank: output.rank.new_rank,
            rankIndex: output.rank.rank_index,
            titlesEarned: Array.from(new Set([...(prev.stats.titlesEarned || []), ...output.titles.newly_unlocked])),
            pathTiers: {
              archivist: output.paths.archivist.new_tier,
              duelist: output.paths.duelist.new_tier,
              architect: output.paths.architect.new_tier,
              forgemaster: output.paths.forgemaster.new_tier
            },
            milestonesTriggered: Array.from(new Set([...(prev.stats.milestonesTriggered || []), ...output.milestones_fired.map((m: any) => m.milestone_id)])),
            totalExamsCompletedLifetime: progSession.exam_data.total_exams_completed_lifetime,
            rollingExamAveragePercent: nextRollingExam,
            consecutiveExamsAbove80: nextConsecutive80,
            consecutiveExamsAbove90: nextConsecutive90,
            matureCardsTotal: progSession.srs_data.mature_cards_total,
            rolling30DayRetentionPercent: progSession.srs_data.rolling_30day_retention_percent,
          }
        };
      });

      // Show specific rewards from progression engine
      if (output.milestones_fired.length > 0) {
        // Find most significant one to show
        const majorMilestone = output.milestones_fired.sort((a: any, b: any) => (b.embers_awarded || 0) - (a.embers_awarded || 0))[0];
        if (majorMilestone) {
          triggerReward(output.forge_score.delta, output.ember_awards_this_session.total_awarded, majorMilestone.display_message);
        }
      } else if (result.embers_earned.total_earned > 0) {
        triggerReward(output.forge_score.delta, result.embers_earned.total_earned, result.earn_message);
      }

    return result;
  }, [state.decks, state.stats, user, triggerReward, setState]);

  const purchaseEmberItem = useCallback(async (itemId: string, context?: any): Promise<EmberRewardResponse> => {
    const COSTS: Record<string, number> = {
      'neural_nudge': 5,
      'phantom_recall': 15,
      'echo_chamber': 10,
      'temporal_splice': 8,
      'deep_dive': 15,
      'void_collapse': 50,
      'cryo_shield': 20,
      'memory_palace': 35,
      'forge_exam': 50,
      'kill_chain': 25
    };

    const cost = COSTS[itemId] || 10;
    
    if (state.stats.embers < cost) {
      throw new Error(`Insufficient Embers. You need ${cost}, but have ${state.stats.embers}.`);
    }

    const studentData: EmberStudentData = {
      name: state.stats.name || 'Student',
      current_embers: state.stats.embers || 0,
      lifetime_embers_earned: (state.stats as any).lifetime_embers_earned || 0,
      streak_days: state.stats.streak || 0,
      level: `Level ${state.stats.level}`,
      subject_focus: 'General'
    };

    const purchaseData: any = {
      item_id: itemId,
      ember_cost: cost,
      context: context
    };

    const reward = await generateRewardContent(purchaseData, studentData, activeAssistantSkin);

    // Spend the embers
    spendEmbers(cost);

    return reward;
  }, [state.stats, spendEmbers]);

  const contextValue = React.useMemo(() => ({
    xp,
    level,
    embers,
    awardXP,
    spendEmbers,
    completeFocusSession,
    processSessionCompletion,
    purchaseEmberItem,
    currentTheme,
    setTheme,
    unlockedThemes,
    unlockTheme,
    unlockSkin,
    setSkin,
    unlockItem,
    addBadge,
    activateBooster,
    trackQuestProgress,
    activeAssistantSkin,
    unlockedSkins,
    unlockedItems,
    badges,
    atmosphere,
    updateAtmosphere,
    clearAtmosphere,
    isSyncing,
    syncError,
    stats: state.stats,
    decks: state.decks,
    lessons: state.lessons
  }), [
    xp, level, embers, awardXP, spendEmbers, completeFocusSession,
    processSessionCompletion, purchaseEmberItem, currentTheme, setTheme,
    unlockedThemes, unlockTheme, unlockSkin, setSkin, unlockItem,
    addBadge, activateBooster, trackQuestProgress, activeAssistantSkin,
    unlockedSkins, unlockedItems, badges, atmosphere, updateAtmosphere,
    clearAtmosphere, isSyncing, syncError, state.stats, state.decks, state.lessons
  ]);

  return (
    <ForgeStoreContext.Provider value={contextValue}>
      {children}
      
      <AnimatePresence>
        {showLevelUp && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="max-w-sm w-full bg-forge-dark border border-forge-accent/30 rounded-[2.5rem] p-12 text-center relative overflow-hidden shadow-[0_0_50px_rgba(251,146,60,0.2)]"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-forge-accent" />
              <div className="w-24 h-24 bg-forge-accent/10 rounded-full flex items-center justify-center mx-auto mb-8 forge-glow">
                <Trophy size={48} className="text-forge-accent" />
              </div>
              <h2 className="text-4xl font-display font-black uppercase italic tracking-tighter text-white mb-2">Level Up!</h2>
              <p className="text-stone-500 font-bold uppercase tracking-widest text-xs mb-8">You have reached Level {leveledTo}</p>
              
              <div className="flex justify-center gap-4 mb-8">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                    <Star size={16} className="text-forge-accent fill-current" />
                    <span className="text-sm font-black text-white">New Features Unlocked</span>
                </div>
              </div>

              <button
                onClick={() => setShowLevelUp(false)}
                className="w-full py-4 bg-forge-accent text-forge-dark rounded-xl font-display font-black uppercase italic tracking-tighter hover:scale-105 transition-transform forge-glow"
              >
                Continue Learning
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ForgeStoreContext.Provider>
  );
}

export function useForgeStore() {
  const context = useContext(ForgeStoreContext);
  if (!context) throw new Error('useForgeStore must be used within a ForgeStoreProvider');
  return context;
}
