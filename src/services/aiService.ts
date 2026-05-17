import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { get, set } from 'idb-keyval';
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
import { hashString } from "../lib/apiUtils";
import { auth } from "../lib/firebase";
import { checkAndIncrementUsage } from "./usageService";

let aiInstance: GoogleGenAI | null = null;

const DEFAULT_MODEL = "gemini-3-flash-preview";

/**
 * Lazy-initializes and returns the GoogleGenAI instance.
 */
function getAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("AI_SETUP_REQUIRED: Missing API Key.");
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

/**
 * Robust JSON repair for truncated or malformed AI responses
 */
function repairJSON(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (initialError) {
    console.warn("Initial JSON parse failed, attempting structural repair...");
    
    // Attempt to close open braces/brackets
    let openBraces = (cleaned.match(/\{/g) || []).length;
    let closeBraces = (cleaned.match(/\}/g) || []).length;
    let openBrackets = (cleaned.match(/\[/g) || []).length;
    let closeBrackets = (cleaned.match(/\]/g) || []).length;

    while (openBraces > closeBraces) {
      cleaned += '}';
      closeBraces++;
    }
    while (openBrackets > closeBrackets) {
      cleaned += ']';
      closeBrackets++;
    }

    try {
      return JSON.parse(cleaned);
    } catch (secondError) {
      const lastBrace = cleaned.lastIndexOf('}');
      const lastBracket = cleaned.lastIndexOf(']');
      const cutPoint = Math.max(lastBrace, lastBracket);
      
      if (cutPoint > 0) {
        try {
          return JSON.parse(cleaned.substring(0, cutPoint + 1));
        } catch (thirdError) {
          throw new Error("AI response was too corrupted to repair.");
        }
      }
      throw secondError;
    }
  }
}

/**
 * Image queue to manage concurrency.
 */
class ImageQueue {
  async add(prompt: string): Promise<string | null> {
    return null; // Feature disabled for demo stability
  }
}

const imageQueue = new ImageQueue();

export async function generateImage(prompt: string): Promise<string | null> {
  return imageQueue.add(prompt);
}

export async function generateForgeCast(
  text: string,
  topic: string,
  persona: ForgePersona = 'pyra_default'
): Promise<ForgeCastBlueprint> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: `Transform text into ForgeCast blueprint. Topic: ${topic}. Persona: ${persona}. Text: ${text.substring(0, 5000)}`,
    config: {
      temperature: 0.7,
      responseMimeType: "application/json",
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
    }
  });

  const data = repairJSON(response.text || "");
  return {
    id: generateId(),
    ...data,
    createdAt: Date.now()
  };
}

export async function generateForgeCastFromChat(
  input: string,
  fileContent?: string
): Promise<any> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: `Generate ForgeCast blueprint from user input. Input: ${input}\n${fileContent ? `Context: ${fileContent}` : ''}`,
    config: {
      temperature: 0.7,
      responseMimeType: "application/json"
    }
  });

  return repairJSON(response.text || "");
}

export async function chatWithAcademicAssistant(
  message: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  studentProfile: any,
  persona: ForgePersona = 'pyra_default',
  activeSkin: string = 'Default',
  lessonAudit?: LessonArchitectAudit,
  fileContent?: string
): Promise<string> {
  try {
    const ai = getAI();
    const systemInstruction = `You are Pyra, a brilliant AI academic assistant. 
    Persona: ${persona}. 
    Skin: ${activeSkin}. 
    Student Background: ${JSON.stringify(studentProfile)}.
    Contextual Knowledge: ${lessonAudit?.forgechat_context_block || 'Default study mode'}.
    ${fileContent ? `Additional Context: ${fileContent}` : ''}`;
    
    const chat = ai.chats.create({
      model: DEFAULT_MODEL,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    const response = await chat.sendMessage({ message });
    return response.text || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "I am currently calibrating my forge cores. Please try again in a moment.";
  }
}

export async function generateLessonPreview(text: string): Promise<any> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: `Analyze this text and extract primary learning objectives and key terms: ${text.substring(0, 3000)}`,
    config: {
      responseMimeType: "application/json"
    }
  });

  return repairJSON(response.text || "");
}

export type ProgressStage = 'extracting' | 'auditing' | 'cards' | 'quiz' | 'finalizing';

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
  isAdmin: boolean = false
): Promise<{ deck: Deck; quiz: Quiz; lesson?: LessonArchitectAudit }> {
  
  const user = auth.currentUser;
  if (user && !isAdmin) {
    const isAllowed = await checkAndIncrementUsage(user.uid);
    if (!isAllowed) throw new Error("Daily limit exceeded.");
  }

  const ai = getAI();
  const cacheKey = `study_mat_v3_${hashString(text + title + instructions + quantity + difficulty)}`;
  const cached = await get(cacheKey);
  if (cached) return cached as any;

  onProgress?.('auditing', 'Conducting Unified Cognitive Fusion...');

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: `You are the Lead Pedagogical Architect. 
    Perform a Semantic Audit and generate ${quantity} study materials (flashcards and quiz) from the provided text.
    Title: ${title}
    Instructions: ${instructions}
    Difficulty: ${difficulty}
    Level: ${level}
    Subject: ${subject}
    Text: ${text.substring(0, 10000)}`,
    config: {
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: {
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
                  exam_relevance_score: { type: Type.NUMBER }
                },
                required: ["title", "subject", "level_detected"]
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
                    card_type: { type: Type.STRING },
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
      }
    }
  });

  const data = repairJSON(response.text || "");

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
      cardType: (f.card_type || 'definition') as any,
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
      correctAnswer: q.type === 'mcq' ? (q.options || []).findIndex((o: string) => q.correct_answer && o.toLowerCase().includes(q.correct_answer.toLowerCase())) : undefined,
      correctAnswerText: q.type !== 'mcq' ? q.correct_answer : undefined,
      explanation: q.mark_scheme || "",
      marks: q.marks || 1
    })),
    isAIGraded: true
  };

  const finalResult = { deck, quiz, lesson };
  await set(cacheKey, finalResult);
  return finalResult;
}

export async function generateModeSession(
  auditData: LessonArchitectAudit,
  selectedMode: StudyMode,
  studentContext: any
): Promise<ModeEngineSession> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: `Generate a specialized ${selectedMode} study session for student ${studentContext.name}. 
    Use the following audit data: ${JSON.stringify(auditData)}`,
    config: {
      temperature: 0.7,
      responseMimeType: "application/json"
    }
  });

  const data = repairJSON(response.text || "");
  return {
    id: generateId(),
    lessonId: auditData.id!,
    mode: selectedMode,
    createdAt: Date.now(),
    ...data
  };
}

export async function analyzeSRSSession(
  studentName: string,
  subject: string,
  sessionData: any,
  fullDeckStats: any
): Promise<SRSIntelligenceAnalysis> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: `Analyze SRS performance for ${studentName} in ${subject}. 
    Session: ${JSON.stringify(sessionData)}. Stats: ${JSON.stringify(fullDeckStats)}`,
    config: {
      temperature: 0.4,
      responseMimeType: "application/json"
    }
  });
  const data = repairJSON(response.text || "");
  return { id: generateId(), createdAt: Date.now(), ...data };
}

export async function generateExamSimulatorAction(
  action: 'generate_exam' | 'forge_revision_plan',
  payload: any
): Promise<any> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: `Simulator Action: ${action}. Payload: ${JSON.stringify(payload)}`,
    config: {
      temperature: 0.5,
      responseMimeType: "application/json"
    }
  });
  return repairJSON(response.text || "");
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
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: `Generate 5 reinforcement cards for missed concepts in ${topic}: ${JSON.stringify(missedCards)}`,
    config: {
      temperature: 0.7,
      responseMimeType: "application/json"
    }
  });
  const data = repairJSON(response.text || "");
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
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: `Generate a formal academic exam paper based on: ${text.substring(0, 6000)}`,
    config: {
      temperature: 0.4,
      responseMimeType: "application/json",
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
    }
  });

  const data = repairJSON(response.text || "");
  return {
    id: generateId(),
    title: `${title} - Formal Exam`,
    questions: (data.exam_questions || []).map((q: any) => ({
      id: generateId(),
      question: q.question,
      type: q.type as any,
      options: q.options || [],
      correctAnswer: q.type === 'mcq' ? parseInt(q.answer) : undefined,
      correctAnswerText: q.type !== 'mcq' ? q.answer : undefined,
      explanation: q.explanation,
      marks: q.marks
    })),
    isExam: true,
    timeLimit,
    isAIGraded: true
  };
}

export async function generateRewardContent(
  purchase: EmberPurchaseData, 
  student: EmberStudentData, 
  activeSkin: string = 'Default'
): Promise<EmberRewardResponse> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: `Generate exclusive reward content for item ${purchase.item_id}. 
    Student: ${student.name}. Focus: ${student.subject_focus}. Skin: ${activeSkin}`,
    config: {
      temperature: 0.8,
      responseMimeType: "application/json"
    }
  });

  const data = repairJSON(response.text || "");
  return {
    reward_delivered: { 
      item_id: data.item_id || purchase.item_id, 
      item_name: data.item_name || "Unlocked Material", 
      ember_cost: purchase.ember_cost, 
      new_balance: student.current_embers - purchase.ember_cost, 
      delivery_message: "Your cognitive expansion has been authorized." 
    },
    reward_content: { 
      type: data.item_name || "Study Expansion", 
      content: data.content || "Cognitive data forged successfully.", 
      follow_up_action: data.follow_up_action || "Start learning now." 
    }
  };
}

export async function generateAtmosphere(req: AtmosphereRequest): Promise<AtmosphereResponse> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: `Generate atmospheric data for theme: ${req.active_theme}. 
    Context: ${req.trigger}. Student: ${req.student_name}`,
    config: {
      temperature: 0.7,
      responseMimeType: "application/json"
    }
  });

  return repairJSON(response.text || "");
}
