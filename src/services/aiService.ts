import { 
  Deck, 
  Quiz, 
  Flashcard, 
  QuizQuestion, 
  ForgeCastBlueprint, 
  ForgeCastChapter, 
  LessonArchitectAudit, 
  StudyMode, 
  ModeEngineSession, 
  SRSIntelligenceAnalysis, 
  ExamSimulatorOutput, 
  ForgeRevisionPlan, 
  ForgePersona, 
  AtmosphereRequest, 
  AtmosphereResponse, 
  EmberPurchaseData, 
  EmberStudentData, 
  EmberRewardResponse 
} from "../types";
import { generateId } from "../lib/utils";
import { auth } from "../lib/firebase";
import { checkAndIncrementUsage } from "./usageService";
import { ApiManager, NoAI, ButtonGuard } from "./apiManager";
import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;
let _lastKeyUsed: string | undefined;

const DEFAULT_MODEL = "gemini-3.5-flash";

function resolveApiKey(): string {
  const viteKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (viteKey && viteKey !== 'YOUR_GEMINI_API_KEY' && viteKey.length > 10) return viteKey;

  try {
    const procKey = typeof process !== 'undefined' ? (process.env?.GEMINI_API_KEY || '') : '';
    if (procKey && procKey !== 'MY_GEMINI_API_KEY' && procKey.length > 10) return procKey;
  } catch (_) {}

  throw new Error(
    'AI_SETUP_REQUIRED: Gemini API key not found. ' +
    'Create a .env file in your project root with: VITE_GEMINI_API_KEY=your_key_here\n' +
    'Get a free key at: https://aistudio.google.com/app/apikey'
  );
}

function getAI(): GoogleGenAI {
  const apiKey = resolveApiKey();
  if (aiInstance && _lastKeyUsed === apiKey) return aiInstance;
  aiInstance = new GoogleGenAI({ apiKey });
  _lastKeyUsed = apiKey;
  return aiInstance;
}

// Replacement for @google/genai Type enum
const Type = {
  OBJECT: 'OBJECT' as const,
  STRING: 'STRING' as const,
  NUMBER: 'NUMBER' as const,
  ARRAY: 'ARRAY' as const,
  BOOLEAN: 'BOOLEAN' as const
};

export let isQuotaLow = false;
export function setQuotaLow(val: boolean) { 
  if (isQuotaLow === val) return;
  isQuotaLow = val; 
  window.dispatchEvent(new CustomEvent('forge_quota_status_changed', { detail: { isQuotaLow: val } }));
}

/**
 * Image queue to manage concurrency.
 */
class ImageQueue {
  async add(prompt: string): Promise<string | null> {
    // Aggressive optimization: No auto-images unless explicitly requested via separate flow
    return null; 
  }
}

const imageQueue = new ImageQueue();

export async function generateImage(prompt: string, force: boolean = false): Promise<string | null> {
  if (!force) return null;
  return imageQueue.add(prompt);
}

export async function generateForgeCast(
  text: string,
  topic: string,
  persona: ForgePersona = 'pyra_default'
): Promise<ForgeCastBlueprint> {
  const result = await ApiManager.generateContent({
    type: 'forgecast',
    content: text,
    subject: topic,
    systemPrompt: `Transform text into a ForgeCast blueprint JSON. Persona: ${persona}. Be concise. Provide chapters with narration and visual prompts.`,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        metadata: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            estimated_duration: { type: Type.NUMBER },
            theme_color: { type: Type.STRING }
          },
          required: ["title", "estimated_duration", "theme_color"]
        },
        chapters: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              chapter_id: { type: Type.NUMBER },
              title: { type: Type.STRING },
              narration_text: { type: Type.STRING },
              visual_ai_prompt: { type: Type.STRING },
              screen_overlays: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.ARRAY, items: { type: Type.STRING } },
                  latex_formula: { type: Type.STRING }
                },
                required: ["text"]
              },
              transition: { type: Type.STRING }
            },
            required: ["chapter_id", "title", "narration_text", "visual_ai_prompt", "screen_overlays", "transition"]
          }
        },
        assessment: {
          type: Type.OBJECT,
          properties: {
            check_question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correct_index: { type: Type.NUMBER }
          },
          required: ["check_question", "options", "correct_index"]
        }
      },
      required: ["metadata", "chapters", "assessment"]
    }
  });

  return {
    id: generateId(),
    ...result,
    createdAt: Date.now()
  };
}

export async function generateForgeCastFromChat(
  input: string,
  fileContent?: string
): Promise<any> {
  return await ApiManager.generateContent({
    type: 'forgecast',
    content: input + (fileContent ? `\n\nContext: ${fileContent}` : ''),
    systemPrompt: "Generate a ForgeCast blueprint JSON from chat input.",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        metadata: { type: Type.OBJECT },
        chapters: { type: Type.ARRAY }
      }
    }
  });
}

export async function chatWithAcademicAssistant(
  message: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[], // Ignored in favor of PyraChatManager internal
  studentProfile: any,
  persona: ForgePersona = 'pyra_default',
  activeSkin: string = 'Default',
  lessonAudit?: LessonArchitectAudit,
  fileContent?: string
): Promise<string> {
  try {
    const sessionId = lessonAudit?.id || 'default_session';
    const systemInstruction = `You are Pyra (${persona}), academic assistant.
    Skin: ${activeSkin}. Student: ${studentProfile.name}.
    Be concise. Avoid repeating instructions.`;
    
    return await ApiManager.pyraChat({
      sessionId,
      userMessage: message,
      systemPrompt: systemInstruction,
      forgeDocument: lessonAudit?.forgechat_context_block || fileContent,
      forgeData: studentProfile
    });
  } catch (error: any) {
    if (error.code === 'RATE_LIMITED') {
      window.dispatchEvent(new CustomEvent('forge_quota_status_changed', { detail: { isQuotaLow: true } }));
      return "Forge cores on cooling cycle (Limit reached). Try again later.";
    }
    return "Calibrating systems. Please try again shortly.";
  }
}

export async function generateLessonPreview(text: string): Promise<any> {
  return await ApiManager.generateContent({
    type: 'audit',
    content: text,
    systemPrompt: "Extract objectives and key terms as JSON.",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
        key_terms: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    }
  });
}

export type ProgressStage = 'extracting' | 'auditing' | 'cards' | 'quiz' | 'finalizing';

export type GenerationIntensity = 'quick' | 'standard' | 'deep';

export async function generateStudyMaterial(
  text: string, 
  title: string, 
  instructions: string = '',
  quantity: number = 15, 
  difficulty: string = 'medium',
  mode: 'quiz' | 'flashcards' | 'both' = 'both',
  level: string = 'gcse',
  subject: string = 'General',
  youtubeUrl?: string,
  onProgress?: (stage: ProgressStage, message: string) => void,
  isCountMandatory: boolean = false,
  isAdmin: boolean = false,
  intensity: GenerationIntensity = 'standard'
): Promise<{ deck: Deck; quiz: Quiz; lesson?: LessonArchitectAudit }> {
  
  const user = auth.currentUser;
  if (user && !isAdmin) {
    const isAllowed = await checkAndIncrementUsage(user.uid);
    if (!isAllowed) throw new Error("Daily limit exceeded.");
  }

  onProgress?.('auditing', 'Conducting Unified Cognitive Fusion...');

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      audit: {
        type: Type.OBJECT,
        properties: {
          audit_metadata: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              subject: { type: Type.STRING },
              level_detected: { type: Type.STRING },
              academic_density_score: { type: Type.NUMBER },
              exam_relevance_score: { type: Type.NUMBER },
              estimated_mastery_hours: { type: Type.NUMBER }
            },
            required: ["title", "subject", "level_detected", "estimated_mastery_hours"]
          },
          semantic_map: {
            type: Type.OBJECT,
            properties: {
              central_thesis: { type: Type.STRING }
            },
            required: ["central_thesis"]
          }
        },
        required: ["audit_metadata", "semantic_map"]
      },
      memory_layer: {
        type: Type.OBJECT,
        properties: {
          flashcard_deck: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                front: { type: Type.STRING },
                back: { type: Type.STRING },
                explanation: { type: Type.STRING },
                topic_tag: { type: Type.STRING }
              },
              required: ["front", "back"]
            }
          }
        },
        required: ["flashcard_deck"]
      },
      application_layer: {
        type: Type.OBJECT,
        properties: {
          exam_questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                type: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correct_answer: { type: Type.STRING },
                mark_scheme: { type: Type.STRING },
                marks: { type: Type.NUMBER }
              },
              required: ["question", "type", "correct_answer"]
            }
          }
        },
        required: ["exam_questions"]
      }
    },
    required: ["audit", "memory_layer", "application_layer"]
  };

  const data = await ApiManager.generateContent({
    type: 'study_material',
    content: text,
    mode: intensity,
    requestedCount: quantity,
    level,
    subject,
    systemPrompt: `Lead Pedagogical Architect. Generate ${quantity} materials (flashcards/quiz).
    Title: ${title}, Difficulty: ${difficulty}, Level: ${level}.
    Output JSON following specified schema. Do NOT include images.`,
    responseSchema
  });

  const lesson: LessonArchitectAudit = { 
    ...data.audit, 
    memory_layer: data.memory_layer,
    application_layer: data.application_layer,
    id: generateId(), 
    createdAt: Date.now(),
    forgechat_context_block: text.substring(0, 5000)
  };

  const deck: Deck = {
    id: generateId(),
    title: title,
    cards: (data.memory_layer?.flashcard_deck || []).map((f: any) => ({
      id: generateId(),
      term: f.front,
      definition: f.back,
      explanation: f.explanation || "",
      topicTag: f.topic_tag || subject,
      interval: 0,
      ease: 2.5,
      nextReviewDate: Date.now(),
    })),
    createdAt: Date.now()
  };

  const quiz: Quiz = {
    id: generateId(),
    title: title,
    questions: (data.application_layer?.exam_questions || []).map((q: any) => ({
      id: generateId(),
      question: q.question,
      type: (q.type === 'mcq' ? 'mcq' : 'short_answer') as any,
      options: q.options || [],
      correctAnswer: (() => {
        if (q.type !== 'mcq') return undefined;
        const opts: string[] = q.options || [];
        const ca: string = (q.correct_answer || '').toLowerCase().trim();
        if (!ca) return 0;
        // Try exact match first
        let idx = opts.findIndex((o: string) => o.toLowerCase().trim() === ca);
        if (idx !== -1) return idx;
        // Try starts-with (handles "A. Some text" style correct_answer = "A")
        idx = opts.findIndex((o: string) => o.toLowerCase().trim().startsWith(ca));
        if (idx !== -1) return idx;
        // Try includes as last resort
        idx = opts.findIndex((o: string) => o.toLowerCase().includes(ca));
        return idx !== -1 ? idx : 0;
      })(),
      correctAnswerText: q.type !== 'mcq' ? q.correct_answer : undefined,
      explanation: q.mark_scheme || "",
      marks: q.marks || 1
    })),
    isAIGraded: true
  };

  return { deck, quiz, lesson };
}

export async function generateModeSession(
  auditData: LessonArchitectAudit,
  selectedMode: StudyMode,
  studentContext: any
): Promise<ModeEngineSession> {
  const data = await ApiManager.generateContent({
    type: 'audit',
    content: `Generate a specialized ${selectedMode} study session for student ${studentContext.name}. 
    Use the following audit data: ${JSON.stringify(auditData)}.
    Ensure you generate:
    1. A customized session_title.
    2. An opening_message motivating the student.
    3. mode_exclusive_content outlining a quick markdown briefing summary.
    4. flashcard_session with cards tailored to this mode.
    5. exam_session containing simulated test questions tailored to this mode.
    6. A closing_prompt guiding the student's next steps.`,
    systemPrompt: `You are the Forge Mode Engine. Create immersive study sessions based on previous neural audits. You must strictly adhere to the response schema structure, generating high-quality questions and cards.`,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        session_title: { type: Type.STRING },
        opening_message: { type: Type.STRING },
        closing_prompt: { type: Type.STRING },
        mode_exclusive_content: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            content: { type: Type.STRING }
          },
          required: ["type", "content"]
        },
        flashcard_session: {
          type: Type.OBJECT,
          properties: {
            cards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  card_id: { type: Type.STRING },
                  front: { type: Type.STRING },
                  back: { type: Type.STRING },
                  hint: { type: Type.STRING },
                  memory_hook: { type: Type.STRING },
                  mode_specific_tip: { type: Type.STRING },
                  sm2_initial_ease_factor: { type: Type.NUMBER },
                  sm2_initial_interval_days: { type: Type.NUMBER }
                },
                required: ["card_id", "front", "back", "hint", "memory_hook", "mode_specific_tip", "sm2_initial_ease_factor", "sm2_initial_interval_days"]
              }
            },
            total_cards: { type: Type.NUMBER },
            estimated_minutes: { type: Type.NUMBER },
            session_structure: { type: Type.STRING }
          },
          required: ["cards", "total_cards", "estimated_minutes", "session_structure"]
        },
        exam_session: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question_id: { type: Type.STRING },
                  type: { type: Type.STRING },
                  marks: { type: Type.NUMBER },
                  question_text: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correct_answer: { type: Type.STRING },
                  model_answer: { type: Type.STRING },
                  mark_scheme: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ["question_id", "type", "marks", "question_text", "options", "correct_answer"]
              }
            },
            total_questions: { type: Type.NUMBER },
            total_marks: { type: Type.NUMBER },
            estimated_minutes: { type: Type.NUMBER },
            mode_instructions: { type: Type.STRING }
          },
          required: ["questions", "total_questions", "total_marks", "estimated_minutes", "mode_instructions"]
        }
      },
      required: ["session_title", "opening_message", "closing_prompt", "mode_exclusive_content", "flashcard_session", "exam_session"]
    }
  });

  // Post-processing guard rail to guarantee absolute robustness
  const finalSession: ModeEngineSession = {
    id: generateId(),
    lessonId: auditData.id!,
    mode: selectedMode,
    createdAt: Date.now(),
    session_title: data.session_title || `${selectedMode.replace('_', ' ').toUpperCase()} Session`,
    opening_message: data.opening_message || "Welcome to your Study Forge session. Let's begin.",
    closing_prompt: data.closing_prompt || "Keep pushing forward! Success is built step by step.",
    mode_exclusive_content: {
      type: data.mode_exclusive_content?.type || "Key Briefing",
      content: data.mode_exclusive_content?.content || auditData.semantic_map?.central_thesis || "Deep dive analysis of materials."
    },
    flashcard_session: {
      cards: (data.flashcard_session?.cards || []).map((c: any, index: number) => ({
        card_id: c.card_id || `fc-${index}-${generateId()}`,
        front: c.front || "Concept",
        back: c.back || "Explanation",
        hint: c.hint || "Think about the central theme.",
        memory_hook: c.memory_hook || "Visualize this connection.",
        mode_specific_tip: c.mode_specific_tip || "Key recall prompt.",
        sm2_initial_ease_factor: Number(c.sm2_initial_ease_factor) || 2.5,
        sm2_initial_interval_days: Number(c.sm2_initial_interval_days) || 1
      })),
      total_cards: Number(data.flashcard_session?.total_cards) || (data.flashcard_session?.cards || []).length || 5,
      estimated_minutes: Number(data.flashcard_session?.estimated_minutes) || 5,
      session_structure: data.flashcard_session?.session_structure || "Recall and retention practice."
    },
    exam_session: {
      questions: (data.exam_session?.questions || []).map((q: any, index: number) => ({
        question_id: q.question_id || `q-${index}-${generateId()}`,
        type: q.type || 'mcq',
        marks: Number(q.marks) || 1,
        question_text: q.question_text || q.question || "Identify the core concept.",
        options: q.options || ["Option A", "Option B", "Option C", "Option D"],
        correct_answer: q.correct_answer || q.correctAnswerText || "Option A",
        model_answer: q.model_answer || q.correct_answer || "Option A",
        mark_scheme: q.mark_scheme || q.explanation || "No schema provided.",
        explanation: q.explanation || q.mark_scheme || "No explanation provided."
      })),
      total_questions: Number(data.exam_session?.total_questions) || (data.exam_session?.questions || []).length || 3,
      total_marks: Number(data.exam_session?.total_marks) || (data.exam_session?.questions || []).reduce((sum: number, q: any) => sum + (Number(q.marks) || 1), 0) || 3,
      estimated_minutes: Number(data.exam_session?.estimated_minutes) || 10,
      mode_instructions: data.exam_session?.mode_instructions || "Solve the problems under simulated exam conditions."
    }
  };

  return finalSession;
}

function getLocalSRSAnalysis(
  studentName: string,
  subject: string,
  sessionData: any,
  fullDeckStats: any
): SRSIntelligenceAnalysis {
  const cardsReviewed: any[] = sessionData?.cards_reviewed || [];
  const totalReviewed = cardsReviewed.length || 1;
  const correctCount = cardsReviewed.filter(c => (c.grade_given ?? c.grade ?? 5) >= 4).length;
  const accuracy = Math.round((correctCount / totalReviewed) * 100);
  
  let fastestCardId = 'unknown';
  let slowestCardId = 'unknown';
  let fastestTime = Infinity;
  let slowestTime = -1;
  let totalTime = 0;

  cardsReviewed.forEach(c => {
    const ms = Number(c.response_time_ms) || 3000;
    totalTime += ms;
    if (ms < fastestTime) {
      fastestTime = ms;
      fastestCardId = c.card_id;
    }
    if (ms > slowestTime) {
      slowestTime = ms;
      slowestCardId = c.card_id;
    }
  });

  const avgTime = Math.round(totalTime / totalReviewed);

  let quality: 'excellent' | 'good' | 'average' | 'poor' | 'crisis' = 'good';
  let reason = "You maintained a solid rhythm and solid retention across review terms.";
  let cognitiveLoad = "Moderate cognitive friction. Synaptic paths holding stable under normal conditions.";

  if (accuracy >= 90) {
    quality = 'excellent';
    reason = "Exceptional conceptual consolidation. Your synaptic retrieval is running at maximum efficiency.";
    cognitiveLoad = "Low cognitive load. This topic has achieved solid neural myelination.";
  } else if (accuracy < 60) {
    quality = 'poor';
    reason = "Friction detected. High recall failure rate suggests memory traces are fading quickly.";
    cognitiveLoad = "High cognitive stress. Consider breaking concepts down into simpler atomic definitions.";
  }

  return {
    id: generateId(),
    createdAt: Date.now(),
    session_analysis: {
      retention_rate_this_session: accuracy / 100,
      average_response_time_ms: avgTime,
      fastest_card_id: fastestCardId,
      slowest_card_id: slowestCardId,
      session_quality: quality,
      session_quality_reason: reason,
      estimated_next_session_retention: Math.min(1.0, (accuracy / 100) * 1.05),
      cognitive_load_assessment: cognitiveLoad
    },
    pattern_detection: [
      {
        pattern_type: accuracy < 75 ? 'concept_confusion' : 'rote_memorisation',
        pattern_name: accuracy < 75 ? "Cognitive Interference Wave" : "Rote Recall Consolidating",
        evidence: `Session accuracy was ${accuracy}% with an average recall velocity of ${(avgTime/1000).toFixed(1)}s per card.`,
        explanation: accuracy < 75 
          ? "Highly similar definitions or competing academic terms are overlapping in your short-term storage, leading to retrieval interference."
          : "You are successfully retrieving concepts, but they are heavily reliant on literal keyword matching rather than deep semantic structures.",
        recommended_action: accuracy < 75
          ? "Compare contrasting definitions side-by-side. Highlight the single critical differentiating factor of each term."
          : "Try explaining the concepts out loud in your own words or create a physical mind-map connecting these terms.",
        severity: accuracy < 75 ? 'moderate' : 'minor'
      }
    ],
    cards_needing_intervention: cardsReviewed.filter(c => (c.grade_given ?? c.grade ?? 5) < 3).slice(0, 2).map(c => ({
      card_id: String(c.card_id),
      intervention_type: 'add_memory_hook',
      reason: "This card was marked as forgotten or incorrect with a low response grade.",
      action_taken: "Injected local memory anchor blueprint."
    })),
    new_cards_generated: [],
    improved_memory_hooks: cardsReviewed.filter(c => (c.grade_given ?? c.grade ?? 5) < 3).slice(0, 2).map(c => ({
      card_id: String(c.card_id),
      old_hook: "",
      new_hook: "Anchor with a visual acronym: try grouping keywords of the answer into a simple 3-letter acronym.",
      hook_type: 'acronym',
      why_this_will_work_better: "Creating an easy abbreviation provides an immediate recall trigger."
    })),
    retention_predictions: cardsReviewed.slice(0, 2).map(c => ({
      card_id: String(c.card_id),
      current_interval_days: Number(c.interval) || 1,
      predicted_retention_at_due_date_percent: (c.grade_given ?? c.grade ?? 5) >= 4 ? 85 : 45,
      recommendation: (c.grade_given ?? c.grade ?? 5) >= 4 ? ('advance' as const) : ('pull_forward' as const),
      reasoning: "Computed based on active recall velocity and correctness feedback from this review session."
    })),
    motivational_output: {
      honest_assessment: `You reviewed ${totalReviewed} flashcard(s) with ${accuracy}% accuracy. Your retrieval engine is functioning at a ${quality} level.`,
      one_thing_to_fix: accuracy < 75 ? "Focus on cards where you took longer than 5 seconds to respond." : "Maintain a consistent daily streak to cement the neural paths.",
      milestone_approaching: "Synaptic Convergence Level 3 is only 5 reviews away.",
      streak_status: `Streak of ${fullDeckStats?.study_streak_days || 0} days is holding hot. Stoke the fire!`
    }
  };
}

export async function analyzeSRSSession(
  studentName: string,
  subject: string,
  sessionData: any,
  fullDeckStats: any
): Promise<SRSIntelligenceAnalysis> {
  if (isQuotaLow) {
    return getLocalSRSAnalysis(studentName, subject, sessionData, fullDeckStats);
  }
  try {
    const result = await ApiManager.generateContent({
      type: 'progression',
      content: JSON.stringify({ session: sessionData, stats: fullDeckStats }),
      subject,
      systemPrompt: `Analyze SRS performance for ${studentName} in ${subject}. Provide insights on cognitive load and retention.`,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          session_analysis: {
            type: Type.OBJECT,
            properties: {
              retention_rate_this_session: { type: Type.NUMBER },
              average_response_time_ms: { type: Type.NUMBER },
              session_quality: { type: Type.STRING },
              session_quality_reason: { type: Type.STRING },
              cognitive_load_assessment: { type: Type.STRING }
            },
            required: ["retention_rate_this_session", "session_quality"]
          },
          pattern_detection: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                pattern_name: { type: Type.STRING },
                explanation: { type: Type.STRING },
                severity: { type: Type.STRING },
                recommended_action: { type: Type.STRING }
              }
            }
          },
          improved_memory_hooks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                card_id: { type: Type.STRING },
                new_hook: { type: Type.STRING }
              }
            }
          },
          new_cards_generated: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                front: { type: Type.STRING },
                back: { type: Type.STRING },
                topic_tag: { type: Type.STRING },
                card_type: { type: Type.STRING },
                generated_because: { type: Type.STRING },
                memory_hook: { type: Type.STRING },
                sm2_initial_ease_factor: { type: Type.NUMBER },
                sm2_initial_interval_days: { type: Type.NUMBER }
              }
            }
          },
          motivational_output: {
            type: Type.OBJECT,
            properties: {
              honest_assessment: { type: Type.STRING },
              one_thing_to_fix: { type: Type.STRING },
              milestone_approaching: { type: Type.STRING },
              streak_status: { type: Type.STRING }
            }
          }
        },
        required: ["session_analysis", "pattern_detection", "improved_memory_hooks", "new_cards_generated", "motivational_output"]
      }
    });

    return { id: generateId(), createdAt: Date.now(), ...result };
  } catch (error: any) {
    console.warn("[Progression API] Error analyzing SRS session, using high-fidelity local engine:", error);
    if (error.code === 'RATE_LIMITED' || error.message?.includes('RATE_LIMIT') || error.message?.includes('QUOTA')) {
      setQuotaLow(true);
    }
    return getLocalSRSAnalysis(studentName, subject, sessionData, fullDeckStats);
  }
}

/**
 * Generates personalized study advice based on Supabase analytics
 */
export async function getPersonalizedAdvice(
  studentName: string,
  analytics: { sessions: any[]; quizResults: any[] }
): Promise<string> {
  const sessionsSummary = analytics.sessions.slice(0, 5).map(s => 
    `- ${s.subject}: ${s.duration_minutes}m (${new Date(s.created_at).toLocaleDateString()})`
  ).join('\n');

  const quizSummary = analytics.quizResults.slice(0, 5).map(r => 
    `- ${r.subject}: ${r.score_percentage}% (${new Date(r.created_at).toLocaleDateString()})`
  ).join('\n');

  const systemPrompt = `You are a world-class academic advisor in Study Forge. 
  Analyze student data and provide a concise, high-impact study plan for today.
  Focus on weak points (low quiz scores) and consistency.
  Use markdown and emojis sparingly.`;

  const userMessage = `Student Name: ${studentName}

Recent Data:
Recent Study Sessions:
${sessionsSummary || 'No recent sessions recorded.'}

Recent Quiz Results:
${quizSummary || 'No recent quiz results recorded.'}

What should I study today and why? Give me a 3-step action plan.`;

  try {
    const result = await ApiManager.generateContent({
      type: 'progression',
      content: userMessage,
      systemPrompt,
      responseSchema: {
        type: 'OBJECT',
        properties: {
          advice: { type: 'STRING' }
        },
        required: ["advice"]
      }
    } as any);

    return result.advice;
  } catch (error) {
    console.error('Error generating personalized advice:', error);
    return "Focus on your lowest scoring subjects today. Consistency is the key to mastery!";
  }
}

export function generateFallbackExam(lesson: any): any {
  const lessonTitle = lesson?.audit_metadata?.title || 'Subject Topic';
  const level = lesson?.audit_metadata?.level_detected || 'GCSE';
  const subjectName = (lesson?.audit_metadata?.subject || lessonTitle || 'General').toLowerCase();
  const examId = `exam_fallback_${Date.now()}`;
  
  const questionsMapped: any[] = [];
  
  // Try to salvage existing flashcards first to make it highly relevant to the actual input note content
  const lessonCards = lesson?.memory_layer?.flashcard_deck || [];
  const lessonConcepts = lesson?.semantic_map?.concept_hierarchy?.[0]?.concepts || [];
  const lessonChains = lesson?.semantic_map?.causal_chains || [];
  const lessonMisconceptions = lesson?.misconception_map || [];

  if (lessonCards.length > 0 || lessonConcepts.length > 0) {
    // We have custom lesson data! Let's generate a 100% custom-focused exam for this specific topic!
    // 10 MCQs
    for (let i = 0; i < 10; i++) {
      const card = lessonCards[i % lessonCards.length];
      const qText = `Regarding the key topic of **${card?.topic_tag || lessonTitle}**:\n\nAnalyze the statement or parameter: **${card?.front || 'Core Theory'}**\n\nWhich of the following describes the most precise definition, response, or mechanism?`;
      const correctAns = card?.back || 'Correct concept alignment.';
      
      // Let's gather 3 wrong answers from other cards or fallback
      const otherCardAnswers = lessonCards
        .filter((c: any) => c.back !== correctAns)
        .map((c: any) => c.back);
      
      const wrg1 = otherCardAnswers[0] || card?.common_wrong_answer || 'Incorrect theoretical interpretation.';
      const wrg2 = otherCardAnswers[1] || 'Sub-optimal parameter state selection.';
      const wrg3 = otherCardAnswers[2] || 'Unvalidated alternative hypothesis.';
      
      questionsMapped.push({
        question_id: `dynamic_mcq_${i}_${Date.now()}`,
        type: 'mcq',
        marks: 1,
        question_text: qText,
        options: [correctAns, wrg1, wrg2, wrg3].sort(() => Math.random() - 0.5),
        topic_tag: card?.topic_tag || 'Core Syllabus Topic',
        targets_weak_area: i % 3 === 0,
        is_trick_question: i % 5 === 0,
        cognitive_demand: 'recall',
        HIDDEN_correct_answer: correctAns,
        HIDDEN_mark_scheme: `Award 1 mark for correct selection matching the syllabus definition: "${correctAns}".`,
        HIDDEN_model_answer: `The precise selection should identify: "${correctAns}".`,
        HIDDEN_common_mistakes: [wrg1, wrg2, wrg3],
        HIDDEN_examiner_tip: card?.hint || 'Read all choices carefully and distinguish causal factors.'
      });
    }

    // 5 Free Responses
    for (let i = 0; i < 5; i++) {
      let qText = '';
      let topic = 'Analytical Evaluation';
      let correctModel = 'Exhaustive thematic analysis.';
      
      if (lessonChains.length > 0 && lessonChains[i % lessonChains.length]) {
        const chain = lessonChains[i % lessonChains.length];
        const stepsStr = chain.steps?.map((s: any) => `- **${s.concept}**: ${s.causes}`).join('\n') || '';
        qText = `Evaluate the causal pathway and dynamic sequence of **${chain.chain_name || 'the concept chain'}**.\n\nDetail each step of the mechanism, outlining how causes link to observable evidence.\n\n${stepsStr}`;
        topic = chain.chain_name || 'Causal Chain Mechanics';
        correctModel = `Detailed breakdown of ${chain.chain_name} analyzing causative links.`;
      } else if (lessonMisconceptions.length > 0 && lessonMisconceptions[i % lessonMisconceptions.length]) {
        const mis = lessonMisconceptions[i % lessonMisconceptions.length];
        qText = `Analyze the typical misconception: **${mis.misconception}**.\n\n1. Explain why students commonly believe this misconception.\n2. State the scientific/academic truth.\n3. Detail how to distinguish and remember the difference under exam pressure.`;
        topic = 'Misconception Decoupling';
        correctModel = mis.the_truth;
      } else if (lessonConcepts.length > 0 && lessonConcepts[i % lessonConcepts.length]) {
        const con = lessonConcepts[i % lessonConcepts.length];
        qText = `Analyse the fundamental concept of **${con.concept}**:\n\n1. Give the rigorous definition.\n2. Explain in plain terminology why this concept matters globally.\n3. Address how this applies under typical question models: ${con.common_exam_question_types?.join(', ') || 'general essay queries'}.`;
        topic = con.concept;
        correctModel = con.definition;
      } else {
        const card = lessonCards[(i + 10) % lessonCards.length] || lessonCards[0];
        qText = `Compose an in-depth analytical response concerning: **${card?.front || 'Syllabus Topic'}**.\n\nExplain the context, background, and provide critical evaluations of the related theories and models.`;
        topic = card?.topic_tag || 'Syllabus Focus';
        correctModel = card?.back || 'Comprehensive review of concepts.';
      }

      questionsMapped.push({
        question_id: `dynamic_fr_${i}_${Date.now()}`,
        type: 'short_answer',
        marks: 4,
        question_text: `${qText}\n\nProvide a structured academic argument referencing relevant mechanisms and proofs.`,
        topic_tag: topic,
        targets_weak_area: i % 2 === 0,
        is_trick_question: false,
        cognitive_demand: 'evaluation',
        HIDDEN_correct_answer: correctModel,
        HIDDEN_mark_scheme: 'Award up to 4 marks: 2 marks for factual correctness, 2 marks for coherent structural evaluation and causal framing.',
        HIDDEN_model_answer: `The expected answer should detail: "${correctModel}".`,
        HIDDEN_common_mistakes: ['Failing to trace intermediate links', 'Confusing terms'],
        HIDDEN_examiner_tip: 'Back each claim with specific evidence or mathematical derivations where applicable.'
      });
    }

    const totalMarks = questionsMapped.reduce((sum: number, q: any) => sum + q.marks, 0);
    const accessible_question_ids = questionsMapped.filter((q: any) => q.marks === 1).map((q: any) => q.question_id);
    const target_question_ids = questionsMapped.filter((q: any) => q.marks > 1 && q.marks <= 4).map((q: any) => q.question_id);
    const stretch_question_ids = questionsMapped.filter((q: any) => q.marks > 4).map((q: any) => q.question_id);

    if (accessible_question_ids.length === 0 && questionsMapped.length > 0) accessible_question_ids.push(questionsMapped[0].question_id);
    if (target_question_ids.length === 0 && questionsMapped.length > 0) target_question_ids.push(questionsMapped[0].question_id);
    if (stretch_question_ids.length === 0 && questionsMapped.length > 0) stretch_question_ids.push(questionsMapped[0].question_id);

    return {
      exam: {
        exam_id: examId,
        metadata: {
          title: `${lessonTitle} - Exam Simulator`,
          subject: lesson?.audit_metadata?.subject || 'Dynamic Subject',
          level: level,
          duration_minutes: 30,
          total_marks: totalMarks,
          author_tag: 'Forge Offline Compiler 4.0'
        },
        sections: [
          {
            section_id: 'sec_1',
            section_title: 'Unified Evaluation Matrix',
            instructions: 'Answer all multiple choice and analytical short response questions carefully.',
            questions: questionsMapped
          }
        ],
        difficulty_map: {
          accessible_question_ids,
          target_question_ids,
          stretch_question_ids
        }
      }
    };
  }

  // Decide domain based on keywords in title, description, or subject
  let domain: 'chemistry' | 'history' | 'french' | 'computer_science' = 'computer_science';
  if (subjectName.includes('chem') || subjectName.includes('acid') || subjectName.includes('bond') || subjectName.includes('reaction')) {
    domain = 'chemistry';
  } else if (subjectName.includes('histor') || subjectName.includes('war') || subjectName.includes('revolut') || subjectName.includes('constitu')) {
    domain = 'history';
  } else if (subjectName.includes('fren') || subjectName.includes('vocab') || subjectName.includes('lang') || subjectName.includes('verb')) {
    domain = 'french';
  }
  
  if (domain === 'chemistry') {
    // 10 MCQs for Chemistry
    const chemMcqs = [
      { q: "What is the pH level of a neutral aqueous solution at 25°C?", correct: "pH 7.0", wrg: ["pH 1.0", "pH 14.0", "pH 4.5"], topic: "Acid-Base Chemistry" },
      { q: "Which type of chemical bond involves the mutual sharing of electron pairs between atoms?", correct: "Covalent bond", wrg: ["Ionic bond", "Hydrogen bond", "Metallic bond"], topic: "Chemical Bonding" },
      { q: "Identify the element designed with the electron configuration 1s² 2s² 2p⁶.", correct: "Neon (Ne)", wrg: ["Oxygen (O)", "Carbon (C)", "Argon (Ar)"], topic: "Atomic Structure" },
      { q: "What does Le Chatelier's principle govern in chemical processes?", correct: "Preservation of chemical equilibrium adjustments", wrg: ["Rate of thermal decomposition", "Activation energy limits", "Molar solubility thresholds"], topic: "Chemical Equilibrium" },
      { q: "What is the catalyst used in the Haber process for ammonia synthesis?", correct: "Iron catalyst", wrg: ["Nickel catalyst", "Platinum catalyst", "Copper catalyst"], topic: "Industrial Chemistry" },
      { q: "Which of the following defines an exothermic reaction?", correct: "A reaction that releases thermal energy to its surroundings", wrg: ["A reaction requiring constant thermal input", "A reaction with zero entropy shift", "A reaction accelerating without mass change"], topic: "Thermodynamics" },
      { q: "What is the oxidation state of sulfur in sulfuric acid (H₂SO₄)?", correct: "+6", wrg: ["+4", "-2", "0"], topic: "Redox Reactions" },
      { q: "Which gas is evolved when calcium carbonate reacts with dilute hydrochloric acid?", correct: "Carbon dioxide (CO₂)", wrg: ["Hydrogen gas (H₂)", "Oxygen gas (O₂)", "Chlorine gas (Cl₂)"], topic: "Reaction Products" },
      { q: "What is the mathematical equation for the Ideal Gas Law?", correct: "PV = nRT", wrg: ["P = V / T", "PV = nR / T", "V = pRT"], topic: "Gas Kinetics" },
      { q: "What type of intermolecular force is strongest between H₂O molecules?", correct: "Hydrogen bonding", wrg: ["London dispersion forces", "Dipole-induced dipole forces", "Covalent lattice bonds"], topic: "Intermolecular Forces" }
    ];

    for (let i = 0; i < 10; i++) {
      const src = chemMcqs[i];
      // Override text if we have dynamic card contents to preserve exact user inputs
      const qText = i < lessonCards.length && lessonCards[i].front 
        ? `Based on the study materials: ${lessonCards[i].front}\n\nSelect the most accurate response.`
        : `Consider the following chemical equation or query:\n\n$$\\text{Reactants} \\rightarrow \\text{Products}$$\n\n${src.q}`;
        
      const correctAns = i < lessonCards.length && lessonCards[i].back ? lessonCards[i].back : src.correct;

      questionsMapped.push({
        question_id: `fallback_chem_mcq_${i}`,
        type: 'mcq',
        marks: 1,
        question_text: qText,
        options: [correctAns, src.wrg[0], src.wrg[1], src.wrg[2]].sort(),
        topic_tag: i < lessonCards.length ? (lessonCards[i].topic || src.topic) : src.topic,
        targets_weak_area: false,
        is_trick_question: false,
        cognitive_demand: 'recall',
        HIDDEN_correct_answer: correctAns,
        HIDDEN_mark_scheme: 'Award 1 mark for correct selection.',
        HIDDEN_model_answer: `The precise selection should match core laws of matter and bonds: ${correctAns}.`,
        HIDDEN_common_mistakes: src.wrg,
        HIDDEN_examiner_tip: 'Calculate oxidation numbers carefully, validating signs.'
      });
    }

    // 5 Free Responses for Chemistry
    const chemFrs = [
      "Explain how the rate of reaction is impacted by catalyst addition and temperature shifts.",
      "Detail the distinction between strong and weak acids, referencing dissociation constants.",
      "Analyse the thermodynamic criteria required for a chemical reaction to be considered spontaneous.",
      "Describe the electronic configuration shift that occurs during a redox replacement transition.",
      "Outline how buffering capacity resists massive pH fluctuation upon the introduction of strong bases."
    ];

    for (let i = 0; i < 5; i++) {
      questionsMapped.push({
        question_id: `fallback_chem_fr_${i}`,
        type: 'short_answer',
        marks: 4,
        question_text: `${chemFrs[i]}\n\nWrite a rigorous structured scientific response:\n\n$$\\Delta G = \\Delta H - T\\Delta S$$`,
        topic_tag: 'Physical & Organic Reaction Dynamics',
        targets_weak_area: i % 2 === 0,
        is_trick_question: false,
        cognitive_demand: 'evaluation',
        HIDDEN_correct_answer: 'Thorough explanation referencing activation states, potential thresholds, and molecular collisions.',
        HIDDEN_mark_scheme: '2 marks for kinetic collisions and state transition. 2 marks for clear energetic mathematical alignment.',
        HIDDEN_model_answer: 'Catalysts introduce alternative lower energetic reaction pathways of activation.',
        HIDDEN_common_mistakes: ['Confusing endothermic with exothermic energy curves', 'Omitting state notations'],
        HIDDEN_examiner_tip: 'Always cite collision frequency explicitly alongside activation energy decreases.'
      });
    }

  } else if (domain === 'history') {
    // 10 MCQs for History
    const histMcqs = [
      { q: "Which treaty officially brought World War I to an end in 1919?", correct: "Treaty of Versailles", wrg: ["Treaty of Ghent", "Treaty of Utrecht", "Treaty of Paris"], topic: "International Treaties" },
      { q: "Who was the primary author of the United States Declaration of Independence in 1776?", correct: "Thomas Jefferson", wrg: ["George Washington", "Benjamin Franklin", "John Adams"], topic: "Constitutional History" },
      { q: "What event in October 1929 is widely considered the trigger of the Great Depression?", correct: "Wall Street Stock Market Crash", wrg: ["The Dust Bowl", "The passage of the Smoot-Hawley Tariff", "The collapse of credit unions"], topic: "Economic History" },
      { q: "The doctrine of 'containment' designed during the Cold War aimed to prevent the spread of which ideology?", correct: "Soviet Communism", wrg: ["Imperial Fascism", "Neo-Mercantilism", "Anarcho-Syndicalism"], topic: "Cold War Politics" },
      { q: "Which conflict led to the creation of the United Nations as a successor to the League of Nations?", correct: "World War II", wrg: ["The Napoleonic Wars", "World War I", "The Franco-Prussian War"], topic: "Modern Conflicts" },
      { q: "What was the core goal of the Marshall Plan instituted in Europe?", correct: "Economic reconstruction of war-torn nations", wrg: ["Direct military occupation of Berlin", "Laying intercontinental telegraph channels", "Implementing agricultural quotas"], topic: "Socioeconomic Reforms" },
      { q: "Who was the first emperor of the Roman Empire, concluding the Roman Republic era?", correct: "Augustus Caesar", wrg: ["Julius Caesar", "Nero Caesar", "Marcus Aurelius"], topic: "Classical Antiquity" },
      { q: "The French Revolution of 1789 began with the storming of which royal fortress?", correct: "The Bastille", wrg: ["Versailles Palace", "The Tuileries", "The Louvre"], topic: "European Revolutions" },
      { q: "Which ruler signed the Magna Carta at Runnymede in 1215?", correct: "King John", wrg: ["King Henry VIII", "King Richard I", "King Charles I"], topic: "Constitutional Milestones" },
      { q: "Which system of military and social obligations dominated medieval European governance?", correct: "Feudalism", wrg: ["Manorialism", "Mercantilism", "Absolutism"], topic: "Medieval Society" }
    ];

    for (let i = 0; i < 10; i++) {
      const src = histMcqs[i];
      const qText = i < lessonCards.length && lessonCards[i].front 
        ? `Identify the correct historical context based on study elements:\n\n**${lessonCards[i].front}**`
        : `Analyse the historical source materials or question:\n\n${src.q}`;
        
      const correctAns = i < lessonCards.length && lessonCards[i].back ? lessonCards[i].back : src.correct;

      questionsMapped.push({
        question_id: `fallback_hist_mcq_${i}`,
        type: 'mcq',
        marks: 1,
        question_text: qText,
        options: [correctAns, src.wrg[0], src.wrg[1], src.wrg[2]].sort(),
        topic_tag: i < lessonCards.length ? (lessonCards[i].topic || src.topic) : src.topic,
        targets_weak_area: false,
        is_trick_question: false,
        cognitive_demand: 'recall',
        HIDDEN_correct_answer: correctAns,
        HIDDEN_mark_scheme: 'Award 1 mark for the correct historical option.',
        HIDDEN_model_answer: `The historical record identifies ${correctAns} as the primary causal factor.`,
        HIDDEN_common_mistakes: src.wrg,
        HIDDEN_examiner_tip: 'Differentiate between proximate triggers and root underlying structural causes.'
      });
    }

    // 5 Free Responses for History
    const histFrs = [
      "Evaluate the long-term geopolitical impacts of the Treaty of Versailles on European stability in the interwar period.",
      "Analyse the significance of primary source corroboration when examining socio-political revolutions.",
      "Explain the primary economic and political factors that accelerated the fall of the Western Roman Empire.",
      "Discuss the ideological differences that created the division between NATO forces and the Warsaw Pact.",
      "Detail how the Industrial Revolution reshaped demographic distributions and class structures across urban areas."
    ];

    for (let i = 0; i < 5; i++) {
      questionsMapped.push({
        question_id: `fallback_hist_fr_${i}`,
        type: 'short_answer',
        marks: 4,
        question_text: `${histFrs[i]}\n\nWrite a rigorous analytical response focusing on causal analysis and histographical evidence.`,
        topic_tag: 'Historiography & Global Hegemonies',
        targets_weak_area: i % 2 === 0,
        is_trick_question: false,
        cognitive_demand: 'evaluation',
        HIDDEN_correct_answer: 'Exhaustive thematic review citing economic, political, and industrial coordinates.',
        HIDDEN_mark_scheme: '2 marks for articulating concrete historical events. 2 marks for synthesizing global geopolitical cause-and-effect pipelines.',
        HIDDEN_model_answer: 'Interwar hyperinflation and severe territorial extraction laid structural avenues for militarized discontent.',
        HIDDEN_common_mistakes: ['Relying on modern retrofitted biases', 'Vague answers missing specific years or names'],
        HIDDEN_examiner_tip: 'Structure your paragraph chronologically, backing arguments with specific cited examples.'
      });
    }

  } else if (domain === 'french') {
    // 10 MCQs for French
    const frenMcqs = [
      { q: "Which auxiliary verb is used to form the passé composé of the verb 'aller'?", correct: "Être", wrg: ["Avoir", "Faire", "Devoir"], topic: "Past Participle Alignment" },
      { q: "What is the correct translation of 'The study guide' in French?", correct: "Le guide d'étude", wrg: ["La guide d'étude", "Le bibliothèque", "Un feuille d'étude"], topic: "Genders & Nouns" },
      { q: "Choose the correct past participle form for the regular -ir verb 'finir'.", correct: "Fini", wrg: ["Finis", "Finé", "Finu"], topic: "Verb Conjugation" },
      { q: "Which French relative pronoun is used as the subject of a relative clause?", correct: "Qui", wrg: ["Que", "Dont", "Où"], topic: "Pronouns" },
      { q: "What is the correct conditional conjugation of the verb 'avoir' for the first person plural (nous)?", correct: "Nous aurions", wrg: ["Nous avons", "Nous aurons", "Nous avions"], topic: "Conditional Mood" },
      { q: "Translate the idiom 'poser un lapin' to its closest English literal equivalent.", correct: "To stand someone up", wrg: ["To catch a rabbit", "To raise standard questions", "To pose a difficult riddle"], topic: "Idiomatic Expressions" },
      { q: "Which of the following prepositions precedes feminine countries (e.g., la France)?", correct: "En", wrg: ["À", "Au", "Aux"], topic: "Prepositional Rules" },
      { q: "What ending is appended to regular -er verbs for the third person plural in imparfait?", correct: "-aient", wrg: ["-aient", "-iez", "-ions", "-ais"], topic: "Imparfait Conjugation" },
      { q: "Complete with the correct subjonctif conjugation: 'Il faut que tu _______' (faire).", correct: "Fasses", wrg: ["Fais", "Fis", "Fasses", "Fera"], topic: "Subjunctive Mood" },
      { q: "Define the term 'revanche' in French.", correct: "Revenge or counter-move", wrg: ["Dream", "Window", "Holiday"], topic: "Vocabulary Acquisition" }
    ];

    for (let i = 0; i < 10; i++) {
      const src = frenMcqs[i];
      const qText = i < lessonCards.length && lessonCards[i].front 
        ? `Translate or identify the correct French syntax: **${lessonCards[i].front}**`
        : `Choisissez l'option correcte pour la question de grammaire suivante:\n\n${src.q}`;
        
      const correctAns = i < lessonCards.length && lessonCards[i].back ? lessonCards[i].back : src.correct;

      questionsMapped.push({
        question_id: `fallback_fren_mcq_${i}`,
        type: 'mcq',
        marks: 1,
        question_text: qText,
        options: [correctAns, src.wrg[0], src.wrg[1], src.wrg[2]].sort(),
        topic_tag: i < lessonCards.length ? (lessonCards[i].topic || src.topic) : src.topic,
        targets_weak_area: false,
        is_trick_question: false,
        cognitive_demand: 'recall',
        HIDDEN_correct_answer: correctAns,
        HIDDEN_mark_scheme: 'Award 1 mark for selecting the correct grammatical alignment.',
        HIDDEN_model_answer: `The correct option is: ${correctAns}.`,
        HIDDEN_common_mistakes: src.wrg,
        HIDDEN_examiner_tip: 'Double-check subject-verb agreement rules for auxiliary verbs.'
      });
    }

    // 5 Free Responses for French
    const frenFrs = [
      "Explain the key difference between using the Passé Composé and the Imparfait when writing about the past, providing exam-ready comparative sentences.",
      "Explain when and how the subjunctive mood (le subjonctif) must be used in complex sentence structures.",
      "Detail the spelling adjustments and agreements required when verbs form passivation using the helper Être.",
      "Translate this complex sentence precisely: 'If I had studied earlier, I would have passed the chemistry exam with distinction.'",
      "Draft a structured 4-sentence reflection on educational technology in premium academic French."
    ];

    for (let i = 0; i < 5; i++) {
      questionsMapped.push({
        question_id: `fallback_fren_fr_${i}`,
        type: 'short_answer',
        marks: 4,
        question_text: `${frenFrs[i]}\n\nCompose a grammatically precise response in standard written French.`,
        topic_tag: 'Syntactic Mastery & Stylistic Genders',
        targets_weak_area: i % 2 === 0,
        is_trick_question: false,
        cognitive_demand: 'evaluation',
        HIDDEN_correct_answer: 'Precise grammatical layout showing mastery of agreement rules and context markers.',
        HIDDEN_mark_scheme: '2 marks for grammatical correctness and subject agreements. 2 marks for using accurate tense markers (Imparfait vs Passé).',
        HIDDEN_model_answer: 'L\'imparfait exprime une habitude ou une description du passé alors que le passé composé indique une action ponctuelle et achevée.',
        HIDDEN_common_mistakes: ['Mixing present indicative with past auxiliary', 'Omitting extra "e" or "s" qualifiers on relative agreements'],
        HIDDEN_examiner_tip: 'Use standard structural phrases like "bien que" followed by subjunctive verbs to earn high stylistic marks.'
      });
    }

  } else {
    // 10 MCQs for Computer Science (Original / Fallback Domain)
    const csMcqs = [
      { q: "Explain the core difference between a class blueprint and object instances.", correct: "A class is an architectural blueprint. An object is a concrete instance allocated to active memory.", wrg: ["A class handles compile-time pointers and objects run on remote databases.", "A class serves static references while objects process dynamic types exclusively.", "There is no difference in structure; both refer to functional interfaces."], topic: "OO Foundations" },
      { q: "Which syntax is the standard approach to declare private encapsulation inside a Python constructor?", correct: "self.__attribute = value", wrg: ["private self.attribute = value", "self.attribute: private = value", "self._private_attribute = value"], topic: "Encapsulation" },
      { q: "What is the time complexity of looking up a unique key in a perfectly balanced hash table?", correct: "O(1)", wrg: ["O(log N)", "O(N)", "O(N log N)"], topic: "Complexity Theory" },
      { q: "Explain polymorphic behavior in simple inheritance architectures.", correct: "Subclasses resolve custom overriding methods of the parent class interface dynamically.", wrg: ["Subclasses duplicate memory slots for every single static helper.", "Parent classes can instantiate child pointers on compiling.", "Dynamic types are coerced into primitive bytes before compilation."], topic: "Polymorphism" },
      { q: "Which pointer assignment is standard practice to refer to the current executing object instance inside Python?", correct: "self", wrg: ["this", "current", "super"], topic: "Constructor Scope" },
      { q: "What structural pattern guarantees that only a single instance of a class exists throughout runtime execution?", correct: "Singleton Pattern", wrg: ["Factory Pattern", "Adapter Pattern", "Observer Pattern"], topic: "Design Patterns" },
      { q: "In standard database design, what does the 'ACID' property 'Atomicity' guarantee?", correct: "Either all steps of a transaction complete successfully, or none do.", wrg: ["Data values are converted into mathematical base schemas.", "Queries run in exactly one millisecond.", "Rows are safely partitioned across servers."], topic: "Relational Databases" },
      { q: "Which stack data structure operator removes and returns the most recently inserted element?", correct: "pop()", wrg: ["push()", "shift()", "peek()"], topic: "Linear Data structures" },
      { q: "Which protocol operates at the Application Layer of the standard ISO/OSI networking model?", correct: "HTTP", wrg: ["TCP", "IP", "Ethernet"], topic: "Network Architecture" },
      { q: "What is the primary objective of a compilation lexical analysis pass?", correct: "To convert input character streams into structural token sequences.", wrg: ["To emit optimized machine-level binary code.", "To build a complete class inheritance schema.", "To check types for all active declarations."], topic: "Compiler Design" }
    ];

    for (let i = 0; i < 10; i++) {
      const src = csMcqs[i];
      const qText = i < lessonCards.length && lessonCards[i].front 
        ? `Given the core programming model:\n\n**${lessonCards[i].front}**\n\nChoose the most precise explanation.`
        : `Consider the following architectural question or challenge:\n\n\`\`\`python\n# Practice snippet ${i}\nx = ${i}\nprint(x)\n\`\`\`\n\n${src.q}`;
        
      const correctAns = i < lessonCards.length && lessonCards[i].back ? lessonCards[i].back : src.correct;

      questionsMapped.push({
        question_id: `fallback_cs_mcq_${i}`,
        type: 'mcq',
        marks: 1,
        question_text: qText,
        options: [correctAns, src.wrg[0], src.wrg[1], src.wrg[2]].sort(),
        topic_tag: i < lessonCards.length ? (lessonCards[i].topic || src.topic) : src.topic,
        targets_weak_area: false,
        is_trick_question: false,
        cognitive_demand: 'recall',
        HIDDEN_correct_answer: correctAns,
        HIDDEN_mark_scheme: 'Award 1 mark for accurate concept selection.',
        HIDDEN_model_answer: `The correct output is: ${correctAns}.`,
        HIDDEN_common_mistakes: src.wrg,
        HIDDEN_examiner_tip: 'Identify bounds, pointer targets, and scope attributes first.'
      });
    }

    // 5 Free Responses for Computer Science
    const csFrs = [
      "Explain the core purpose of a class constructor method in object-oriented programs, detailing what memory developments occur upon instantiation.",
      "Discuss the trade-offs of using an array data structure versus an active linked list regarding retrieval and insertion operations.",
      "Analyse the importance of private encapsulation variables, demonstrating what access violations occur when class scope is breached.",
      "Outline how inheritance hierarchies improve software modularity and reuse, citing specific polymorphic parameters.",
      "Explain how Big-O space complexity applies to recursive algorithms compared to iterative alternatives."
    ];

    for (let i = 0; i < 5; i++) {
      questionsMapped.push({
        question_id: `fallback_cs_fr_${i}`,
        type: 'short_answer',
        marks: 4,
        question_text: `${csFrs[i]}\n\nProvide deep-dive pseudocode or detailed comparative analysis blocks wrapped in Markdown fences.`,
        topic_tag: 'Object Architecture & Data Structures',
        targets_weak_area: i % 2 === 0,
        is_trick_question: false,
        cognitive_demand: 'evaluation',
        HIDDEN_correct_answer: 'Full layout explaining constructor behaviors, allocations, pointer setups, or structural differences.',
        HIDDEN_mark_scheme: '2 marks for conceptual logic and structural models; 2 marks for precision Big-O descriptions or clean syntactic references.',
        HIDDEN_model_answer: 'A constructor allocates memory structures on the active heap, setting base attributes.',
        HIDDEN_common_mistakes: ['Confusing compiled pointers with runtime arrays', 'Vague complexity definitions'],
        HIDDEN_examiner_tip: 'Always provide a brief snippet demonstrating setup to maximize performance marks.'
      });
    }
  }

  const totalMarks = questionsMapped.reduce((sum: number, q: any) => sum + q.marks, 0);

  const accessible_question_ids = questionsMapped.filter((q: any) => q.marks <= 2).map((q: any) => q.question_id);
  const target_question_ids = questionsMapped.filter((q: any) => q.marks > 2 && q.marks <= 4).map((q: any) => q.question_id);
  const stretch_question_ids = questionsMapped.filter((q: any) => q.marks > 4).map((q: any) => q.question_id);

  if (accessible_question_ids.length === 0 && questionsMapped.length > 0) accessible_question_ids.push(questionsMapped[0].question_id);
  if (target_question_ids.length === 0 && questionsMapped.length > 0) target_question_ids.push(questionsMapped[0].question_id);
  if (stretch_question_ids.length === 0 && questionsMapped.length > 0) stretch_question_ids.push(questionsMapped[0].question_id);

  return {
    exam: {
      exam_id: examId,
      title: `${lessonTitle} Official Practice Exam`,
      level: level,
      exam_board_style: 'AQA-Style Diagnostic',
      total_marks: totalMarks,
      time_limit_minutes: Math.max(15, Math.ceil(totalMarks * 1.5)),
      difficulty_profile: 'Balanced Diagnostic',
      instructions: 'Complete all questions in Section A. Read mark schemes carefully, track time limit recommenders, and avoid sloppy answers.',
      sections: [
        {
          section_id: 'sec_1',
          section_title: 'Core Diagnostic Assessments',
          section_instructions: 'Attempt all questions. Apply active analysis techniques.',
          marks_available: totalMarks,
          time_recommendation_minutes: Math.max(15, Math.ceil(totalMarks * 1.5)),
          questions: questionsMapped
        }
      ],
      difficulty_map: {
        accessible_question_ids,
        target_question_ids,
        stretch_question_ids
      }
    }
  };
}

export function generateFallbackRevisionPlan(payload: any): any {
  const exam = payload?.generated_exam?.exam || payload?.generated_exam || {};
  const examTitle = exam?.title || 'Course Assessment';
  const studentAnswers = payload?.student_answers || [];
  const studentName = payload?.student_context?.name || 'Scholar';
  
  // Find all questions in the exam
  const allQuestions: any[] = [];
  if (exam && exam.sections) {
    exam.sections.forEach((sec: any) => {
      if (sec.questions) {
        allQuestions.push(...sec.questions);
      }
    });
  }

  // Grade the user's answers
  const questionMarking = allQuestions.map((q: any) => {
    const studentAnsObj = studentAnswers.find((sa: any) => sa.question_id === q.question_id);
    const answerText = studentAnsObj?.answer || '';
    
    // Heuristic checking
    let marksAwarded = 0;
    let gotRight = '';
    let missingText = '';
    let lossReason = 'Answer needs more technical vocabulary.';

    if (q.type === 'mcq') {
      const correctAns = String(q.HIDDEN_correct_answer || '').trim().toLowerCase();
      const studAns = String(answerText).trim().toLowerCase();
      const isCorrectText = correctAns === studAns || (studAns && correctAns.includes(studAns));
      if (isCorrectText) {
        marksAwarded = q.marks;
        gotRight = 'Selected the precise correct option.';
        lossReason = 'None';
      } else {
        marksAwarded = 0;
        gotRight = 'None';
        missingText = `Expected correct option is: ${q.HIDDEN_correct_answer}`;
        lossReason = 'Incorrect option selected.';
      }
    } else {
      // Free text rating based on length and matches
      const wordCount = answerText.split(/\s+/).filter(Boolean).length;
      if (wordCount >= 20) {
        marksAwarded = q.marks;
        gotRight = 'Identified the main concept and structure.';
        lossReason = 'None';
      } else if (wordCount >= 5) {
        marksAwarded = Math.max(1, Math.floor(q.marks / 2));
        gotRight = 'Some background awareness shown.';
        missingText = 'Lacks precise technical attributes and depth of explanations.';
        lossReason = 'Incomplete response.';
      } else {
        marksAwarded = 0;
        gotRight = 'None';
        missingText = 'Empty or insufficient explanation.';
        lossReason = 'Answer too brief.';
      }
    }

    return {
      question_id: q.question_id,
      marks_awarded: marksAwarded,
      marks_available: q.marks,
      student_answer_summary: answerText || 'No answer submitted.',
      what_they_got_right: gotRight || 'Some partial logic.',
      what_was_missing: missingText || 'None. Fully satisfactory response.',
      the_correct_answer: q.HIDDEN_correct_answer || 'Verified correct choice.',
      mark_loss_reason: lossReason,
      knowledge_gap_type: marksAwarded === q.marks ? 'none' : 'incomplete_explanation',
      topic_tag: q.topic_tag || 'General Concepts'
    };
  });

  const totalMarksAvailable = questionMarking.reduce((sum: number, m: any) => sum + m.marks_available, 0) || 10;
  const totalMarksAwarded = questionMarking.reduce((sum: number, m: any) => sum + m.marks_awarded, 0);
  const percentage = Math.round((totalMarksAwarded / totalMarksAvailable) * 100);

  let grade = 'C';
  let tier = 'borderline';
  
  if (percentage >= 85) {
    grade = 'A*';
    tier = 'distinction';
  } else if (percentage >= 70) {
    grade = 'A';
    tier = 'strong_pass';
  } else if (percentage >= 55) {
    grade = 'B';
    tier = 'borderline';
  } else if (percentage >= 40) {
    grade = 'C';
    tier = 'needs_work';
  } else {
    grade = 'U';
    tier = 'critical';
  }

  const prediction = `With an overall performance of ${percentage}%, you are currently on track for a Grade ${grade}. We recommend focused practice on remediation topics to achieve full confidence.`;

  // Create flashcards from wrong questions
  const flashcards = questionMarking
    .filter((m: any) => m.marks_awarded < m.marks_available)
    .map((m: any, idx: number) => {
      const q = allQuestions.find((qu: any) => qu.question_id === m.question_id) || {};
      return {
        card_id: `fc_remed_${idx}_${Date.now()}`,
        generated_from_question_id: m.question_id,
        card_type: 'remediation',
        front: `Correct answer for: ${q.question_text || 'topic questions'}`,
        back: m.the_correct_answer,
        why_this_card_was_created: `Created automatically to target mark loss on "${q.topic_tag || 'Concept'}"`,
        memory_hook: q.HIDDEN_examiner_tip || 'Keep technical definitions clear.',
        hint: q.HIDDEN_examiner_tip || 'Focus on command keywords.',
        difficulty: 'medium',
        urgency: 'high',
        sm2_initial_ease_factor: 2.5,
        sm2_initial_interval_days: 1
      };
    });

  // Default flashcard if none lost
  if (flashcards.length === 0) {
    flashcards.push({
      card_id: `fc_remed_perfect_${Date.now()}`,
      generated_from_question_id: 'q1',
      card_type: 'achievement',
      front: `Mastery confirmation: ${examTitle}`,
      back: 'Excellent job. Keep reviewing daily concepts to retain the streak!',
      why_this_card_was_created: 'Created to verify 100% mastery.',
      memory_hook: 'Flawless recall status!',
      hint: '',
      difficulty: 'easy',
      urgency: 'low',
      sm2_initial_ease_factor: 3.0,
      sm2_initial_interval_days: 4
    });
  }

  return {
    results: {
      student_name: studentName,
      exam_title: examTitle,
      total_marks_awarded: totalMarksAwarded,
      total_marks_available: totalMarksAvailable,
      percentage: percentage,
      grade: grade,
      grade_prediction: prediction,
      time_analysis: 'Well paced with solid allocation across questions.',
      performance_tier: tier
    },
    question_marking: questionMarking,
    forge_revision_plan: {
      plan_title: `Tailored Study Remediation: ${examTitle}`,
      plan_summary: `Your diagnostic assessment yields a strong scoring of ${percentage}%. We have isolated specific topics to focus on to turn any mistakes into certain marks.`,
      total_estimated_minutes: 30,
      crash_course_flashcard_deck: flashcards,
      topic_remediation_order: [
        {
          priority: 1,
          topic: questionMarking[0]?.topic_tag || 'Core Foundations',
          marks_lost_on_this_topic: totalMarksAvailable - totalMarksAwarded,
          specific_gap: 'Refine precision definitions under exam-board conditions.',
          time_needed_minutes: 15,
          action: 'Practice active recall flashcards.',
          success_indicator: 'Consistent 100% score on revision cards.'
        }
      ],
      ten_minute_emergency_brief: {
        for_student: studentName,
        critical_facts: [
          {
            topic: questionMarking[0]?.topic_tag || 'Key Subject Area',
            the_one_thing: 'Memorize precise keywords rather than generic conversational summaries.',
            exam_phrasing: 'State clearly, describe causal steps link-by-link.',
            trap_to_avoid: 'Be sure not to miss edge cases or confuse terms.'
          }
        ]
      }
    },
    encouragement: {
      honest_summary: `You scored ${percentage}%. A very respectable starting standard with clear areas identified for instant improvement.`,
      biggest_win: `Outstanding performance on ${questionMarking.filter((m: any) => m.marks_awarded === m.marks_available).map((m: any) => m.topic_tag).join(', ') || 'multiple-choice prompts'}!`,
      next_step: 'Add the recommended remediation flashcards to your SRS deck immediately.'
    }
  };
}

export async function generateExamSimulatorAction(
  action: 'generate_exam' | 'forge_revision_plan',
  payload: any
): Promise<any> {
  const schemaForExam = {
    type: Type.OBJECT,
    properties: {
      exam: {
        type: Type.OBJECT,
        properties: {
          exam_id: { type: Type.STRING },
          title: { type: Type.STRING },
          level: { type: Type.STRING },
          exam_board_style: { type: Type.STRING },
          total_marks: { type: Type.NUMBER },
          time_limit_minutes: { type: Type.NUMBER },
          difficulty_profile: { type: Type.STRING },
          instructions: { type: Type.STRING },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                section_id: { type: Type.STRING },
                section_title: { type: Type.STRING },
                section_instructions: { type: Type.STRING },
                marks_available: { type: Type.NUMBER },
                time_recommendation_minutes: { type: Type.NUMBER },
                questions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      question_id: { type: Type.STRING },
                      type: { type: Type.STRING },
                      marks: { type: Type.NUMBER },
                      question_text: { type: Type.STRING },
                      options: { type: Type.ARRAY, items: { type: Type.STRING } },
                      supporting_material: { type: Type.STRING },
                      topic_tag: { type: Type.STRING },
                      targets_weak_area: { type: Type.BOOLEAN },
                      is_trick_question: { type: Type.BOOLEAN },
                      cognitive_demand: { type: Type.STRING },
                      HIDDEN_correct_answer: { type: Type.STRING },
                      HIDDEN_mark_scheme: { type: Type.STRING },
                      HIDDEN_model_answer: { type: Type.STRING },
                      HIDDEN_common_mistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
                      HIDDEN_examiner_tip: { type: Type.STRING }
                    },
                    required: ["question_id", "type", "marks", "question_text", "topic_tag", "cognitive_demand", "HIDDEN_correct_answer", "HIDDEN_mark_scheme", "HIDDEN_model_answer"]
                  }
                }
              },
              required: ["section_id", "section_title", "section_instructions", "questions"]
            }
          },
          difficulty_map: {
            type: Type.OBJECT,
            properties: {
              accessible_question_ids: { type: Type.ARRAY, items: { type: Type.STRING } },
              target_question_ids: { type: Type.ARRAY, items: { type: Type.STRING } },
              stretch_question_ids: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["accessible_question_ids", "target_question_ids", "stretch_question_ids"]
          }
        },
        required: ["exam_id", "title", "level", "exam_board_style", "total_marks", "time_limit_minutes", "instructions", "sections", "difficulty_map"]
      }
    },
    required: ["exam"]
  };

  const schemaForPlan = {
    type: Type.OBJECT,
    properties: {
      results: {
        type: Type.OBJECT,
        properties: {
          student_name: { type: Type.STRING },
          exam_title: { type: Type.STRING },
          total_marks_awarded: { type: Type.NUMBER },
          total_marks_available: { type: Type.NUMBER },
          percentage: { type: Type.NUMBER },
          grade: { type: Type.STRING },
          grade_prediction: { type: Type.STRING },
          time_analysis: { type: Type.STRING },
          performance_tier: { type: Type.STRING }
        },
        required: ["student_name", "exam_title", "total_marks_awarded", "total_marks_available", "percentage", "grade", "grade_prediction", "time_analysis", "performance_tier"]
      },
      question_marking: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question_id: { type: Type.STRING },
            marks_awarded: { type: Type.NUMBER },
            marks_available: { type: Type.NUMBER },
            student_answer_summary: { type: Type.STRING },
            what_they_got_right: { type: Type.STRING },
            what_was_missing: { type: Type.STRING },
            the_correct_answer: { type: Type.STRING },
            mark_loss_reason: { type: Type.STRING },
            knowledge_gap_type: { type: Type.STRING },
            topic_tag: { type: Type.STRING }
          },
          required: ["question_id", "marks_awarded", "marks_available", "student_answer_summary", "what_they_got_right", "what_was_missing", "the_correct_answer", "mark_loss_reason", "knowledge_gap_type", "topic_tag"]
        }
      },
      forge_revision_plan: {
        type: Type.OBJECT,
        properties: {
          plan_title: { type: Type.STRING },
          plan_summary: { type: Type.STRING },
          total_estimated_minutes: { type: Type.NUMBER },
          crash_course_flashcard_deck: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                card_id: { type: Type.STRING },
                generated_from_question_id: { type: Type.STRING },
                card_type: { type: Type.STRING },
                front: { type: Type.STRING },
                back: { type: Type.STRING },
                why_this_card_was_created: { type: Type.STRING },
                memory_hook: { type: Type.STRING },
                hint: { type: Type.STRING },
                difficulty: { type: Type.STRING },
                urgency: { type: Type.STRING },
                sm2_initial_ease_factor: { type: Type.NUMBER },
                sm2_initial_interval_days: { type: Type.NUMBER }
              },
              required: ["card_id", "generated_from_question_id", "card_type", "front", "back", "difficulty", "urgency", "sm2_initial_ease_factor", "sm2_initial_interval_days"]
            }
          },
          topic_remediation_order: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                priority: { type: Type.NUMBER },
                topic: { type: Type.STRING },
                marks_lost_on_this_topic: { type: Type.NUMBER },
                specific_gap: { type: Type.STRING },
                time_needed_minutes: { type: Type.NUMBER },
                action: { type: Type.STRING },
                success_indicator: { type: Type.STRING }
              },
              required: ["priority", "topic", "marks_lost_on_this_topic", "specific_gap", "time_needed_minutes", "action", "success_indicator"]
            }
          },
          ten_minute_emergency_brief: {
            type: Type.OBJECT,
            properties: {
              for_student: { type: Type.STRING },
              critical_facts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    topic: { type: Type.STRING },
                    the_one_thing: { type: Type.STRING },
                    exam_phrasing: { type: Type.STRING },
                    trap_to_avoid: { type: Type.STRING }
                  },
                  required: ["topic", "the_one_thing", "exam_phrasing", "trap_to_avoid"]
                }
              }
            },
            required: ["for_student", "critical_facts"]
          }
        },
        required: ["plan_title", "plan_summary", "total_estimated_minutes", "crash_course_flashcard_deck", "topic_remediation_order", "ten_minute_emergency_brief"]
      },
      encouragement: {
        type: Type.OBJECT,
        properties: {
          honest_summary: { type: Type.STRING },
          biggest_win: { type: Type.STRING },
          next_step: { type: Type.STRING }
        },
        required: ["honest_summary", "next_step"]
      }
    },
    required: ["results", "question_marking", "forge_revision_plan", "encouragement"]
  };

  const systemInstructions = action === 'generate_exam'
    ? `Forge Exam Creator. You MUST compile a set of EXACTLY 10 questions in total.
6 of these questions MUST have type "mcq" (multiple choice) and contain exactly 4 options in the 'options' property.
4 of these questions MUST be free response (type "short_answer" or "long_answer", etc.).
DO NOT create more or fewer than exactly 10 questions in total.
Ensure questions are NEVER repeated.
Make incorrect options sound similar to make guessing difficult.
CRITICAL FORMATTING INSTRUCTIONS FOR ALL QUESTIONS AND PROGRAMMING EXAMPLES:
- For every coding code-snippet, programming reference, or syntax challenge included inside question_text, options, correctness explainers, or model answers, YOU MUST use beautifully formatted Markdown syntax highlighter blocks (e.g. using \`\`\`python\\n...\\n\`\`\` code fences).
- Do NOT output loose syntax - always wrap any code lines in code blocks so it renders with pristine monospace themes.`
    : `Forge Course Evaluator. Correctly grade the student responses and produce a custom remediation plan.
CRITICAL GRADE PREDICTION REQUIREMENT:
- The 'results.grade_prediction' string attribute MUST contain the dynamically computed actual percentage value of the student (e.g., 'Based on your overall scoring of 73%, you are on track for a Grade A...') instead of arbitrary status levels or random numbers. Always clearly state the calculated correct percentage inside the grade prediction block so the student can verify their precise performance metrics.
CRITICAL FORMATTING INSTRUCTIONS FOR ALL REMEDIATION:
- Any software code examples or syntax corrections returned inside the revision briefs or flashcards MUST be wrapped inside structured Markdown code fences (e.g. \`\`\`python\\n...\\n\`\`\`).
- FOR STUDY GUIDES: You MUST structure the response like a HTML document that goes into every topic section by section, uses simple conversational terms, and provides clear examples.`;

  try {
    const result = await ApiManager.generateContent({
      type: 'exam_simulator',
      content: `Simulator Action: ${action}. Payload: ${JSON.stringify(payload)}`,
      systemPrompt: systemInstructions,
      responseSchema: action === 'generate_exam' ? schemaForExam : schemaForPlan,
    });

    // Guard rails and self-healing structures to guarantee the rigid 15 limit & percentage prediction:
    if (action === 'generate_exam') {
      if (result && result.exam && Array.isArray(result.exam.sections) && result.exam.sections.length > 0) {
        // Double check questions property
        const qs = result.exam.sections[0].questions || [];
        const mcqs = qs.filter((q: any) => q.type === 'mcq');
        const frs = qs.filter((q: any) => q.type !== 'mcq');
        
        // If length is wrong, self-heal or backoff elegantly
        if (qs.length !== 10 || mcqs.length !== 6 || frs.length !== 4) {
          console.warn(`[Exam Simulator] Live result returned ${qs.length} questions (${mcqs.length} MCQ / ${frs.length} FR), which deviates from the strict 10 limit. Triggering healing compiler...`);
          return generateFallbackExam(payload?.audit_data);
        }

        if (!result.exam.difficulty_map) {
          result.exam.difficulty_map = {
            accessible_question_ids: mcqs.slice(0, 5).map((q: any) => q.question_id),
            target_question_ids: mcqs.slice(5, 10).map((q: any) => q.question_id),
            stretch_question_ids: frs.map((q: any) => q.question_id)
          };
        }
        return result;
      } else {
        console.warn("[Exam Simulator] Live result failed structural validation. Invoking automated self-healing exam builder.");
        return generateFallbackExam(payload?.audit_data);
      }
    } else {
      if (result && result.results && result.forge_revision_plan) {
        // Self-heal: Ensure results.grade_prediction describes the exact user percentage
        const actualPercentage = result.results.percentage || Math.round((result.results.total_marks_awarded / (result.results.total_marks_available || 10)) * 100);
        result.results.percentage = actualPercentage;
        if (!result.results.grade_prediction.includes('%')) {
          result.results.grade_prediction = `With an overall scoring of ${actualPercentage}%, you are currently on track for a Grade ${result.results.grade || 'B'}. Keep practicing target metrics!`;
        }
        return result;
      } else {
        console.warn("[Exam Simulator] Live result failed structural validation. Invoking automated self-healing revision plan builder.");
        return generateFallbackRevisionPlan(payload);
      }
    }
  } catch (err) {
    console.error("[Exam Simulator] Live generation error detected. Running offline diagnostic protocols:", err);
    if (action === 'generate_exam') {
      return generateFallbackExam(payload?.audit_data);
    } else {
      return generateFallbackRevisionPlan(payload);
    }
  }
}

export async function generateFlashcardsFromText(text: string, title: string): Promise<Deck> {
  const { deck } = await generateStudyMaterial(text, title, '', 20, 'medium', 'flashcards');
  return deck;
}

export async function enrichDeckWithImages(deck: Deck): Promise<Deck> {
  return deck;
}

export async function generateQuizFromText(text: string, title: string): Promise<Quiz> {
  const { quiz } = await generateStudyMaterial(text, title, '', 10, 'medium', 'quiz');
  return quiz;
}

export async function generateAdaptiveDeck(missedCards: Flashcard[], topic: string): Promise<Flashcard[]> {
  const data = await ApiManager.generateContent({
    type: 'flashcards',
    content: `Missed concepts: ${JSON.stringify(missedCards)}`,
    subject: topic,
    systemPrompt: "Generate 5 reinforcement cards for missed concepts. Output JSON.",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        reinforcement_cards: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING },
              back: { type: Type.STRING },
              explanation: { type: Type.STRING }
            }
          }
        }
      }
    }
  });

  return (data.reinforcement_cards || []).map((f: any) => ({
    id: generateId(),
    term: f.front,
    definition: f.back,
    explanation: f.explanation || "",
    interval: 0,
    ease: 2.5,
    nextReviewDate: Date.now(),
  }));
}

export async function generateExam(text: string, title: string, timeLimit: number = 20): Promise<Quiz> {
  const data = await ApiManager.generateContent({
    type: 'quiz',
    content: text,
    subject: title,
    systemPrompt: "Generate a formal academic exam paper based on content. Output JSON.",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        exam_questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              type: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              answer: { type: Type.STRING },
              explanation: { type: Type.STRING },
              marks: { type: Type.NUMBER }
            },
            required: ["question", "type", "answer", "explanation", "marks"]
          }
        }
      },
      required: ["exam_questions"]
    }
  });

  return {
    id: generateId(),
    title: `${title} - Formal Exam`,
    questions: (data.exam_questions || []).map((q: any) => ({
      id: generateId(),
      question: q.question,
      type: q.type as any,
      options: q.options || [],
      correctAnswer: (() => {
        if (q.type !== 'mcq') return undefined;
        const ans = q.answer;
        if (typeof ans === 'number') return ans;
        const parsed = parseInt(String(ans));
        if (!isNaN(parsed) && parsed >= 0) return parsed;
        // AI returned a letter like "A", "B", "C", "D" or option text
        const letterMap: Record<string, number> = { 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
        const key = String(ans).toLowerCase().trim();
        if (letterMap[key] !== undefined) return letterMap[key];
        
        // Maybe option text match
        const opts: string[] = q.options || [];
        const idx = opts.findIndex((o: string) => o.toLowerCase().trim() === key || o.toLowerCase().includes(key));
        return idx !== -1 ? idx : 0;
      })(),
      correctAnswerText: q.type !== 'mcq' ? q.answer : undefined,
      explanation: q.explanation,
      marks: q.marks
    })),
    isExam: true,
    timeLimit,
    isAIGraded: true
  };
}

function getOfflineRewardContent(
  purchase: EmberPurchaseData, 
  student: EmberStudentData, 
  activeSkin: string = 'Default'
): EmberRewardResponse {
  const { item_id, ember_cost } = purchase;
  const newBalance = student.current_embers - ember_cost;
  
  const itemDescriptions: Record<string, { name: string; type: string; desc: string; action: string }> = {
    theme_void_cartographer: {
      name: "Void Cartographer",
      type: "Cosmetic Theme",
      desc: "An ambient star-mapping interface crafted with vintage brass controls, deep midnight blue palettes, and quill-scratching acoustics. Focus among the star systems.",
      action: "Set as Active Theme"
    },
    theme_deep_forge: {
      name: "Inner Fire (Deep Forge)",
      type: "Cosmetic Theme",
      desc: "A blistering dark-orange smithy workspace. Hear the distant clang of hydraulic mallets and let the heat of molten steel steel your concentration.",
      action: "Set as Active Theme"
    },
    theme_signal_lost: {
      name: "Radio Mystery (Signal Lost)",
      type: "Cosmetic Theme",
      desc: "A completely isolated study bunker with warm vacuum tubes, ticking tape decks, and the soothing static of background cosmic radiation. Unplug from the world.",
      action: "Set as Active Theme"
    },
    theme_the_library_at_the_end: {
      name: "Grand Archive",
      type: "Cosmetic Theme",
      desc: "A sprawling mahogany sanctuary where cedar scent and ancient manuscripts meet grandfather clocks. Deep quietness for perfect transcribing.",
      action: "Set as Active Theme"
    },
    theme_eigenstate: {
      name: "Perfect Focus (Eigenstate)",
      type: "Cosmetic Theme",
      desc: "An absolute zero, monochromatic cobalt quantum state. Pure superconducting silence to prevent any wave-decoherence. Let your probability waves collapse on mastery.",
      action: "Set as Active Theme"
    },
    theme_bone_circuit: {
      name: "Brain Link (Bone Circuit)",
      type: "Cosmetic Theme",
      desc: "A high-density cybernetic link showing neon green schemas mapped onto neural structures. Trace synaptic nodes with zero latency.",
      action: "Set as Active Theme"
    },
    theme_abyssal_current: {
      name: "Deep Ocean (Abyssal Current)",
      type: "Cosmetic Theme",
      desc: "A deep sea diving bell locked thousands of meters beneath the surface. Peer into the dark bioluminescence and handle extreme intellectual pressures safely.",
      action: "Set as Active Theme"
    },
    theme_nebula_pulse: {
      name: "Star Field (Nebula Pulse)",
      type: "Cosmetic Theme",
      desc: "A cosmic terminal drifting amongst pale purple dust clouds and slow-weaving planetary rings. Absolute interstellar peace for deep thought.",
      action: "Set as Active Theme"
    },
    assist_skin_pyra_academic: {
      name: "Pyra: Academic Scholar",
      type: "Assistant Shell",
      desc: "Upgrade Pyra's core dialog schemas to a high-density, rigorously detailed Oxford Academic persona. Perfect for strict exam focus.",
      action: "Equip Assistant Shell"
    },
    assist_skin_pyra_mentor: {
      name: "Pyra: Socratic Mentor",
      type: "Assistant Shell",
      desc: "Enable the Socratic inquiry algorithms. Pyra will guide your comprehension by asking deep, conceptual questions rather than giving simple answers.",
      action: "Equip Assistant Shell"
    },
    assist_skin_pyra_cyber: {
      name: "Pyra: Cyber-Guide Node",
      type: "Assistant Shell",
      desc: "Initialize a high-frequency, telemetry-focused robotic guide that talks in precise technical terms and cybernetic data protocols.",
      action: "Equip Assistant Shell"
    },
    assist_skin_pyra_calm: {
      name: "Pyra: Zen Monk",
      type: "Assistant Shell",
      desc: "Upgrade Pyra to a calming, slow-tempo mindfulness companion that centers on deep breathing, focus breaks, and anti-burnout pacing.",
      action: "Equip Assistant Shell"
    }
  };

  const matched = itemDescriptions[item_id] || {
    name: "Premium Unlock",
    type: "Educational Artifact",
    desc: `You have successfully unlocked the premium artifact (${item_id}). It has been deposited into your Study Vault and is fully optimized for your academic journey.`,
    action: "Access Artifact"
  };

  return {
    reward_delivered: { 
      item_id, 
      item_name: matched.name, 
      ember_cost, 
      new_balance: newBalance, 
      delivery_message: `Your transaction has been authorized. Transmitting ${matched.name} into your local repository.` 
    },
    reward_content: { 
      type: matched.type, 
      content: matched.desc, 
      follow_up_action: matched.action 
    }
  };
}

export async function generateRewardContent(
  purchase: EmberPurchaseData, 
  student: EmberStudentData, 
  activeSkin: string = 'Default'
): Promise<EmberRewardResponse> {
  // Save crucial API quota: shop rewards are static catalog items and can be resolved instantly offline
  // This avoids wasting API quota on simple transactional unlocks.
  return getOfflineRewardContent(purchase, student, activeSkin);
}

function getDynamicOfflineAtmosphere(req: AtmosphereRequest): AtmosphereResponse {
  const { active_theme, student_name, subject_context, trigger } = req;
  const subj = subject_context || 'your academic pursuits';
  const name = student_name || 'Scholar';
  
  const themesData: Record<string, {
    greetings: string[];
    ambients: string[];
    forgecast: string[];
    milestones: string[];
    ends: string[];
  }> = {
    void_cartographer: {
      greetings: [
        `The void expanse unfurls, ${name}. Chart your course through the intricacies of ${subj}.`,
        `Welcome to the cartography deck, ${name}. Aligning ink wells and compasses for ${subj}.`,
        `Coordinates locked on ${subj}. Prepare your ledger, Cartographer ${name}.`
      ],
      ambients: [
        "Faint scratching of a brass quill on heavy vellum parchment. A quiet pendulum swings.",
        "Dust motes dancing in gold candle beams. Cool air draft carrying scent of salt-water leather.",
        "Quiet static echoes from deep space antennas mapping faraway coordinate clusters."
      ],
      forgecast: [
        `Cartographic beacon stabilized on ${subj}. Mapping resolution optimal.`,
        "Topographical scan stream of data feeds flowing smoothly. Ink layers dry.",
        "Ink scratching and star coordinates fully aligned. Broadcast clean."
      ],
      milestones: [
        `Outstanding! A new conceptual boundary of ${subj} has been successfully charted, ${name}.`,
        `Milestone reached! Another unexplored island of knowledge in ${subj} has been claimed.`,
        `Pristine coordinates logged. You have mapped a critical junction in this domain.`
      ],
      ends: [
        `Roll up the scrolls, ${name}. Today's star charts for ${subj} are safely preserved in the archives.`,
        "Closing the cartography ledger. Blow out the candles. Rest well, Cartographer.",
        "Expedition successfully concluded. Grid systems shutting down. Stand by."
      ]
    },
    deep_forge: {
      greetings: [
        `The furnace is stoked, ${name}. Let the intense pressure mold your understanding of ${subj}.`,
        `Into the molten depths, ${name}. Feed the flames of curiosity with the structures of ${subj}.`,
        `Heat levels optimal, ${name}. Ready to forge raw intellectual matter into tempered knowledge of ${subj}.`
      ],
      ambients: [
        "Quiet rhythmic rumble of heavy hydraulic steel pistons. Intense heat radiates from deep orange cracks.",
        "Molten orange steel pouring into sand molds. Sizzling steam rises from cooling troughs.",
        "Distant steady beat of heavy iron mallets beating carbon steel to crystalline purity."
      ],
      forgecast: [
        `Forge furnace at optimal combustion. Crystalline alignment for ${subj} verified.`,
        "Blast pressure holding steady. Mental impurities being boiled away.",
        "Molecular binding active. Fusing complex cognitive nodes into hardened structures."
      ],
      milestones: [
        `Excellent strike, ${name}! Your focused concentration has tempered another steel ingot in ${subj}!`,
        `Tempered under immense pressure! A foundational concept of ${subj} has been forged successfully.`,
        "Superb heat treatment! Your understanding of this topic is now structurally unbreakable."
      ],
      ends: [
        `Allow the furnace to rest, ${name}. The tools are cold, and your newly forged shield of ${subj} is complete.`,
        "Let the metal cool. Powering down the hydraulic blowers. Magnificent smelting session, Scholar.",
        "Forge fires returning to smoldering embers. The steel has been tempered. Stand down."
      ]
    },
    signal_lost: {
      greetings: [
        `Faint sub-frequency broadcasting online, ${name}. Isolating the signal for ${subj}.`,
        `Static hums in the earphones, ${name}. Let's tune the frequency knob into ${subj}.`,
        `Welcome back to the underground transmission booth, ${name}. Broadcast stream clear for ${subj}.`
      ],
      ambients: [
        "Soft background hiss of magnetic audio tape rolling. The green oscilloscope wave pulses.",
        "Warm orange glow of retro vacuum tube amplifiers. Gentle rain tapping on concrete outside.",
        "Distant sea-wave white noise mixed with vintage analog oscillator drift."
      ],
      forgecast: [
        `Analog receiver locked on the central transmission of ${subj}. Gain levels normalized.`,
        "Telemetry bandwidth stable. Low interference detected across all sectors.",
        "Solenoid click. Vintage tape deck spinning smoothly. Signal strength high."
      ],
      milestones: [
        `Signal lock acquired, ${name}! You've decoded an elusive conceptual transmission of ${subj}!`,
        `Data packet received and error-corrected. Faint whispers have turned into clear knowledge.`,
        "Scope peak detected! You successfully mapped the main resonance peak of this module."
      ],
      ends: [
        `Powering down the transmitter, ${name}. The broadcast reels for ${subj} are saved. Goodnight.`,
        "Switching off the broadcast channel. Vacuum tubes cooling in the dark. Silence returns.",
        "Tape fully wound. Analog circuits returned to standby. Rest your ears, Scholar."
      ]
    },
    the_library_at_the_end: {
      greetings: [
        `Welcome back to the silent corridors, ${name}. Let us open the heavy volumes of ${subj}.`,
        `The Grand Archive welcomes you, ${name}. Deep silence reigns. Ready to index ${subj}.`,
        `Scent of ancient cedar and paper awaits, ${name}. Let us transcribe ${subj}.`
      ],
      ambients: [
        "Distant ticking of a giant grandfather clock. Gentle rustling of fragile, hundred-year-old pages.",
        "Warm mahogany tables reflecting soft green banker lamp glows. The smell of old leather and wax.",
        "Deep, cathedral-like quietness. Soft rain whispering against high stained glass windows."
      ],
      forgecast: [
        `Catalog systems fully loaded. Transcribing key theorems of ${subj} in real-time.`,
        "Ink flow smooth. The scribe console registers perfect focus levels.",
        "Silent corridor acoustics mapped. Cognitive absorbing rate at maximum."
      ],
      milestones: [
        `Superb transcript, ${name}! You have mastered and shelved a complex volume of ${subj}!`,
        `Knowledge indexed! A delicate manuscript in ${subj} has been meticulously cataloged.`,
        "A magnificent addition to the Grand Archive. The ink of your comprehension is indelible."
      ],
      ends: [
        `Close the heavy registry, ${name}. Put away the spectacles. Your study of ${subj} is complete.`,
        "Extinguish the reading lamps. The grand oak doors are closing. Elegant work tonight.",
        "The archive is secured. The clock continues to tick in the dark. Rest your eyes, Scholar."
      ]
    },
    eigenstate: {
      greetings: [
        `System state initialized, ${name}. Commencing focus wave collapse on ${subj}.`,
        `Quantum resonance tuned, ${name}. Aligning eigenvalues for ${subj}.`,
        `Coherence levels verified, ${name}. Stand by to resolve the eigenstates of ${subj}.`
      ],
      ambients: [
        "Absolute mathematical silence. Gridlines of deep cobalt-blue light pulsing at perfect intervals.",
        "Faint digital humming of superconducting magnets. Superfluid helium cooling system running.",
        "Clean, monochromatic laser line projecting key numerical formulas into the dark."
      ],
      forgecast: [
        `Quantum coherence state at 99.99%. focus wave collapse on ${subj} is stable.`,
        "Vector space transformation active. Projection operators locked on target nodes.",
        "Decoherence risk eliminated. System state holds perfect quantum isolation."
      ],
      milestones: [
        `State resolved, ${name}! You have forced a massive probability wave collapse in ${subj}!`,
        `Quantized transition complete! Your mental state has jumped to a higher energy eigenvalue.`,
        "Perfect probability. You've locked in the exact resonance frequency of this topic."
      ],
      ends: [
        `State vector safely written to NVRAM, ${name}. Shutting down cryogenic loops for ${subj}.`,
        "Probability waves returning to uniform superposition. Coherence session terminated. Rest now.",
        "Focus loop completed. System registers cleared. Quantum core cooled to absolute zero."
      ]
    },
    bone_circuit: {
      greetings: [
        `Synaptic link established, ${name}. Initializing high-speed transmission of ${subj}.`,
        `Welcome to the nerve center, ${name}. Injecting key concepts of ${subj} directly into memory banks.`,
        `Interface initialized, Node ${name}. Ready to bridge biological and digital nodes for ${subj}.`
      ],
      ambients: [
        "Phosphor-green terminals tracing bioluminescent neural paths. Rhythmic electric hum.",
        "Faint cooling fan noise from neural deck. Bioluminescent nodes sparking inside liquid containers.",
        "Subtle electric crackle. Visual cortex synchronized with digital schema displays."
      ],
      forgecast: [
        `Brainwave-to-terminal interface running at zero-latency. Memory synthesis on ${subj} is live.`,
        "Data buffer fully synchronized. Neural sheath temperatures steady.",
        "Axon pathway tracing active. Cognitive schemas displaying maximum absorption rate."
      ],
      milestones: [
        `Synaptic bridge fused, ${name}! A permanent node in ${subj} has been written to the biological layer!`,
        `Pathway consolidated! Dendritic spines updated with high-density data on this topic.`,
        "Pristine memory rewrite. Your biological network has integrated this module flawlessly."
      ],
      ends: [
        `Safe disconnection complete, Node ${name}. Brainwave frequency returning to rest state. ${subj} saved.`,
        "Shutting down biological sync. Unplugging interface cables. Rest your mind, Node.",
        "Transmission buffer flushed. Synaptic growth factor active. homeostasis restored."
      ]
    },
    abyssal_current: {
      greetings: [
        `Submersible hull pressurized, ${name}. Diving deep into the dark trenches of ${subj}.`,
        `Welcome to the abyssal deck, ${name}. The pressure is immense, let us discover ${subj}.`,
        `Descent sequence initiated, ${name}. Sonar pinging the deep structures of ${subj}.`
      ],
      ambients: [
        "Quiet mechanical pulse of heavy diving-bell oxygen valves. Outer dark ocean silence.",
        "Soft amber gauges glowing on the brass hull dashboard. Pale blue bioluminescent jellyfish outside.",
        "Rhythmic click of low-frequency sonar scanning the vast underwater canyons below."
      ],
      forgecast: [
        `Submersible depth: 6,000 meters. Core structural pressure for ${subj} holding stable.`,
        "Water density measurements constant. Telemetry downlinks flowing clearly.",
        "Bioluminescent illumination active. Mapping hidden hydrothermal conceptual vents."
      ],
      milestones: [
        `Ascended past the trench, ${name}! You have mapped a critical deep thermal vent of ${subj}!`,
        `Deep core specimen retrieved! A rare and profound fundamental concept has been successfully secured.`,
        "Magnificent diving! You have braved extreme mental pressures to secure this understanding."
      ],
      ends: [
        `Diving bell docked safely, ${name}. Depressurization complete. Today's depth charts of ${subj} look pristine.`,
        "Anchoring submersible. Turning off the external searchlights. Magnificent dive today, Scholar.",
        "Ascending to shallow waters. Core systems turning off. Rest your focus, Diver."
      ]
    },
    nebula_pulse: {
      greetings: [
        `Cosmic ignition active, ${name}. Orbiting the brilliant dust clouds of ${subj}.`,
        `Welcome back to the astrometer terminal, ${name}. Aligning stellar focus on ${subj}.`,
        `Warp drive initialized, ${name}. Commencing navigation of the star field of ${subj}.`
      ],
      ambients: [
        "Deep interstellar silence. Soft pulsating purple and violet plasma fields outside.",
        "Quiet clicking of an electromagnetic star tracker. Soft hum of cosmic microwave background.",
        "Slow rotating views of pale nebula dust clouds swirling with absolute cosmic serenity."
      ],
      forgecast: [
        `Stellar antenna aligned to deep-space beacons for ${subj}. Cosmic drift minimized.`,
        "Nebula ionization levels within normal parameters. Spacecraft telemetry clear.",
        "Magnetic stabilization active. Star maps for this module generated perfectly."
      ],
      milestones: [
        `Orbit stabilized, ${name}! You have mapped a brilliant newborn star cluster of ${subj}!`,
        `Cosmic anomaly decoded! You resolved a highly complex celestial mechanism in this topic.`,
        "Star catalog updated! You've documented a radiant focal node in the cosmos."
      ],
      ends: [
        `Thrusters offline, ${name}. Drifting peacefully in a stable orbit. Today's cosmic log for ${subj} is complete.`,
        "Turning off telescope mirrors. Cosmic star field fading to dim night. Magnificent voyage, Astronomer.",
        "Ignition key disengaged. Drifting safely among beautiful nebula fields. Rest well."
      ]
    },
    default: {
      greetings: [
        `The system is prepared, ${name}. Let us forge your core understanding of ${subj}.`,
        `Welcome to the study deck, ${name}. Systems ready to analyze and map ${subj}.`,
        `Focus sequence initiated, ${name}. Let's master the details of ${subj}.`
      ],
      ambients: [
        "Soft analog rustle of electronic components. Warm amber glass vacuum tubes warming up.",
        "Very quiet ticking of a small focus timer. Fresh cedar wood pencil smell.",
        "Subtle rhythmic soft keys tapping in a completely silent, distraction-free environment."
      ],
      forgecast: [
        `Core systems aligned perfectly on ${subj}. Academic density calculations verified.`,
        "Telemetry bandwidth running at maximum capacity. Low friction study mode.",
        "Schema layers compiled. Ready to stream active learning data segments."
      ],
      milestones: [
        `Stellar progress, ${name}! You have successfully cataloged a critical conceptual pillar of ${subj}!`,
        `Milestone reached! You've established a secure understanding of this complex topic.`,
        "Superb breakthrough! The conceptual pathways of this chapter are now fully understood."
      ],
      ends: [
        `Study session completed, ${name}. Your academic progress log for ${subj} is fully preserved.`,
        "Focus session ended. Systems winding down to low power standby. Fantastic work today.",
        "Closing the lesson planner. Focus timer ringing. Take a well-deserved rest, Scholar."
      ]
    }
  };

  const currentThemeData = themesData[active_theme] || themesData.default;
  const rand = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
  
  return {
    theme_id: active_theme,
    session_greeting: rand(currentThemeData.greetings),
    ambient_descriptor: rand(currentThemeData.ambients),
    forgecast_atmosphere_line: rand(currentThemeData.forgecast),
    milestone_message: rand(currentThemeData.milestones),
    session_end_message: rand(currentThemeData.ends)
  };
}

function getStaticAtmosphereFallback(themeId: string): AtmosphereResponse {
  return getDynamicOfflineAtmosphere({
    active_theme: themeId,
    trigger: 'session_start',
    student_name: 'Scholar',
  });
}

export async function generateAtmosphere(req: AtmosphereRequest): Promise<AtmosphereResponse> {
  // Save crucial API quota: atmosphere greetings are decorative and can be compiled beautifully offline
  // This fully prevents quick quota drain of the Gemini API.
  return getDynamicOfflineAtmosphere(req);
}

export interface StudyGuideSection {
  title: string;
  content: string;
  examples: string[];
  examPatterns: string[];
}

export interface DetailedStudyGuide {
  title: string;
  subject: string;
  level: string;
  markdown: string;
  sections: StudyGuideSection[];
  htmlContent: string;
}

function generateHTMLFromSections(guide: DetailedStudyGuide): string {
  const sections = guide.sections || [];
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${guide.title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
    <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
    <style>
        :root {
            --bg: #070710;
            --surface: #0e0e1c;
            --card: #13132a;
            --border: #1e1e3a;
            --cyan: #38bdf8;
            --emerald: #34d399;
            --amber: #fbbf24;
            --text: #e2e8f4;
        }
        body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); }
        .glass { background: var(--card); border: 1px solid var(--border); }
        .sidebar { position: sticky; top: 1rem; }
        .ans-toggle { display: none; }
    </style>
</head>
<body class="flex min-h-screen">
    <div id="pbar-container" class="fixed top-0 left-0 w-full h-1 bg-slate-800 z-50">
        <div id="pbar" class="h-full bg-cyan-400" style="width: 0%"></div>
    </div>
    
    <aside class="w-64 border-r border-slate-800 p-6 hidden md:block">
        <h2 class="font-bold text-lg mb-6 text-white">Index Map</h2>
        <nav class="space-y-2">
            ${sections.map((s, i) => `<a href="#s${i}" class="block text-sm text-slate-400 hover:text-cyan-400">${s.title}</a>`).join('')}
        </nav>
    </aside>

    <main class="flex-1 p-8 md:p-12">
        <h1 class="text-4xl font-extrabold mb-12 text-white">${guide.title}</h1>
        
        ${sections.map((s, i) => `
            <section id="s${i}" class="topic glass p-8 rounded-2xl mb-12" data-section="${i}">
                <h2 class="text-2xl font-bold text-cyan-400 mb-6">${s.title}</h2>
                <div class="space-y-6">
                    <p class="leading-relaxed">${s.content}</p>
                    <div class="p-6 bg-slate-950 rounded-xl border border-slate-700">
                        <h4 class="font-bold text-emerald-400 mb-3">Core Examples:</h4>
                        <ul class="list-disc pl-5 space-y-2">${s.examples.map(ex => `<li>${ex}</li>`).join('')}</ul>
                    </div>
                    <div class="p-6 bg-slate-950 rounded-xl border border-slate-700">
                        <h4 class="font-bold text-amber-400 mb-3">Exam Patterns:</h4>
                        <ul class="list-disc pl-5 space-y-2">${s.examPatterns.map(ep => `<li>${ep}</li>`).join('')}</ul>
                    </div>
                </div>
                
                <div class="mt-8">
                    <button onclick="toggleAnswer(this)" class="px-4 py-2 bg-emerald-600 text-white rounded font-medium text-sm">Reveal Answer</button>
                    <div class="ans-toggle mt-4 p-4 bg-emerald-950 border-l-4 border-emerald-500 text-emerald-100 rounded">
                        Detailed answer/verification for ${s.title}...
                    </div>
                </div>
            </section>
        `).join('')}
    </main>

    <script>
        function toggleAnswer(btn) {
            const ans = btn.nextElementSibling;
            const isHidden = ans.style.display === 'none' || ans.style.display === '';
            ans.style.display = isHidden ? 'block' : 'none';
            btn.textContent = isHidden ? 'Hide Answer' : 'Reveal Answer';
        }
        
        window.addEventListener('scroll', () => {
            const topics = document.querySelectorAll('.topic');
            let total = topics.length;
            let seen = 0;
            topics.forEach(t => {
                const rect = t.getBoundingClientRect();
                if (rect.top < window.innerHeight / 2) seen++;
            });
            const pct = (seen / total) * 100;
            document.getElementById('pbar').style.width = pct + '%';
        });
    </script>
</body>
</html>`;
}

export async function generateStudyGuide(text: string, titleHint: string = "Study Document"): Promise<DetailedStudyGuide> {
  const cleanInput = text ? text.slice(0, 15000) : "General Topics";
  
  const systemPrompt = `You are a world-class academic content compiler and senior lecturer, similar to Claude or NotebookLM.
Your goal is to parse the input notes or text and compile an EXTREMELY IN-DEPTH, highly professional, subject-specific Study Guide.
You MUST output high-fidelity content, COMPLETELY AVOIDING generic placeholders.

You must return a JSON response containing:
- title: A precise academic title
- subject: Detected academic subject field
- level: Detected difficulty level
- markdown: A highly comprehensive, analytical, and exhaustive study guide in Markdown.
- sections: An array of objects, one for each major topic, containing:
  - title: The topic title
  - content: Detailed explanations of the topic
  - examples: An array of concrete examples
  - examPatterns: An array of typical exam question patterns for this topic
`;

  try {
    const result = await ApiManager.generateContent({
      type: 'study_guide',
      content: `Create an in-depth Study Guide from this material. Document Hint: ${titleHint}\n\nMaterial:\n${cleanInput}`,
      systemPrompt: systemPrompt,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          subject: { type: Type.STRING },
          level: { type: Type.STRING },
          markdown: { type: Type.STRING },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                examples: { type: Type.ARRAY, items: { type: Type.STRING } },
                examPatterns: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["title", "content", "examples", "examPatterns"]
            }
          }
        },
        required: ["title", "subject", "level", "markdown", "sections"]
      }
    });

    if (result && result.markdown && result.sections) {
      const guide: DetailedStudyGuide = {
        title: result.title,
        subject: result.subject,
        level: result.level,
        markdown: result.markdown,
        sections: result.sections,
        htmlContent: ''
      };
      guide.htmlContent = generateHTMLFromSections(guide);
      return guide;
    }
    throw new Error("Result failed integrity validation");
  } catch (err) {
    console.error("[Study Guide Generator] AI failed, launching dynamic local compiler...", err);
    
    // Determine subject based on titleHint or keywords
    const lowerHint = titleHint.toLowerCase();
    const lowerInput = cleanInput.toLowerCase();
    const isCompSci = lowerHint.includes("computer") || lowerHint.includes("code") || lowerHint.includes("algorithm") || lowerHint.includes("class") || lowerHint.includes("object") || lowerHint.includes("coding") || lowerInput.includes("def __init__") || lowerInput.includes("class student") || lowerInput.includes("oop");
    const subject = lowerHint.includes("chem") || lowerHint.includes("acid") ? "Chemistry" 
                  : lowerHint.includes("histor") || lowerHint.includes("war") || lowerHint.includes("revolution") ? "History" 
                  : lowerHint.includes("french") || lowerHint.includes("vocab") || lowerHint.includes("verb") ? "French" 
                  : isCompSci ? "Computer Science"
                  : "General Studies";
                  
    const level = "Advanced Level Blueprint";
    const guideTitle = `${titleHint} - Comprehensive Study Booklet`;

    // Extract real phrases/lines from user input to make it highly relevant
    const rawLines = cleanInput.split('\n')
      .map(l => l.trim())
      .filter(l => {
        if (l.length <= 15 || l.startsWith('#') || l.startsWith('-')) return false;
        // Ignore PDF syntax/binary traces
        if (l.includes('/OpenAction') || l.includes('/Producer') || l.includes('/Kids') || l.includes('/JS') || l.includes('/ProcSet') || l.includes('/PDF') || l.includes('/Text') || l.includes('Obj') || l.includes('R') && /\d+\s+\d+\s+R/.test(l)) return false;
        if (l.includes('<<') || l.includes('>>') || l.includes('stream') || l.includes('endstream') || l.includes('endobj')) return false;
        return true;
      });
    
    // Generate complete study guide structure for fallback
    const conceptsDetected = rawLines.slice(0, 4);
    if (conceptsDetected.length < 2) {
      conceptsDetected.push("Core Definitions and Concepts", "Practical Applications and Analysis");
    }
    const sections: StudyGuideSection[] = conceptsDetected.map(cnc => ({
      title: cnc,
      content: `Detailed explanation regarding ${cnc}. This forms a core part of our ${subject} syllabus. Understanding this is crucial for examination success.`,
      examples: [`Application and theory of ${cnc}.`, `Relevant real-world scenarios for ${cnc}.`],
      examPatterns: [`Common examination patterns for ${cnc}.`]
    }));

    const markdown = `# ${guideTitle}`;
    const guide: DetailedStudyGuide = {
      title: guideTitle,
      subject: subject,
      level: level,
      markdown: markdown,
      sections: sections,
      htmlContent: ''
    };
    guide.htmlContent = generateHTMLFromSections(guide);
    return guide;
  }
}
