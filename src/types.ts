export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface Task {
  id: string;
  title: string;
  priority: Priority;
  deadline: string; // ISO string with date and time
  duration: number; // in minutes
  completed: boolean;
  createdAt: number;
  section?: string; // e.g., Chemistry, Geometry
}

export interface Flashcard {
  id: string;
  term: string;
  definition: string;
  explanation?: string;
  imageUrl?: string;
  imagePrompt?: string;
}

export type DeckCategory = 'Educational' | 'Personal' | 'Work' | 'Other';

export interface Deck {
  id: string;
  title: string;
  cards: Flashcard[];
  isPublic?: boolean;
  originalId?: string;
  creatorName?: string;
  creatorId?: string;
  category?: DeckCategory;
  createdAt?: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
}

export interface ForgeCastChapter {
  chapter_id: number;
  title: string;
  narration_text: string;
  visual_ai_prompt: string;
  image_url?: string | null;
  screen_overlays: {
    text: string[];
    latex_formula?: string;
  };
  transition: 'fade' | 'zoom' | 'slide';
}

export interface ForgeCastBlueprint {
  id: string;
  metadata: {
    title: string;
    estimated_duration: number;
    theme_color: string;
  };
  chapters: ForgeCastChapter[];
  assessment: {
    check_question: string;
    options: string[];
    correct_index: number;
  };
  createdAt: number;
}

export interface UserStats {
  xp: number;
  level: number;
  streak: number;
  embers: number;
  name?: string | null;
  avatarUrl?: string | null;
  lastActiveDate: string | null;
  plan: 'Free' | 'Premium';
  currentTheme: string;
  unlockedThemes: string[];
  activeAssistantSkin?: 'Default' | 'Drill Sergeant' | 'Zen Master' | 'Rival';
  unlockedSkins?: string[];
  unlockedItems?: string[];
  badges?: string[];
  activeBoosters?: { type: 'Power Hour'; expiresAt: number }[];
  aiUsage: {
    quizzes: number;
    flashcards: number;
    forgeCasts: number;
    lastResetDate: string | null;
  };
}

export interface AppState {
  tasks: Task[];
  decks: Deck[];
  quizzes: Quiz[];
  forgeCasts: ForgeCastBlueprint[];
  communityDecks?: Deck[];
  stats: UserStats;
  matchRecords?: Record<string, number>; // deckId -> best time in seconds
}
