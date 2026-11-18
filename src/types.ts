export interface AppState {
  tasks: Task[];
  decks: Deck[];
  quizzes: Quiz[];
  forgeCasts: ForgeCastBlueprint[];
  lessons: LessonArchitectAudit[];
  sessions: ModeEngineSession[];
  stats: UserStats;
  matchRecords: Record<string, number>;
}

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
  // Adaptive Learning Stats
  interval?: number; // Days until next review
  ease?: number; // Ease factor (Anki-style)
  nextReviewDate?: number; // Timestamp
  wrongCount?: number;
  totalAttempts?: number;
  lastResponseTime?: number; // in ms
  cardType?: 'definition' | 'mechanism' | 'application' | 'comparison' | 'formula' | 'cause_effect';
  topicTag?: string;
  memoryHook?: string;
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
  type?: 'mcq' | 'short_answer' | 'long_answer' | 'calculation';
  options?: string[];
  correctAnswer?: number;
  correctAnswerText?: string;
  explanation?: string;
  marks?: number;
  markingCriteria?: string;
}

export interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
  isExam?: boolean;
  timeLimit?: number; // minutes
  examHistory?: ExamAttempt[];
  isAIGraded?: boolean;
}

export interface ExamAttempt {
  id: string;
  quizId: string;
  score: number;
  maxScore: number;
  completedAt: number;
  duration: number; // seconds
  weakAreas: string[];
  feedback: string;
  scorePrediction: number; // 0-100 predicted real exam score
  questionMarking?: {
    questionId: string;
    marksAwarded: number;
    marksAvailable: number;
    studentAnswer: string;
    feedback: string;
    correctAnswerSummary: string;
    whatWasMissing?: string;
  }[];
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
  xp: number; // deprecated
  level: number; // deprecated
  streak: number;
  embers: number;
  name?: string | null;
  studentName?: string | null;
  rank?: string;
  rankIndex?: number;
  forgeScore?: number;
  titlesEarned?: string[];
  activeTitle?: string | null;
  srsRetention?: number;
  dailyStreak?: number;
  totalSessionsStudied?: number;
  pathTiers?: {
    archivist: number;
    duelist: number;
    architect: number;
    forgemaster: number;
  };
  milestonesTriggered?: string[];
  totalStudyDaysLifetime?: number;
  longestStreakEver?: number;
  totalExamsCompletedLifetime?: number;
  rollingExamAveragePercent?: number;
  consecutiveExamsAbove80?: number;
  consecutiveExamsAbove90?: number;
  totalSubjectsUploaded?: number;
  totalWordsAuditedLifetime?: number;
  lifetimeEmbersEarned?: number;
  matureCardsTotal?: number;
  rolling30DayRetentionPercent?: number;
  upcomingExams?: { date: string; subject: string }[];
  avatarUrl?: string | null;
  lastActiveDate: string | null;
  plan: 'Free' | 'Premium';
  currentTheme: string;
  unlockedThemes: string[];
  activeAssistantSkin?: 'Default' | 'Drill Sergeant' | 'Zen Master' | 'Rival' | 'Ghost Protocol' | 'Oracle Prime' | 'Circuit Breaker' | 'The Archivist' | 'Forge Wraith';
  unlockedSkins?: string[];
  unlockedItems?: string[];
  badges?: string[];
  activeBoosters?: { type: 'Power Hour'; expiresAt: number }[];
  aiUsage: {
    quizzes: number;
    flashcards: number;
    forgeCasts: number;
    studyGuides: number;
    lessons: number;
    lastResetDate: string | null;
  };
}

export interface LessonArchitectAudit {
  id?: string;
  generation_audit?: {
    word_count_processed: number;
    definition_count: number;
    mechanism_count: number;
    cause_effect_count: number;
    comparison_count: number;
    formula_count: number;
    sequence_count: number;
    example_count: number;
    application_count: number;
    raw_card_potential: number;
    target_card_count: number;
    target_derivation: string;
    batch_strategy: "single_pass" | "batch";
    mode_applied: string;
    concepts_coverage_plan: string[];
    self_verification_passed: boolean;
    gap_check_result: string;
  };
  audit_metadata: {
    title: string;
    subject: string;
    level_detected: string;
    content_type: string;
    word_count: number;
    academic_density_score: number;
    exam_relevance_score: number;
    estimated_mastery_hours: number;
    prerequisite_knowledge: string[];
  };
  semantic_map: {
    central_thesis: string;
    causal_chains: {
      chain_id: string;
      chain_name: string;
      steps: {
        concept: string;
        causes: string;
        evidence: string;
        exam_significance: 'high' | 'medium' | 'low';
      }[];
    }[];
    concept_hierarchy: {
      tier: number;
      tier_label: string;
      concepts: {
        concept: string;
        definition: string;
        in_plain_english: string;
        why_it_matters: string;
        paragraph_density_score: number;
        common_exam_question_types: string[];
      }[];
    }[];
  };
  misconception_map: {
    misconception: string;
    why_students_believe_it: string;
    the_truth: string;
    how_to_remember_the_difference: string;
    exam_danger_level: 'high' | 'medium' | 'low';
  }[];
  memory_layer: {
    flashcard_deck: {
      card_id: string;
      front: string;
      back: string;
      card_type: string;
      difficulty: 'easy' | 'medium' | 'hard';
      tier: 1 | 2 | 3;
      topic_tag: string;
      memory_hook: string;
      hint: string;
      common_wrong_answer: string;
      why_wrong_answer_is_wrong: string;
      sm2_initial_ease_factor: number;
      sm2_initial_interval_days: number;
    }[];
    total_cards: number;
  };
  application_layer: {
    exam_questions: {
      question_id: string;
      question: string;
      type: string;
      marks: number;
      difficulty: string;
      topic_tag: string;
      tier: 1 | 2 | 3;
      cognitive_demand: string;
      options: string[];
      correct_answer: string;
      mark_scheme: string;
      model_answer: string;
      common_wrong_answers: string[];
      examiner_note: string;
      links_to_misconception_id?: number | null;
    }[];
  };
  mode_routing: {
    normal_study_card_ids: string[];
    quick_review_card_ids: string[];
    detailed_mastery_card_ids: string[];
    test_prep_question_ids: string[];
    eli5_concept_ids: string[];
  };
  forgecast_brief: {
    hook_premise: string;
    core_technical_points: string[];
    best_analogy_candidates: string[];
    summary_statement: string;
  };
  forgechat_context_block: string;
  // Progress Tracking
  mastery_score?: number; // 0-100
  last_session_at?: number;
  completed_sessions_count?: number;
  createdAt?: number;
}

export interface SRSIntelligenceAnalysis {
  id?: string;
  session_analysis: {
    retention_rate_this_session: number;
    average_response_time_ms: number;
    fastest_card_id: string;
    slowest_card_id: string;
    session_quality: 'excellent' | 'good' | 'average' | 'poor' | 'crisis';
    session_quality_reason: string;
    estimated_next_session_retention: number;
    cognitive_load_assessment: string;
  };
  pattern_detection: {
    pattern_type: 'rote_memorisation' | 'concept_confusion' | 'topic_avoidance' | 'context_dependency' | 'plateaued_card' | 'interference_effect';
    pattern_name: string;
    evidence: string;
    explanation: string;
    recommended_action: string;
    severity: 'critical' | 'moderate' | 'minor';
  }[];
  cards_needing_intervention: {
    card_id: string;
    intervention_type: 'rewrite_card' | 'add_memory_hook' | 'create_sibling_card' | 'break_into_smaller_cards' | 'suspend_temporarily' | 'needs_prerequisite_card';
    reason: string;
    action_taken: string;
  }[];
  new_cards_generated: {
    card_id: string;
    generated_because: string;
    generation_strategy: string;
    front: string;
    back: string;
    card_type: string;
    difficulty: 'easy' | 'medium' | 'hard';
    topic_tag: string;
    memory_hook: string;
    hint: string;
    sm2_initial_ease_factor: number;
    sm2_initial_interval_days: number;
  }[];
  improved_memory_hooks: {
    card_id: string;
    old_hook: string;
    new_hook: string;
    hook_type: 'acronym' | 'story' | 'visual' | 'rhyme' | 'analogy' | 'shocking_fact' | 'number_anchor';
    why_this_will_work_better: string;
  }[];
  retention_predictions: {
    card_id: string;
    current_interval_days: number;
    predicted_retention_at_due_date_percent: number;
    recommendation: 'advance' | 'keep_scheduled' | 'pull_forward' | 'suspend';
    reasoning: string;
  }[];
  motivational_output: {
    streak_status: string;
    session_achievement?: string;
    milestone_approaching?: string;
    honest_assessment: string;
    one_thing_to_fix: string;
  };
  createdAt?: number;
}

export interface ExamSimulatorSection {
  section_id: string;
  section_title: string;
  section_instructions: string;
  marks_available: number;
  time_recommendation_minutes: number;
  questions: {
    question_id: string;
    type: 'mcq' | 'short_answer' | 'long_answer' | 'data_response' | 'calculation' | 'evaluation';
    marks: number;
    question_text: string;
    options?: string[];
    supporting_material?: string;
    topic_tag: string;
    targets_weak_area: boolean;
    is_trick_question: boolean;
    cognitive_demand: 'recall' | 'comprehension' | 'application' | 'analysis' | 'evaluation' | 'synthesis';
    HIDDEN_correct_answer: string;
    HIDDEN_mark_scheme: string;
    HIDDEN_model_answer: string;
    HIDDEN_common_mistakes: string[];
    HIDDEN_examiner_tip: string;
  }[];
}

export interface ExamSimulatorOutput {
  exam: {
    exam_id: string;
    title: string;
    level: string;
    exam_board_style: string;
    total_marks: number;
    time_limit_minutes: number;
    difficulty_profile: string;
    instructions: string;
    sections: ExamSimulatorSection[];
    difficulty_map: {
      accessible_question_ids: string[];
      target_question_ids: string[];
      stretch_question_ids: string[];
    };
  };
}

export interface ForgeRevisionPlan {
  results: {
    student_name: string;
    exam_title: string;
    total_marks_awarded: number;
    total_marks_available: number;
    percentage: number;
    grade: string;
    grade_prediction: string;
    time_analysis: string;
    performance_tier: 'distinction' | 'strong_pass' | 'borderline' | 'needs_work' | 'critical';
  };
  question_marking: {
    question_id: string;
    marks_awarded: number;
    marks_available: number;
    student_answer_summary: string;
    what_they_got_right: string;
    what_was_missing: string;
    the_correct_answer: string;
    mark_loss_reason: string;
    knowledge_gap_type: 'factual_gap' | 'conceptual_misunderstanding' | 'vocabulary_gap' | 'application_failure' | 'trick_missed' | 'time_pressure_error';
    topic_tag: string;
  }[];
  forge_revision_plan: {
    plan_title: string;
    plan_summary: string;
    total_estimated_minutes: number;
    crash_course_flashcard_deck: {
      card_id: string;
      generated_from_question_id: string;
      card_type: 'correction' | 'clarification' | 'missing_concept' | 'vocabulary' | 'mechanism' | 'application';
      front: string;
      back: string;
      why_this_card_was_created: string;
      memory_hook: string;
      hint: string;
      difficulty: 'easy' | 'medium' | 'hard';
      urgency: 'must_know_before_exam' | 'high_value' | 'good_to_know';
      sm2_initial_ease_factor: number;
      sm2_initial_interval_days: number;
    }[];
    topic_remediation_order: {
      priority: number;
      topic: string;
      marks_lost_on_this_topic: number;
      specific_gap: string;
      time_needed_minutes: number;
      action: string;
      success_indicator: string;
    }[];
    ten_minute_emergency_brief: {
      for_student: string;
      critical_facts: {
        topic: string;
        the_one_thing: string;
        exam_phrasing: string;
        trap_to_avoid: string;
      }[];
    };
  };
  encouragement: {
    honest_summary: string;
    biggest_win?: string;
    next_step: string;
  };
  createdAt?: number;
}

export type ForgePersona = 'pyra_default' | 'forge_master' | 'vault_scholar' | 'ember_coach' | 'spark_mode';

export interface PyraChatMessage {
  role: 'user' | 'model';
  content: string;
  createdAt: number;
  metadata?: {
    generated_card?: {
      front: string;
      back: string;
      memory_hook: string;
      hint: string;
      difficulty: 'easy' | 'medium' | 'hard';
      sm2_initial_ease_factor: number;
      sm2_initial_interval_days: number;
      topic_tag: string;
      generated_reason: string;
    };
  };
}

export type StudyMode = 'normal_study' | 'quick_review' | 'detailed_mastery' | 'test_prep' | 'eli5';

export interface ModeEngineSession {
  id?: string;
  lessonId: string;
  mode: StudyMode;
  session_title: string;
  opening_message: string;
  flashcard_session: {
    cards: {
      card_id: string;
      front: string;
      back: string;
      hint: string;
      memory_hook: string;
      mode_specific_tip: string;
      sm2_initial_ease_factor: number;
      sm2_initial_interval_days: number;
    }[];
    total_cards: number;
    estimated_minutes: number;
    session_structure: string;
  };
  exam_session: {
    questions: any[]; // Subset of LessonArchitectAudit application_layer
    total_questions: number;
    total_marks: number;
    estimated_minutes: number;
    mode_instructions: string;
  };
  mode_exclusive_content: {
    type: string;
    content: string;
  };
  closing_prompt: string;
  createdAt?: number;
}

export type EmberEngineAction = 'calculate_earnings' | 'process_purchase' | 'generate_reward_content' | 'weekly_summary';

export interface EmberStudentData {
  name: string;
  current_embers: number;
  lifetime_embers_earned: number;
  streak_days: number;
  level: string;
  subject_focus: string;
}

export interface EmberSessionData {
  session_type: 'srs_review' | 'exam_completed' | 'forgecast_listened' | 'forgechat_session' | 'upload_completed';
  session_duration_minutes?: number;
  cards_reviewed?: number;
  cards_correct?: number;
  accuracy_percent?: number;
  accuracy_improvement_vs_last_session?: number;
  exam_score_percent?: number;
  exam_grade?: string;
  personal_best_broken?: boolean;
  streak_continued?: boolean;
  new_mature_cards?: number;
}

export interface EmberPurchaseData {
  item_id: 'neural_nudge' | 'phantom_recall' | 'echo_chamber' | 'temporal_splice' | 'deep_dive' | 'void_collapse' | 'cryo_shield' | 'memory_palace' | 'forge_exam' | 'kill_chain';
  ember_cost: number;
  context: {
    question_text?: string;
    card_front?: string;
    card_back?: string;
    topic?: string;
    topic_tag?: string;
    their_wrong_answer?: string;
    times_failed?: number;
    card_type?: string;
  };
}

export interface EmberEarningsResponse {
  embers_earned: {
    base_amount: number;
    bonuses: { reason: string; amount: number }[];
    total_earned: number;
    new_balance: number;
  };
  earn_message: string;
  milestone_unlocked?: string;
  streak_bonus_applied: boolean;
  next_milestone_preview: string;
}

export interface EmberRewardResponse {
  reward_delivered: {
    item_id: string;
    item_name: string;
    ember_cost: number;
    new_balance: number;
    delivery_message: string;
  };
  reward_content: {
    type: string;
    content: string;
    follow_up_action?: string;
  };
}

export interface AtmosphereRequest {
  active_theme: string;
  student_name: string;
  subject_context?: string;
  trigger: 'session_start' | 'forgecast_intro' | 'milestone_reached' | 'session_end';
}

export interface AtmosphereResponse {
  theme_id: string;
  session_greeting: string;
  ambient_descriptor: string;
  forgecast_atmosphere_line: string;
  milestone_message: string;
  session_end_message: string;
}

export interface Announcement {
  id: string;
  title: string;
  subheading: string;
  content: string;
  mediaUrl?: string;
  category: string;
  isPinned: boolean;
  authorName: string;
  authorId: string;
  createdAt: number;
}

export interface Feedback {
  id: string;
  userId: string;
  username: string;
  title: string;
  message: string;
  category: 'Bug Report' | 'Feature Request' | 'UI Suggestion' | 'Performance Issue' | 'General Feedback';
  status: 'pending' | 'resolved' | 'archived';
  createdAt: number;
}
