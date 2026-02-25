export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface Task {
  id: string;
  title: string;
  priority: Priority;
  deadline: string; // ISO string with date and time
  duration: number; // in minutes
  completed: boolean;
  createdAt: number;
}

export interface Flashcard {
  id: string;
  term: string;
  definition: string;
}

export interface Deck {
  id: string;
  title: string;
  cards: Flashcard[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
}

export interface UserStats {
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: string | null;
  plan: 'Free' | 'Premium';
  aiUsage: {
    quizzes: number;
    flashcards: number;
    lastResetDate: string | null;
  };
}

export interface AppSettings {
  soundEnabled: boolean;
}

export interface AppState {
  tasks: Task[];
  decks: Deck[];
  quizzes: Quiz[];
  stats: UserStats;
  settings: AppSettings;
}
