import { AppState } from './types';

export const INITIAL_STATE: AppState = {
  tasks: [],
  decks: [],
  quizzes: [],
  forgeCasts: [],
  stats: {
    xp: 0,
    level: 1,
    streak: 0,
    embers: 0,
    lastActiveDate: null,
    plan: 'Premium',
    currentTheme: 'Default Ember',
    unlockedThemes: ['Default Ember'],
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
