import { AppState } from './types';

export const INITIAL_STATE: AppState = {
  tasks: [],
  decks: [],
  quizzes: [],
  forgeCasts: [],
  lessons: [],
  sessions: [],
  stats: {
    xp: 0,
    level: 1,
    streak: 0,
    embers: 0,
    lastActiveDate: null,
    plan: 'Premium',
    currentTheme: 'Default Ember',
    unlockedThemes: ['Default Ember'],
    activeAssistantSkin: 'Default',
    unlockedSkins: ['Default'],
    unlockedItems: [],
    badges: ['Beta Tester'],
    activeBoosters: [],
    forgeScore: 0,
    rank: 'Ember',
    rankIndex: 0,
    titlesEarned: [],
    activeTitle: null,
    pathTiers: { archivist: 0, duelist: 0, architect: 0, forgemaster: 0 },
    milestonesTriggered: [],
    totalStudyDaysLifetime: 0,
    longestStreakEver: 0,
    totalExamsCompletedLifetime: 0,
    rollingExamAveragePercent: 0,
    consecutiveExamsAbove80: 0,
    consecutiveExamsAbove90: 0,
    totalSubjectsUploaded: 0,
    totalWordsAuditedLifetime: 0,
    lifetimeEmbersEarned: 0,
    matureCardsTotal: 0,
    rolling30DayRetentionPercent: 0,
    aiUsage: {
      quizzes: 0,
      flashcards: 0,
      forgeCasts: 0,
      lastResetDate: null,
    },
  },
  matchRecords: {},
};

export const FREE_LIMITS = {
  quizzes: 3,
  flashcards: 5,
  forgeCasts: 2,
};

export const PREMIUM_PRICES = {
  monthly: 3.99,
  yearly: 29.00,
};

export const XP_PER_TASK = 10;
export const XP_PER_TIMER = 25;
export const XP_PER_QUIZ_QUESTION = 5;

export const MOTIVATIONAL_MESSAGES = [
  "Great job! You're crushing it.",
  "Keep up the momentum!",
  "Focus is your superpower.",
  "One step closer to your goals.",
  "You're doing amazing!",
];

export const PYRA_TIPS = [
  "Take a 5-minute break every 25 minutes. It keeps your brain sharp!",
  "Make sure to stay hydrated while you're forging through your studies!",
  "Explaining a concept to someone else is the best way to master it.",
  "Check out the ForgeVault for some community-made flashcard decks!",
  "Studies show that getting 8 hours of sleep helps with memory retention.",
  "You've got this! Every session brings you closer to your goals.",
  "Don't forget to organize your planner for the week ahead!",
  "Try turning on 'Focus Mode' to get those extra Embers!",
  "The Hall of Fame is waiting for more Elite scholars like you.",
  "Complex topic? Build a StudyCast to visualize the logic!",
];
