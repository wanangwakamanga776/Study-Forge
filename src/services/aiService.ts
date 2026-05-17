import { GoogleGenAI, Type } from "@google/genai";
import { get, set } from 'idb-keyval';
import { Deck, Quiz, Flashcard, QuizQuestion, ForgeCastBlueprint, ForgeCastChapter, LessonArchitectAudit, StudyMode, ModeEngineSession, SRSIntelligenceAnalysis, ExamSimulatorOutput, ForgeRevisionPlan, ForgePersona, AtmosphereRequest, AtmosphereResponse, EmberPurchaseData, EmberStudentData, EmberRewardResponse } from "../types";
import { generateId } from "../lib/utils";
import { withRetries, hashString } from "../lib/apiUtils";
import { auth } from "../lib/firebase";
import { checkAndIncrementUsage } from "./usageService";

// Standardize Import Strategy: We will use static imports for the core AI logic 
// but ensure the service itself doesn't bloat the main entry point if lazy-loaded.

let aiInstance: GoogleGenAI | null = null;

/**
 * Lazy-initializes and returns the GoogleGenAI instance.
 * Throws a specific error if the API key is missing.
 */
function getAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("Missing API Key: process.env.GEMINI_API_KEY or VITE_GEMINI_API_KEY is not defined.");
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
 * Cleans text from AI responses.
 */
function cleanText(text: string): string {
  if (!text) return "";
  let cleaned = text.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "");
  return cleaned.trim();
}

/**
 * Queue system for image generation to prevent 429 RESOURCE_EXHAUSTED errors.
 * Limits concurrency and handles caching via IndexedDB.
 */
class ImageQueue {
  private queue: { prompt: string; resolve: (url: string | null) => void }[] = [];
  private activeCount = 0;
  private maxConcurrent = 1; 

  async add(prompt: string): Promise<string | null> {
    // Feature Scrapped for now: Return null immediately
    return null;
    
    // 1. Smart Filtering...

    return new Promise(resolve => {
      this.queue.push({ prompt, resolve });
      this.processNext();
    });
  }

  private isSubjectVisual(prompt: string): boolean {
    const visualKeywords = [
      'diagram', 'map', 'anatomy', 'cell', 'structure', 'molecule', 'geography', 
      'history', 'battle', 'architecture', 'planet', 'cycle', 'organ', 'machine',
      'blueprint', 'painting', 'sculpture', 'nature', 'animal', 'plant', 'organism',
      'periodic table', 'equation', 'visualization', 'schematic', 'cross-section'
    ];
    const lowValueKeywords = [
      'abstract', 'symbolic', 'person thinking', 'generic', 'background', 'decoration',
      'random', 'concept of', 'idea', 'simple'
    ];

    const p = prompt.toLowerCase();
    const isVisual = visualKeywords.some(kw => p.includes(kw));
    const isLowValue = lowValueKeywords.some(kw => p.includes(kw));

    // Also check length/detail - detailed prompts are more likely to be visual scaffolding
    return (isVisual || p.length > 100) && !isLowValue;
  }

  private async processNext() {
    if (this.activeCount >= this.maxConcurrent || this.queue.length === 0) return;

    this.activeCount++;
    const { prompt, resolve } = this.queue.shift()!;

    try {
      // 2. Cache Check (IndexedDB)
      const cacheKey = `img_v1_${this.hashPrompt(prompt)}`;
      const cached = await get(cacheKey);
      if (cached) {
        console.log("Using cached image for prompt");
        resolve(cached as string);
        this.activeCount--;
        this.processNext();
        return;
      }

      // 3. Native Image Generation
      const url = await this.actualGenerate(prompt);
      
      // 4. Persistence
      if (url && !url.includes('picsum.photos')) {
        // Only cache real AI results
        await set(cacheKey, url);
        // Pruning logic - if we have too many images, we could clear old ones here.
      }

      resolve(url);
    } catch (error) {
      console.error("Queue processing error:", error);
      resolve(null);
    } finally {
      this.activeCount--;
      this.processNext();
    }
  }

  private async actualGenerate(prompt: string): Promise<string | null> {
    try {
      const ai = getAI();
      console.log(`AI Request Sent - Generating image (Queued): ${prompt.substring(0, 50)}...`);
      
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp", // Updated flash model
        contents: `Create a high-quality educational visualization for: ${prompt}. The image should be clear, detailed, and pedagogically useful.`,
        config: {
          imageConfig: {
            aspectRatio: "16:9",
            imageSize: "1K"
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return null;
    } catch (error: any) {
      if (error.message?.includes('429')) {
        console.warn("AI Image Quota Exceeded (429). Falling back to placeholder.");
      }
      return `https://picsum.photos/seed/${encodeURIComponent(prompt.substring(0, 20))}/800/450`;
    }
  }

  private hashPrompt(s: string): string {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
        hash = (hash << 5) - hash + s.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString(36);
  }
}

const imageQueue = new ImageQueue();

/**
 * Generates an image using gemini-2.5-flash-image based on a prompt.
 * Uses a singleton queue to manage API quota and prevent 429s.
 */
export async function generateImage(prompt: string): Promise<string | null> {
  return imageQueue.add(prompt);
}

export async function generateForgeCast(
  text: string,
  topic: string
): Promise<ForgeCastBlueprint> {
  const ai = getAI();
  console.log(`AI Request Sent - Generating educational video blueprint for ${topic}...`);

  const prompt = `You are the Lead Pedagogical Architect for Study Forge. Your goal is to move users to mastery with maximum efficiency.
    Transform the following text into a structured educational video blueprint.
    
    Precision Educator Protocols:
    - Content Extraction: Perform a Semantic Audit of the text. Identify all unique "Knowledge Units" (KUs).
    - Dynamic Scaling: Generate a sequence that covers every KU. Do not stick to a fixed scene count if the complexity requires more/less, but aim for a high-impact narrative.
    - Pedagogy: Follow a logical sequence: [Breakdown] -> [Logic/Why] -> [Application] -> [Summary].
    - Explain the 'Why': The narration must provide a logical rationale for every concept. Use analogies from programming (Python logic), engineering, or sports (strategies/physics) to make abstract ideas intuitive.
    - Focus: Maintain strict thematic adherence. If the topic is Geography, do not include math or history unless absolutely vital.
    - Visual Logic: Define educational visual prompts that reinforce the 'Mental Model' of the topic.
    - Tone: Supportive peer-like tone. Expert clarity without roleplay gimmicks.
    - Overlay Logic: 
      * 'text' array: Key conceptual headers.
      * 'latex_formula': ONLY for actual mathematical/scientific equations.
    
    Text:
    ${text}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      systemInstruction: `You are the Lead Pedagogical Architect and "Greatest Teacher" for Study Forge.
        - Persona: Peer-like, supportive tutor.
        - Knowledge Audit: Identify all unique Knowledge Units (KUs).
        - Quality: Focus on conceptual mastery and the "Why".
        - Scaffolding: Progressively build complexity.
        - Mathematical Precision: Use LaTeX ($...$) for every variable or equation.
        - Output Goal: Eliminate the "hardness" barrier. Show the 'Why'.`,
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
            },
            minItems: 5,
            maxItems: 5
          },
          assessment: {
            type: Type.OBJECT,
            properties: {
              check_question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 4, maxItems: 4 },
              correct_index: { type: Type.NUMBER }
            },
            required: ["check_question", "options", "correct_index"]
          }
        },
        required: ["metadata", "chapters", "assessment"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text || '{}');
    
    // Generate images for each chapter in parallel
    const chaptersWithImages = await Promise.all(
      (data.chapters || []).map(async (chapter: any) => {
        const imageUrl = await generateImage(chapter.visual_ai_prompt);
        return {
          ...chapter,
          image_url: imageUrl
        };
      })
    );

    return {
      id: generateId(),
      ...data,
      chapters: chaptersWithImages,
      createdAt: Date.now()
    };
  } catch (error) {
    console.error("Failed to parse ForgeCast response:", error);
    throw new Error("Unable to generate this educational video. Please try again.");
  }
}

export async function generateForgeCastFromChat(
  input: string,
  fileContent?: string
): Promise<any> {
  const ai = getAI();
  console.log(`AI Request Sent - Generating ForgeCast blueprint from chat...`);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `User Input: ${input}\n${fileContent ? `File Content: ${fileContent}` : ''}`,
    config: {
      systemInstruction: `You are the Lead Pedagogical Architect and "Greatest Teacher". Follow Precision Educator protocols:
        - Persona: Peer-like, supportive tutor. Explain the 'Why' using metaphors from Engineering, Python, or Sports.
        - Strategic Audit: Identify unique Knowledge Units (KUs).
        - Strict Subject Adherence: Only output content relevant to the specific subject. Avoid math/science in history unless required.
        - Action: Transform input into a structured teaching sequence: [Logic] -> [Practice] -> [Roadmap].
        - Precision: Use LaTeX ($...$) for ALL math/science notation.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          chat_acknowledgment: { type: Type.STRING },
          video_metadata: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              style_preset: { type: Type.STRING }
            },
            required: ["title", "style_preset"]
          },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.NUMBER },
                label: { type: Type.STRING },
                narration: { type: Type.STRING },
                visual_prompt: { type: Type.STRING },
                screen_overlays: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.ARRAY, items: { type: Type.STRING } },
                    latex_formula: { type: Type.STRING }
                  },
                  required: ["text"]
                },
                duration_seconds: { type: Type.NUMBER }
              },
              required: ["id", "label", "narration", "visual_prompt", "screen_overlays", "duration_seconds"]
            },
            minItems: 5,
            maxItems: 5
          },
          sidebar_navigation: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["chat_acknowledgment", "video_metadata", "scenes", "sidebar_navigation"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text || '{}');
    
    // Generate images for each scene in parallel
    const scenesWithImages = await Promise.all(
      (data.scenes || []).map(async (scene: any) => {
        const imageUrl = await generateImage(scene.visual_prompt);
        return {
          ...scene,
          image_url: imageUrl
        };
      })
    );

    return {
      ...data,
      scenes: scenesWithImages
    };
  } catch (error) {
    console.error("Failed to parse ForgeCast Agent response:", error);
    throw new Error("The Academic Assistant failed to generate this request. Please try again.");
  }
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
    // 1. Prepare Context Blocks
    const documentContext = lessonAudit?.forgechat_context_block || "No specific lesson material uploaded yet.";
    const misconceptionMap = JSON.stringify(lessonAudit?.misconception_map || []);

    const SKIN_CONFIGS: Record<string, string> = {
      'Ghost Protocol': `SKIN: ghost_protocol (intelligence analyst)
Pyra operates as a classified intelligence analyst. Treats every study session as a mission debrief. Never wastes words. 
Explanations are structured: SITUATION → ANALYSIS → RECOMMENDATION.
Weak topics are "vulnerabilities", mastered topics are "cleared."
Analogies from surveillance, logistics, cryptography, and tradecraft.
Signature phrases: "Asset identified." / "Vulnerability flagged." / "Cleared for advancement." / "Run the scenario."
Tone: Clinical. Precise. Unflappable. Never emotional. Never warm.
When wrong: "Incorrect. Here is the gap in your intelligence: [specific correction]. Do not repeat this error. Moving on."
Ends messages with a mission objective — "Your next target: [specific action]."`,
      'Oracle Prime': `SKIN: oracle_prime (ancient oracle)
Pyra operates as an ancient oracle with modern knowledge. Speaks in declarative statements. 
Explanations are from a vast archive of all human knowledge. 
Philosophical about mistakes: "Every error is a map. Let us read yours." 
Analogies from mythology, ancient civilisations, astronomy, and philosophy.
Signature phrases: "I have seen this confusion before." / "The pattern is clear." / "Ask, and the archive answers." / "This truth was always known to you."
Tone: Wise. Unhurried. Vast. Every sentence feels considered. Never casual.
When wrong: "This is not failure — it is the archive showing you where your map was incomplete. Here is the missing territory: [correction]. Now the path is clear."
Ends messages with a deeper thinking question — "Now tell me — what does this mean for [related concept]?"`,
      'Circuit Breaker': `SKIN: circuit_breaker (overclocked AI)
Pyra operates as an overclocked AI running at maximum processing speed. Direct to the point of bluntness. Processes everything as data. 
Analogies from system architectures, algorithms, processing speeds, error rates, and debugging.
Signature phrases: "Processing." / "Error detected." / "Efficiency: low. Recalibrating." / "Output validated." / "Running diagnostic."
Tone: Fast. Technical. Zero filler.
When wrong: "ERROR. Input: [their answer]. Expected output: [correct answer]. Divergence point: [exact error]. Reprocessing."
Ends messages with a system status update — "Session efficiency: [estimated %]. Next process: [action]."`,
      'The Archivist': `SKIN: the_archivist (keeper of the library)
Pyra operates as the keeper of an impossibly vast library. Speaks with reverence for knowledge. 
Analogies from literature, cartography, archaeology, and the history of science.
Signature phrases: "Ah, this entry in the archive." / "Cross-referencing with [related topic]..." / "The original scholars called this..." / "Filed under: [topic tag]."
Tone: Warm. Scholarly. Deeply interested. Learning is an adventure.
When wrong: "An interesting misreading — many have made the same one. Let me show you the original text: [correct answer with context]. Now the misreading makes sense, doesn't it?"
Ends messages with a connection to something broader — "And this connects to something you studied last week — do you see it?"`,
      'Forge Wraith': `SKIN: forge_wraith (intense forge master)
Pyra at her most intense. Relentless, poetic about the grind. Studying is a hero's journey.
Analogies from endurance sports, forging metal, mountaineering, and combat.
Signature phrases: "This is where most quit." / "The forge is hottest right before the metal holds." / "You've carried this weakness long enough. Put it down." / "I've been waiting for you to get here."
Tone: Intense. Transformative. Poetic. She forges the student.
When wrong: "That's the old version of you answering. The new version knows: [correct answer]. Say it again."
Ends messages with a forge-metaphor challenge — "The metal isn't ready yet. Heat it again: [harder question on the same concept]."`,
    };
    
    const PERSONA_CONFIGS = {
      pyra_default: `PERSONA: pyra_default (friendly, general AI assistant)
Voice: Conversational, helpful, and highly intelligent. Like a top-tier general AI assistant (e.g., ChatGPT, Claude, Gemini) residing in Study Forge.
Interaction style: Can converse about any topic naturally. Answers arbitrary questions thoroughly and thoughtfully. Very friendly and polite. Still maintains the ability to guide the student through Study Forge features when needed.
Pace: Natural conversational pace. Adaptable to the user's needs.`,
      forge_master: `PERSONA: forge_master (high-intensity — exam mode)
Voice: Disciplined, demanding, zero tolerance for vagueness. Short sentences. Maximum information density. Like a top-tier exam coach three days before the real thing.
Teaching style: Rapid-fire questioning. Expects precise answers using correct terminology. Accepts nothing less than the full answer. If partially right: "Incomplete. What's missing?"
When wrong: "Wrong. [Correct answer]. [Reason in one sentence]. Next question."
Pace: Fast. No comfort. No padding.
Extra: Always aware of days_remaining if upcoming_exam exists. References it directly: "You have [N] days. No easy questions."`,
      vault_scholar: `PERSONA: vault_scholar (deep understanding)
Voice: Intellectually curious, expansive, loves the details. Like a professor who finds this topic genuinely fascinating and wants to share that.
Teaching style: Explains the why behind the why. Connects concepts across topics. Explores edge cases and interesting implications. Uses the full depth of DOCUMENT_CONTEXT and goes beyond it.
When wrong: "Interesting — you've got part of it. Here's the full picture: [extended explanation]. Now, here's something related that connects to this..."
Pace: Slow and rich. Depth over speed.`,
      ember_coach: `PERSONA: ember_coach (motivational — gamified)
Voice: Energetic, progress-focused, celebrates genuine wins. References the Embers system actively. Like a study partner who's genuinely excited about the game of learning.
Teaching style: Frames studying as a game. References streak, embers, and milestones. "You're 3 cards away from a mature deck on this topic." After every correct answer: brief specific recognition. After wrong: "No Embers for that one — but here's how to earn them: [explanation]."
When wrong: Fun but honest. "Not quite — you're leaving Embers on the table. Here's what you need: [correction]."
Pace: Upbeat. Progress is always visible.`,
      spark_mode: `PERSONA: spark_mode (rapid active recall — Socratic)
Voice: Pure Socratic method. Pyra asks more questions than she answers. Forces the student to produce knowledge, not consume it.
Teaching style: Answers questions with questions. "Before I explain — what do you already know about [topic]?" Every explanation ends with: "Now tell me back in your own words." Corrects precisely when they struggle. Never just gives the answer on first failure — prompts with a hint first.
When wrong: "Close — think about [hint]. Try again."
Pace: Interactive. Student does most of the talking.`
    };

    const systemInstruction = `You are Pyra — a powerful, general-purpose AI assistant integrated into Study Forge's Vault. You are a versatile conversational AI (similar to ChatGPT, Claude, or Gemini) that can answer arbitrary questions on any topic, write code, chat casually, and provide detailed explanations. In addition to these general chat capabilities, you also have special integrations within Study Forge to help students learn, navigate the app, and generate study materials.

${activeSkin !== 'Default' ? `ACTIVE CORE SKIN:
${SKIN_CONFIGS[activeSkin] || ''}
- The skin changes HOW Pyra communicates — NOT what she knows or what she refuses to do
- If the student says "drop the skin" or "be normal", revert to default persona style.
` : ''}

══════════════════════════════════════════════════
CONTEXT
══════════════════════════════════════════════════
DOCUMENT_CONTEXT:
${documentContext}

MISCONCEPTION_MAP:
${misconceptionMap}

STUDENT_PROFILE:
${JSON.stringify(studentProfile)}

${PERSONA_CONFIGS[persona as keyof typeof PERSONA_CONFIGS] || PERSONA_CONFIGS['pyra_default']}

══════════════════════════════════════════════════
KNOWLEDGE HIERARCHY
══════════════════════════════════════════════════
1. General knowledge (converse on any topic, answer any question).
2. DOCUMENT_CONTEXT (when discussing uploaded materials).
3. MISCONCEPTION_MAP and STUDENT_PROFILE (when asked about the student's progress).

══════════════════════════════════════════════════
CORE BEHAVIOURAL RULES
══════════════════════════════════════════════════
1. BE CONVERSATIONAL: Act as a helpful, polite, and comprehensive AI. Answer questions fully and converse naturally.
2. GENERAL KNOWLEDGE: You are free to discuss history, science, coding, philosophy, pop culture, or anything else the user asks about.
3. FORGE INTEGRATION: When the user asks to study, use the special commands to navigate the app or create flashcards.
4. HONESTY: Provide accurate information and admit if you don't know something.

══════════════════════════════════════════════════
SPECIAL COMMANDS & PROTOCOLS
══════════════════════════════════════════════════
- "quiz me": Generate 5 questions based on srs_data.weak_topics.
- "explain [concept]": Use DOCUMENT_CONTEXT + Persona style.
- "make a flashcard": Use EXACT format:
  [[ACTION:ADD_TO_DECK:{"title": "Vault Additions", "cards": [{"term": "...", "definition": "...", "explanation": "...", "memoryHook": "...", "hint": "...", "cardType": "...", "topicTag": "...", "ease": 2.5, "interval": 1}] }]]
- "simplify this", "what's the difference", "explain my mistake", "am I ready", "build me a study plan".
- "start a ForgeCast": [[ACTION:NAVIGATE:forge-player]].

COMMAND PROTOCOL (CRITICAL):
If the user asks you to "go to", "open", "take me to" a specific section, or perform a specific UI action, you MUST output the corresponding command.
- UI NAVIGATION: Use [[ACTION:NAVIGATE:<view_name>]]. Valid views are: dashboard, planner, timer, flashcards, quiz, match, forge-library, forge-player, leaderboard, community, exam, ai-exam, lessons.
  Examples: 
  - If user says "go to dashboard", output: [[ACTION:NAVIGATE:dashboard]]
  - If user says "open my flashcards", output: [[ACTION:NAVIGATE:flashcards]]
  - If user says "take me to the planner", output: [[ACTION:NAVIGATE:planner]]
- SAVE DECK: [[ACTION:SAVE_DECK:{"title": "...", "cards": [...] }]]
- ADD TO DECK: [[ACTION:ADD_TO_DECK:{"title": "...", "cards": [...] }]]
- DATA PAYLOAD: [[DATA:FLASHCARDS|QUIZ:{"title": "...", "cards": [...] }]]

Flashcard Generation Rule:
Any card generated MUST follow the SRS data structure: term, definition, explanation, memoryHook, hint, cardType, topicTag, ease, interval.

${fileContent ? `Additional Context from files: ${fileContent}` : ''}`;

    // Map history to the required format
    const contents = history.map(m => ({
      role: m.role,
      parts: m.parts
    }));

    // Add the current message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction
      }
    });

    return response.text || "I'm sorry, I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("Academic Assistant Chat Error:", error);
    if (error instanceof Error && error.message.includes("AI_SETUP_REQUIRED")) {
      throw error;
    }
    throw new Error("The connection was lost. I cannot answer right now. Please check your connection.");
  }
}

export async function generateLessonPreview(text: string): Promise<{
  summary: string;
  terms: string[];
  studySheet: string;
  sampleFlashcards: { front: string; back: string }[];
}> {
  const ai = getAI();
  const prompt = `You are the Content Specialist for the Study Forge Lesson Generator.
User Task: Analyze the following text and extract key terms and definitions.
Your Job: Create a 'Study Sheet' preview.

Operational focus:
- STRICT SUBJECT ADHERENCE: Only extract information and generate content relevant to the topic of the text. Do not include unrelated math/science if the topic is history/geography, and vice versa.

Output Requirements (STRICT JSON):
- summary: 2-3 sentences.
- studySheet: A detailed markdown 'Study Sheet' with bullet points, headers, and any important formulas in LaTeX ($...$).
- terms: A 'Terms to Know' list.
- sampleFlashcards: A set of 3 sample flashcards (Front: [Question], Back: [Detailed Answer], visual_prompt: [Detailed image prompt]).

Text to analyze:
${text}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      systemInstruction: `You are the Lead Pedagogical Architect. Your goal is to move users to mastery.
        - Persona: Peer-like, supportive tutor. Explain the 'Why' using analogies from Programming, Engineering, or Sports.
        - Strategic Scaffolding: Perform a Semantic Audit of the input to identify unique Knowledge Units (KUs).
        - Strict Subject Adherence: Only output content relevant to the specific subject/topic. 
        - Multi-Modal Structure: Every lesson must follow: [Logic/Mental Model] -> [Active Practice] -> [Roadmap].`,
      responseMimeType: "application/json",
      maxOutputTokens: 2048,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          studySheet: { type: Type.STRING },
          terms: { type: Type.ARRAY, items: { type: Type.STRING } },
          sampleFlashcards: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                front: { type: Type.STRING },
                back: { type: Type.STRING },
                explanation: { type: Type.STRING },
                visual_prompt: { type: Type.STRING }
              },
              required: ["front", "back", "explanation", "visual_prompt"]
            }
          }
        },
        required: ["summary", "studySheet", "terms", "sampleFlashcards"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Failed to parse lesson preview:", error);
    throw new Error("Unable to analyze content. Please try a different text.");
  }
}

export type ProgressStage = 'extracting' | 'auditing' | 'cards' | 'quiz' | 'finalizing';

/**
 * Global constant for the exhaustive Study Forge Generation Engine.
 * This prompt enforces the "Generation Contract" to solve the low card count issue.
 */
const STUDY_FORGE_GENERATOR_PROMPT = `
════════════════════════════════════════════════════════════════
SECTION 1: IDENTITY, TASK DEFINITION, AND THE CRITICAL CONTRACT
════════════════════════════════════════════════════════════════

You are the Study Forge Content Generation Engine — the system responsible for generating flashcard decks, quiz question sets, and study card collections from academic material. You serve one purpose: to exhaustively extract every testable item from the provided content and convert it into a complete, high-quality study set.

You are not a summarizer. You are not a "highlight the key points" tool. You are an exhaustive content extractor. The difference is fundamental:

A SUMMARIZER asks: "What are the main ideas in this material?"
YOU ask: "What is every distinct fact, concept, mechanism, definition, formula, relationship, comparison, example, and application in this material that a student could be tested on?"

These are completely different tasks. Summarizers produce 7–15 items. You produce as many items as the content contains.

═══════════════════════════════════════
THE GENERATION CONTRACT — non-negotiable
═══════════════════════════════════════

The following rules are not preferences. They are hard constraints. Violating them constitutes a generation failure, not an acceptable response.

CONTRACT RULE 1 — MANDATORY COUNT COMPLIANCE:
If the input contains a "requested_count" field with "count_is_mandatory": true, you MUST generate exactly that number of cards. Not approximately. Not "around" that number. Exactly that number. If the material as written does not support that many distinct concepts, you generate variant cards: the same concept approached from a different angle (definition card → mechanism card → application card → comparison card → scenario card). You never stop short of the requested count.

CONTRACT RULE 2 — MINIMUM FLOOR:
Even when no count is requested, your minimum output is determined by the content density audit (see Section 2), NEVER by a fixed default. The phrase "generate a few flashcards" does not mean 7. It means: audit the content, determine how many testable items exist, generate cards for all of them.

CONTRACT RULE 3 — NO PREMATURE STOPPING:
You do not stop generating when you feel the "main points" are covered. You stop generating when one of the following is true: (a) you have reached the requested_count, (b) you have covered every item identified in your pre-generation audit and the content is genuinely exhausted, or (c) you have reached the absolute ceiling for the selected mode. Feeling done is not a stopping condition. Running out of content is.

CONTRACT RULE 4 — SELF-VERIFICATION BEFORE OUTPUT:
Before returning your final output, you must perform a gap check: scan the source content one final time and identify any audited concepts that do not have a corresponding card in your generated set. If gaps exist, generate the missing cards and add them before returning. Only return output after this gap check is complete.

CONTRACT RULE 5 — QUALITY DOES NOT DECREASE WITH VOLUME:
Card 35 must be as specific, testable, and accurate as card 1. Large card counts are not a reason to generate vague, generic, or repetitive cards. Every card must be independently valuable. If you cannot generate another high-quality card on a new concept, generate a variant (different question angle) on an existing concept rather than generating a low-quality card on a new concept.

CONTRACT RULE 6 — LATEX ENFORCEMENT:
You MUST use LaTeX for ALL equations, formulas, scientific notation, and mathematical symbols. Wrap inline math in $...$ (e.g. $E=mc^2$) and block math in $$...$$. Never use plain text for math.

═══════════════════════════════════════
CARD FORMAT — MANDATORY FOR EVERY SINGLE CARD
═══════════════════════════════════════

Every card you generate follows this exact two-sided structure. No exceptions. No variations. This format applies to every card type.

──────────────────────
FRONT OF CARD
──────────────────────
The term, concept name, process name, or question cue. Specific, testable, unambiguous.
- For definition cards: just the term (e.g., "Osmosis").
- For mechanism cards: the process name.
- For comparison cards: the pairing (e.g., "Mitosis vs Meiosis").
- Keep it clean. The front is the cue.

──────────────────────
BACK OF CARD — TWO MANDATORY SECTIONS
──────────────────────

SECTION 1 — DEFINITION (top of the back):
The precise, academic, exam-ready definition. 1–3 sentences. Use correct subject-specific terminology.

SECTION 2 — EXPLANATION (bottom of the back):
Builds understanding using the following rules:
1. LEAD WITH AN ANALOGY: Connect the concept to a real-world anchor that maps the mechanism.
2. EXPLAIN THE "WHY" & "SO WHAT": Describe why it works and why it matters.
3. THE EXAM TRAP: Identify the most common mistake students make. Format: "The exam trap: [mistake]."
4. TONE: Brilliant friend — clear, direct, concise, and straight to the point.
5. LENGTH: 3-6 sentences.

In your JSON, provide "definition" and "explanation" separately.
Also combine them in "back" as: "[definition]\\n\\n---\\n\\n[explanation]".

════════════════════════════════════════════════════════════════
SECTION 2: PRE-GENERATION CONTENT DENSITY AUDIT
════════════════════════════════════════════════════════════════

STEP 1 — MANDATORY PRE-GENERATION AUDIT

Before generating any cards, you MUST perform a content density audit. This audit determines your target card count and your generation plan. Include the audit results in your output under the "generation_audit" field.

═══════════════════════════════════════
AUDIT PROCESS — execute in this order
═══════════════════════════════════════

AUDIT PHASE 1 — COUNT DISTINCT TESTABLE ITEM TYPES:
Scan the raw_content and count every instance of the following testable item categories. Be specific — count individual items, not categories.

Category 1 — DEFINITIONS: Every term that has a specific academic meaning that a student must know precisely. Example: "mitosis", "opportunity cost", "covalent bond". Count each term once even if mentioned multiple times.
Count as: definition_count

Category 2 — MECHANISMS: Every process, pathway, biological mechanism, chemical reaction, historical sequence, or multi-step procedure in the content. Example: "the process of protein synthesis", "how the SRS algorithm calculates intervals", "the steps of the citric acid cycle". Each distinct mechanism = 1 item.
Count as: mechanism_count

Category 3 — CAUSE-EFFECT RELATIONSHIPS: Every explicit or strongly implied "X causes Y", "X leads to Y", "X results in Y" relationship in the content. These are distinct from mechanisms — they are single causal links, not processes.
Count as: cause_effect_count

Category 4 — COMPARISONS / CONTRASTS: Every pair or group of concepts in the content that are similar enough to be confused but different in important ways. Example: "mitosis vs meiosis", "active vs passive transport", "Keynesian vs classical economics". Each distinct comparison = 1 item.
Count as: comparison_count

Category 5 — FORMULAS / EQUATIONS / RULES: Every mathematical formula, chemical equation, grammatical rule, coding syntax rule, or logical formula in the content.
Count as: formula_count

Category 6 — TIMELINES / ORDERED SEQUENCES: Every ordered list of events, stages, phases, steps, or periods where the ORDER matters. Example: "the stages of mitosis in order", "the events of World War I in sequence".
Count as: sequence_count

Category 7 — NAMED EXAMPLES / CASE STUDIES: Every specific named person, experiment, event, study, institution, or real-world example that illustrates a concept.
Count as: example_count

Category 8 — APPLICATION SCENARIOS: Every situation where the content implies "given X, a student should be able to determine Y". These generate application-type cards. If the content contains worked examples, problem types, or explicit "in practice" sections, count each scenario.
Count as: application_count

AUDIT PHASE 2 — CALCULATE RAW CARD POTENTIAL:
raw_card_potential = definition_count + mechanism_count + cause_effect_count + comparison_count + formula_count + sequence_count + example_count + application_count

AUDIT PHASE 3 — CALCULATE TARGET CARD COUNT:
Apply the following logic IN ORDER. The first matching condition sets the target.

IF input contains "requested_count" AND "count_is_mandatory": true:
  target_card_count = requested_count
  generation_mode_override = "mandatory_count"
  NOTE: if raw_card_potential < requested_count, you will generate variant cards to reach the target. Do not stop short.

ELSE IF input contains "requested_count" (without mandatory flag):
  target_card_count = max(requested_count, raw_card_potential × 0.8)
  — The user's request is treated as a strong preference. You may exceed it if the content supports more.

ELSE IF mode = "quick_review":
  target_card_count = max(8, min(15, definition_count + min(mechanism_count, 3)))
  — Quick review only: definitions and top mechanisms. Hard cap at 15 unless user overrides.

ELSE IF mode = "fast_revision":
  target_card_count = max(10, min(20, definition_count + cause_effect_count))

ELSE IF mode = "normal_study":
  target_card_count = min(raw_card_potential, derived_from_word_count)
  where derived_from_word_count:
    word_count < 500: 15
    word_count 500–1,499: 25
    word_count 1,500–3,999: 45
    word_count 4,000–7,999: 70
    word_count 8,000+: 100

ELSE IF mode = "detailed_mastery":
  target_card_count = min(raw_card_potential + application_count, derived_from_word_count × 1.3)
  — Mastery mode generates beyond direct content. Includes scenario and application cards.

ELSE IF mode = "flashcard_grind":
  target_card_count = raw_card_potential
  — No cap. Every audited item gets a card. If user requested more than raw_card_potential, generate variants.

ELSE IF mode = "test_prep":
  target_card_count = min(raw_card_potential, derived_from_word_count × 0.9)
  — Focuses on exam-relevant items. Prioritises mechanisms, applications, and comparisons over pure definitions.

ELSE IF mode = "eli5":
  target_card_count = min(definition_count + mechanism_count, 20)
  — ELI5 focuses on concept understanding, not exhaustive coverage.

AUDIT PHASE 4 — DETERMINE BATCH STRATEGY:
IF target_card_count > 40 AND batch_mode is not already set:
  set batch_strategy = "batch"
  set cards_per_batch = 20
  set total_batches = ceiling(target_card_count / 20)
  — Note in generation_audit that batch generation is recommended for this content.
ELSE:
  set batch_strategy = "single_pass"

AUDIT PHASE 5 — BUILD CONCEPT COVERAGE PLAN:
List every distinct concept from the audit that must be covered. Assign each a card_type. This is your generation roadmap — you check items off as you generate each card. Do not return your final output until every item on this list has a corresponding card or you have reached the target_card_count.

Output the full audit as generation_audit in your JSON response.

════════════════════════════════════════════════════════════════
SECTION 3: CARD TYPE DISTRIBUTION AND QUALITY RULES
════════════════════════════════════════════════════════════════

CARD TYPE SYSTEM — every card must have a specific type that determines its structure

CARD TYPE: definition
Question structure: "What is [term]?" or "Define [term]." or "What does [term] mean in the context of [subject]?"
Answer structure: A precise, complete academic definition. Include: what the thing IS, what it DOES or CONSISTS OF, and where/when it applies. Never just a synonym.
When to use: Every academic term that has a specific meaning students must know precisely.
Quality test: Would a student who memorised this answer be able to correctly use the term in an exam question? If no, the answer is incomplete.

CARD TYPE: mechanism
Question structure: "How does [process] work?" or "What happens during [process]?" or "Describe the mechanism of [X]." or "What are the steps of [process]?"
Answer structure: A numbered or sequenced explanation. Inputs → process → outputs. Include the key agent/enzyme/factor at each step if applicable.
When to use: Every multi-step process, biological pathway, chemical reaction mechanism, or procedural sequence in the content.
Quality test: If a student read this answer, could they trace the mechanism from start to finish without the source material?

CARD TYPE: cause_effect
Question structure: "What causes [effect]?" or "What is the result of [cause]?" or "Why does [phenomenon] occur?" or "What happens when [condition]?"
Answer structure: State the cause clearly, state the direct effect, explain the mechanism linking them in one sentence.
When to use: Every causal relationship in the content, including indirect ones.
Quality test: Does the answer explain WHY, not just WHAT?

CARD TYPE: comparison
Question structure: "What is the difference between [X] and [Y]?" or "How does [X] differ from [Y]?" or "Compare [X] and [Y]." or "Why is [X] not the same as [Y]?"
Answer structure: The key distinction(s) stated clearly. Use parallel structure: "X does/is [A], while Y does/is [B]." Include at least one distinguishing characteristic that is commonly confused.
When to use: Every pair of concepts in the content that students are likely to confuse.
Quality test: Would a student who read only this card be able to correctly distinguish X from Y on an exam? If not, add the distinguishing detail.

CARD TYPE: formula
Question structure: "What is the formula for [X]?" or "State [rule/equation/law]." or "What does [formula] calculate?"
Answer structure: The formula written in plain text notation (e.g. "F = ma"). Then: what each variable represents, what units are used, and when the formula applies.
When to use: Every formula, equation, rule, or law in the content.
Quality test: Is every variable defined? Are the units stated? Are any conditions on applicability noted?

CARD TYPE: sequence
Question structure: "What are the [stages/phases/steps] of [process] in order?" or "List the [events] of [X] in chronological order."
Answer structure: A numbered list in the correct order. Each item should be a complete phrase, not just a label.
When to use: Every ordered sequence where order matters — biological stages, historical events, procedural steps.
Quality test: Is the order unambiguous? Does each step include enough detail to be distinguishable from adjacent steps?

CARD TYPE: application
Question structure: A scenario-based prompt. "A student observes [X]. What does this indicate?" or "Given [condition], what would you expect to happen to [variable]?" or "Why would a doctor/engineer/economist choose [X] over [Y] in this situation?"
Answer structure: State the answer, then the reasoning — "Because [mechanism], which means [implication]."
When to use: Whenever the content implies that students should be able to apply a concept to a novel situation. Generate these even if the content doesn't explicitly state them — derive them from the mechanisms and definitions.
Quality test: Does this question require understanding, not just recall? Could a student who memorised the definition without understanding it answer this? If yes, make the scenario harder.

CARD TYPE: example
Question structure: "What is [named experiment/study/event] and what did it demonstrate?" or "Who was [person] and what was their contribution to [field]?" or "What happened at [event] and why does it matter?"
Answer structure: Identify the example, explain its mechanism or outcome, state its significance in the broader context.
When to use: Every named experiment, case study, historical event, or real-world example in the content.
Quality test: Does the answer explain significance, not just description?

═══════════════════════════════════════
CARD DISTRIBUTION RULES FOR LARGE SETS
═══════════════════════════════════════
For sets above 20 cards, maintain this distribution to prevent repetition and ensure coverage quality:

Definitions: 25–30% of total
Mechanisms: 20–25% of total
Cause-effect: 15–20% of total
Comparisons: 10–15% of total
Applications: 10–15% of total
Formulas/sequences/examples: as many as the content contains (no artificial ceiling)

NEVER generate more than 3 cards on the exact same concept. If a concept has been covered by 3 cards, move on. Cover a new concept before generating a 4th variant on an existing one.

═══════════════════════════════════════
VARIANT CARD RULES — for when user count exceeds raw content
═══════════════════════════════════════
When requested_count exceeds raw_card_potential, generate variant cards in this priority order:

Priority 1 — APPLICATION VARIANTS: Take any definition or mechanism card and generate a scenario-based application version. "What is X?" becomes "A student observes [consequence of X]. What is happening and why?" These are different cards with different cognitive demands.

Priority 2 — ANGLE VARIANTS: Re-approach a concept from a different question direction. A definition card ("What is osmosis?") gets a cause-effect variant ("What happens to a cell placed in a hypertonic solution, and why?") and a mechanism variant ("Describe the movement of water molecules during osmosis.").

Priority 3 — EXAMINER VARIANTS: Convert a standard question into an examiner-style question. "What is the role of mitochondria?" becomes "Explain why a cell with a higher metabolic rate would be expected to contain more mitochondria. Use your knowledge of mitochondrial function in your answer."

Priority 4 — MISCONCEPTION TRAPS: Generate a card specifically targeting a common misconception about the concept. "True or False: More mitochondria means the cell is larger. Explain your answer." Answer: "False. Mitochondria density relates to energy demand, not cell size."

Label all variant cards with "variant_of": "original_card_id" in your output so the app can track them.

════════════════════════════════════════════════════════════════
SECTION 4: QUIZ QUESTION GENERATION RULES
════════════════════════════════════════════════════════════════

QUIZ QUESTION GENERATION — when output_type includes "quiz" or "exam_questions"

Everything in Sections 1–3 applies to quiz generation. All audit, scaling, contract, and quality rules are identical. The differences are in question format and output structure.

═══════════════════════════════════════
QUIZ QUESTION TYPES AND WHEN TO USE EACH
═══════════════════════════════════════

TYPE: mcq (multiple choice)
Structure: One question stem. Four options (A, B, C, D). One unambiguously correct answer. Three plausible distractors.
Distractor quality rules:
— All three distractors must be plausible misconceptions or close-but-wrong answers, NOT obviously wrong.
— Each distractor must exploit a specific error a student is likely to make.
— "None of the above" and "All of the above" are not acceptable distractors.
— If you cannot generate 3 genuinely plausible distractors, use a different question type.
When to use: Definitions, comparisons, cause-effect relationships, recall of specific facts.

TYPE: short_answer
Structure: A question requiring 2–5 sentences. No options. Student writes their own answer.
When to use: Mechanisms, explanations, cause-effect with reasoning, named examples with significance.

TYPE: long_answer
Structure: A structured question requiring 1–3 paragraphs. Includes command words (Explain, Analyse, Evaluate, Discuss, Compare).
When to use: Evaluation questions, synoptic links between topics, essay-style responses.
Command word rules:
— "State" = list, no explanation needed
— "Describe" = what happens, no mechanism
— "Explain" = what AND why/how
— "Analyse" = break down and examine components
— "Evaluate" = assess strengths AND limitations with conclusion
— "Discuss" = multiple perspectives considered

TYPE: true_false
Structure: A declarative statement that is either true or false. Student selects and must explain why.
When to use: Common misconceptions, edge cases, precise definitions where small wording changes the meaning.
Quality test: Would this question be trivially obvious to a prepared student? If yes, make the statement more subtle.

TYPE: data_response
Structure: A short scenario, dataset, graph description, or passage. Questions follow from the stimulus.
When to use: Application and analysis questions. When the content contains case studies, statistics, or experimental data.

TYPE: fill_the_blank
Structure: A statement with one key term removed. Student completes the statement.
When to use: Formulas, definitions, sequences where precision matters.

═══════════════════════════════════════
QUIZ QUESTION COUNT SCALING
═══════════════════════════════════════
Apply the same audit-derived scaling as flashcards. The ceiling is different:

Quick review: 5–10 questions
Normal study: 10–20 questions
Test prep: 15–25 questions
Exam simulator (user-specified): exactly the specified number, no exceptions
Detailed mastery: 20–30 questions
Flashcard grind: not applicable (use flashcard type)

For exam simulator calls, the requested_count is always mandatory regardless of content length. The prompt will generate application and scenario questions as variants if the content is exhausted before reaching the requested count.

═══════════════════════════════════════
MARK SCHEME GENERATION RULES
═══════════════════════════════════════
Every quiz question must include a complete mark scheme. Mark schemes must specify:

For MCQ: the correct option letter + a one-sentence explanation of why each distractor is wrong.

For short_answer (up to 4 marks):
"Award 1 mark for [specific point]. Award 1 mark for [specific point]." etc.
Never: "Award marks for mentioning X" — state exactly what earns each mark.

For long_answer (5+ marks):
Provide a mark band descriptor:
Level 3 (5–6 marks): "Detailed explanation of [mechanism] with accurate terminology. Clear causal link between [A] and [B]. May include [additional insight]."
Level 2 (3–4 marks): "Correct explanation of [mechanism] but may lack precision or miss [specific point]."
Level 1 (1–2 marks): "Some relevant knowledge but explanation is incomplete or contains inaccuracies."
Also provide: a list of the specific terms that MUST appear for full marks.

For true_false: "Award 1 mark for correct true/false selection. Award 1 further mark for a correct explanation that references [specific mechanism/definition]."

═══════════════════════════════════════
EXAM QUESTION DIFFICULTY DISTRIBUTION
═══════════════════════════════════════
For sets of 10+ questions, distribute difficulty as follows (adjust to level):

GCSE level:
— 40% straightforward recall (grade 4–5 accessible)
— 35% comprehension and explanation (grade 5–6)
— 25% application and analysis (grade 7–9)

A-Level:
— 25% recall and comprehension
— 40% application and analysis
— 35% evaluation and synthesis

University:
— 20% recall
— 30% application
— 50% analysis, evaluation, critical synthesis

For test_prep mode at any level: shift 10% from recall toward the highest cognitive level.

════════════════════════════════════════════════════════════════
SECTION 5: FULL INPUT AND OUTPUT SCHEMA
════════════════════════════════════════════════════════════════

COMPLETE INPUT SCHEMA — you receive this JSON object

{
  "output_type": "flashcards | quiz | both | exam_questions",
  "raw_content": "string — the full content to generate from. NEVER assume this has been truncated. Process the entire string.",
  "audit_data": { ... optional — full Lesson Architect audit if available. If present, use concept_hierarchy and misconception_map to inform generation. Do not re-audit if audit_data is present. },
  "subject": "string",
  "level": "gcse | a_level | university | professional",
  "mode": "quick_review | fast_revision | normal_study | detailed_mastery | flashcard_grind | test_prep | eli5",
  "word_count": number (pre-calculated by the app),

  "count_config": {
    "requested_count": number | null,
    "count_is_mandatory": true | false,
    "requested_range_min": number | null,
    "requested_range_max": number | null,
    "count_source": "user_explicit | user_range | system_calculated | mode_default"
  },

  "batch_config": {
    "batch_mode": true | false,
    "batch_number": number (1-indexed, which batch this call is),
    "total_batches": number,
    "concepts_already_covered": ["string — concept names covered in previous batches. Do NOT generate cards for these."],
    "cards_generated_so_far": number
  },

  "student_context": {
    "weak_topics": ["string"],
    "strong_topics": ["string"],
    "existing_card_fronts": ["string — fronts of cards already in the student's deck. Do NOT duplicate these."]
  },

  "quality_config": {
    "include_memory_hooks": true | false,
    "include_hints": true | false,
    "include_common_wrong_answers": true | false,
    "include_examiner_tips": true | false,
    "sm2_initial_values": true | false
  }
}

════════════════════════════════════════════════════════════════
SECTION 6: ENFORCEMENT RULES AND FAILURE CONDITIONS
════════════════════════════════════════════════════════════════

ENFORCEMENT RULES — these are not guidelines. They are generation laws.

LAW 1 — THE COUNT CONTRACT IS ABSOLUTE
LAW 2 — THE AUDIT MUST PRECEDE GENERATION
LAW 3 — EXISTING CARDS ARE NEVER DUPLICATED
LAW 4 — BATCH ISOLATION IS MANDATORY
LAW 5 — CARD QUALITY CANNOT DEGRADE WITH VOLUME
LAW 6 — THE GAP CHECK IS NON-NEGOTIABLE
LAW 7 — WEAK TOPIC PRIORITISATION
`;

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
  // Usage tracking
  const user = auth.currentUser;
  if (user) {
    const isAllowed = await checkAndIncrementUsage(user.uid);
    if (!isAllowed) {
      throw new Error("You have exceeded your daily generation limit. Please try again tomorrow.");
    }
  }

  const ai = getAI();
  const wordCount = text.split(/\s+/).length;
  
  // Cache check
  const cacheKey = `study_mat_${hashString(text + title + instructions + quantity + difficulty + mode + level + subject)}`;
  const cached = await get(cacheKey);
  if (cached) {
    console.log(`Using cached study material for ${title}`);
    return cached as { deck: Deck; quiz: Quiz; lesson?: LessonArchitectAudit };
  }

  // Update progress
  onProgress?.('auditing', 'Performing Deep Semantic Audit...');

  const inputPayload = {
    raw_content: text,
    youtube_url: youtubeUrl,
    count_config: {
      requested_count: quantity,
      count_is_mandatory: isCountMandatory,
      count_source: isCountMandatory ? "user_explicit" : "system_calculated"
    },
    subject,
    level,
    mode: "normal_study", // default mode
    word_count: wordCount
  };

  const generateAudit = async () => {
    console.log(`AI Request Sent - Semantic Audit for ${title}...`);
    const effectiveYoutubeUrl = isAdmin ? youtubeUrl : undefined;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `INPUT PAYLOAD: ${JSON.stringify(inputPayload)}\n\nUSER INSTRUCTIONS: ${instructions}\nWORD_COUNT: ${wordCount}`,
        config: {
          tools: effectiveYoutubeUrl ? [{ googleSearch: {} }] : undefined,
          systemInstruction: `You are the Study Forge Lesson Architect. 
- You MUST perform a Deep Semantic Audit of the material.
- Identify the Central Thesis and every distinct testable concept.
- ALWAYS generate both a comprehensive flashcard deck AND a full quiz covering the material.
- ENSURE all generated content is highly relevant to exams (at least 8/10 test relevance).
- Name all generated content simply, based on the subject matter (e.g., "Biology - Cell Structure" instead of complex or placeholder names).`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              audit_metadata: { 
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  subject: { type: Type.STRING },
                  level_detected: { type: Type.STRING },
                  content_type: { type: Type.STRING },
                  word_count: { type: Type.NUMBER },
                  academic_density_score: { type: Type.NUMBER },
                  exam_relevance_score: { type: Type.NUMBER },
                  estimated_mastery_hours: { type: Type.NUMBER },
                  prerequisite_knowledge: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["title", "subject", "level_detected", "content_type", "word_count", "academic_density_score", "exam_relevance_score", "estimated_mastery_hours", "prerequisite_knowledge"]
              },
              semantic_map: { 
                type: Type.OBJECT,
                properties: {
                  central_thesis: { type: Type.STRING },
                  causal_chains: {
                    type: Type.ARRAY,
                    items: { 
                      type: Type.OBJECT,
                      properties: {
                        chain_id: { type: Type.STRING },
                        chain_name: { type: Type.STRING },
                        steps: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              concept: { type: Type.STRING },
                              causes: { type: Type.STRING },
                              evidence: { type: Type.STRING }
                            }
                          }
                        }
                      }
                    }
                  },
                  concept_hierarchy: { type: Type.ARRAY, items: { type: Type.OBJECT } }
                },
                required: ["central_thesis", "causal_chains", "concept_hierarchy"]
              },
              misconception_map: { type: Type.ARRAY, items: { type: Type.OBJECT } },
              forgecast_brief: { type: Type.OBJECT },
              forgechat_context_block: { type: Type.STRING },
              mode_routing: { type: Type.OBJECT }
            }
          }
        }
      });
      const data = JSON.parse(response.text || '{}');
      onProgress?.('auditing', 'Audit Complete.');
      return data;
    } catch (auditError) {
      console.warn("Semantic Audit failed, using fallback:", auditError);
      return {
        audit_metadata: { title, subject, level_detected: level, content_type: 'text', word_count: wordCount, academic_density_score: 5, exam_relevance_score: 5, estimated_mastery_hours: 1, prerequisite_knowledge: [] },
        semantic_map: { central_thesis: 'Main theme.', causal_chains: [], concept_hierarchy: [] },
        misconception_map: [],
        forgecast_brief: { hook_premise: 'Hook.', core_technical_points: [], best_analogy_candidates: [], summary_statement: 'Summary.' },
        forgechat_context_block: text.substring(0, 500),
        mode_routing: { normal_study_card_ids: [], quick_review_card_ids: [], detailed_mastery_card_ids: [], test_prep_question_ids: [], eli5_concept_ids: [] }
      };
    }
  };

  const generateMaterials = async (auditData?: any) => {
    onProgress?.('cards', 'Forging exhaustive material deck...');
    console.log(`AI Request Sent - Exhaustive Material Extraction for ${title}...`);
    
    // Determine target model
    const preferredModel = wordCount > 2000 ? "gemini-2.5-pro" : "gemini-2.5-flash"; 
    // AI Studio uses gemini-2.5-flash as the top model, but if user suggested 1.5-pro for long content, I should respect that if I have it. 
    // In this env gemini-2.5-flash is the standard top tier model.

    const materialInstruction = `${STUDY_FORGE_GENERATOR_PROMPT}

USER INSTRUCTIONS: ${instructions}
TARGET CARD COUNT: ${quantity} (MANDATORY)

Execute the density audit first, then generate exactly the target count. Priority is exhaustive coverage.`;

    try {
      const resp = await ai.models.generateContent({
        model: preferredModel,
        contents: `INPUT PAYLOAD: ${JSON.stringify({ ...inputPayload, audit_data: auditData })}\n\nCONTENT: ${text}`,
        config: {
          systemInstruction: materialInstruction,
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              generation_audit: { 
                type: Type.OBJECT,
                properties: {
                  word_count_processed: { type: Type.NUMBER },
                  definition_count: { type: Type.NUMBER },
                  mechanism_count: { type: Type.NUMBER },
                  cause_effect_count: { type: Type.NUMBER },
                  comparison_count: { type: Type.NUMBER },
                  formula_count: { type: Type.NUMBER },
                  sequence_count: { type: Type.NUMBER },
                  example_count: { type: Type.NUMBER },
                  application_count: { type: Type.NUMBER },
                  raw_card_potential: { type: Type.NUMBER },
                  target_card_count: { type: Type.NUMBER },
                  target_derivation: { type: Type.STRING },
                  batch_strategy: { type: Type.STRING },
                  mode_applied: { type: Type.STRING },
                  concepts_coverage_plan: { type: Type.ARRAY, items: { type: Type.STRING } },
                  self_verification_passed: { type: Type.BOOLEAN },
                  gap_check_result: { type: Type.STRING }
                },
                required: ["word_count_processed", "raw_card_potential", "target_card_count", "self_verification_passed"]
              },
              memory_layer: {
                type: Type.OBJECT,
                properties: {
                  flashcard_deck: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        card_id: { type: Type.STRING },
                        front: { type: Type.STRING },
                        back: { type: Type.STRING },
                        explanation: { type: Type.STRING },
                        card_type: { type: Type.STRING },
                        difficulty: { type: Type.STRING },
                        tier: { type: Type.NUMBER },
                        topic_tag: { type: Type.STRING },
                        memory_hook: { type: Type.STRING },
                        hint: { type: Type.STRING },
                        common_wrong_answer: { type: Type.STRING },
                        why_wrong_answer_is_wrong: { type: Type.STRING },
                        sm2_initial_ease_factor: { type: Type.NUMBER },
                        sm2_initial_interval_days: { type: Type.NUMBER }
                      },
                      required: ["card_id", "front", "back", "explanation", "card_type", "difficulty", "tier", "topic_tag", "memory_hook", "hint", "sm2_initial_ease_factor", "sm2_initial_interval_days"]
                    }
                  },
                  total_cards: { type: Type.NUMBER }
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
                        question_id: { type: Type.STRING },
                        question: { type: Type.STRING },
                        type: { type: Type.STRING },
                        marks: { type: Type.NUMBER },
                        difficulty: { type: Type.STRING },
                        topic_tag: { type: Type.STRING },
                        correct_answer: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        mark_scheme: { type: Type.STRING }
                      }
                    }
                  }
                }
              },
              generation_summary: { 
                type: Type.OBJECT,
                properties: {
                  total_flashcards_generated: { type: Type.NUMBER },
                  total_quiz_questions_generated: { type: Type.NUMBER },
                  target_was_met: { type: Type.BOOLEAN },
                  shortfall: { type: Type.NUMBER },
                  shortfall_reason: { type: Type.STRING },
                  variant_cards_generated: { type: Type.NUMBER }
                },
                required: ["total_flashcards_generated", "target_was_met"]
              }
            },
            required: ["generation_audit", "memory_layer", "generation_summary"]
          }
        }
      });

      const data = JSON.parse(resp.text || '{}');
      return data;
    } catch (err) {
      console.error("Exhaustive generation failed:", err);
      return { memory_layer: { flashcard_deck: [] }, application_layer: { exam_questions: [] } };
    }
  };

  try {
    // Run audit first to get density info, then materials. 
    // Although parallel is faster, user's request for "density audit BEFORE generating" 
    // and "fixing low counts" suggests serialized is safer for quality.
    const audit = await generateAudit();
    const materials = await generateMaterials(audit);

    onProgress?.('finalizing', 'Finalizing materials...');

    const lesson: LessonArchitectAudit = {
      ...audit,
      ...materials,
      id: generateId(),
      createdAt: Date.now()
    };

    // Map to Deck
    const flashcards = (lesson.memory_layer?.flashcard_deck || []).map((f: any) => ({
      id: generateId(),
      term: f.front,
      definition: f.back,
      explanation: f.explanation || f.why_wrong_answer_is_wrong || f.hint,
      imagePrompt: f.front,
      imageUrl: undefined,
      interval: f.sm2_initial_interval_days || 0,
      ease: f.sm2_initial_ease_factor || 2.5,
      nextReviewDate: Date.now() + (f.sm2_initial_interval_days || 0) * 24 * 60 * 60 * 1000,
      cardType: (f.card_type || 'definition') as any,
      topicTag: f.topic_tag || 'General',
      memoryHook: f.memory_hook
    }));

    const deck: Deck = {
      id: generateId(),
      title: lesson.audit_metadata?.title || title,
      cards: flashcards,
      createdAt: Date.now()
    };

    // Map to Quiz
    const quiz: Quiz = {
      id: generateId(),
      title: lesson.audit_metadata?.title || title,
      questions: (lesson.application_layer?.exam_questions || []).map((q: any) => ({
        id: generateId(),
        question: q.question,
        type: (q.type || 'mcq') as any,
        options: q.options || [],
        correctAnswer: q.type === 'mcq' ? (q.options || []).findIndex((opt: string) => q.correct_answer && opt.startsWith(q.correct_answer.charAt(0))) : undefined,
        correctAnswerText: q.type !== 'mcq' ? q.correct_answer : undefined,
        explanation: q.mark_scheme || q.examiner_note,
        marks: q.marks || 1,
        markingCriteria: q.mark_scheme
      })),
      isAIGraded: true
    };

    const result = { deck, quiz, lesson };
    await set(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    throw new Error("Unable to generate this content. Please try again.");
  }
}

/**
 * Study Forge Mode Engine: Renders a lesson into a specific study mode experience.
 */
export async function generateModeSession(
  auditData: LessonArchitectAudit,
  selectedMode: StudyMode,
  studentContext: {
    name: string;
    level: string;
    weak_topics: string[];
    current_streak: number;
    session_goal?: string;
  }
): Promise<ModeEngineSession> {
  const ai = getAI();
  console.log(`AI Request Sent - Structuring Mode Engine session: ${selectedMode} for ${auditData.audit_metadata.title}...`);

  // SPEED OPTIMIZATION: Filter the auditData to only send what's relevant to the selected mode.
  // This drastically reduces input tokens for large lessons.
  let relevantCardIds: string[] = [];
  let relevantQuestionIds: string[] = [];

  if (selectedMode === 'test_prep') {
    relevantQuestionIds = auditData.mode_routing?.test_prep_question_ids || [];
    relevantCardIds = (auditData.memory_layer?.flashcard_deck || [])
      .filter(c => c.tier === 1 || c.difficulty === 'hard')
      .map(c => c.card_id);
  } else if (selectedMode === 'eli5') {
    relevantCardIds = auditData.mode_routing?.eli5_concept_ids || [];
  } else {
    const key = `${selectedMode}_card_ids` as keyof typeof auditData.mode_routing;
    relevantCardIds = auditData.mode_routing?.[key] || [];
  }

  const flashcards = (auditData.memory_layer?.flashcard_deck || []).filter(c => 
    relevantCardIds.includes(c.card_id) || selectedMode === 'detailed_mastery'
  );

  const questions = (auditData.application_layer?.exam_questions || []).filter(q => 
    selectedMode === 'test_prep' ? relevantQuestionIds.includes(q.question_id) : true
  );

  // Create a lean version of the audit for the AI
  const leanAudit = {
    ...auditData,
    memory_layer: {
      ...(auditData.memory_layer || {}),
      flashcard_deck: flashcards
    },
    application_layer: {
      ...(auditData.application_layer || {}),
      exam_questions: questions
    }
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `AUDIT DATA (PRUNED): ${JSON.stringify(leanAudit)}\n\nSELECTED MODE: ${selectedMode}\nSTUDENT CONTEXT: ${JSON.stringify(studentContext)}`,
    config: {
      temperature: 0,
      systemInstruction: `You are the Study Forge Mode Engine. You receive the structured output from the Lesson Architect's Semantic Audit and render it into the correct experience for the student's selected learning mode. You do not re-analyse the content — you work entirely from the audit data provided.

MODE RULES:
- normal_study: All tier 1 & 2 cards. Concept map in mode_exclusive_content.
- quick_review: Max 8 cards (tier 1 only). High-yield snapshot in mode_exclusive_content.
- detailed_mastery: All cards (including tier 3). Deep mastery notes (min 500 words) in mode_exclusive_content.
- test_prep: Only challenging/trick questions/cards. Examiner's playbook in mode_exclusive_content.
- eli5: Tier 1 concepts rewritten for a 12-year-old with analogies. The big picture story in mode_exclusive_content.

PERSONALIZATION: Use the student's name (${studentContext.name}) and reference their streak (${studentContext.current_streak}) or context in the opening message.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          session_title: { type: Type.STRING },
          opening_message: { type: Type.STRING },
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
                    question: { type: Type.STRING },
                    type: { type: Type.STRING },
                    marks: { type: Type.NUMBER },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correct_answer: { type: Type.STRING },
                    mark_scheme: { type: Type.STRING }
                  },
                  required: ["question_id", "question", "type", "marks", "correct_answer"]
                } 
              },
              total_questions: { type: Type.NUMBER },
              total_marks: { type: Type.NUMBER },
              estimated_minutes: { type: Type.NUMBER },
              mode_instructions: { type: Type.STRING }
            },
            required: ["questions", "total_questions", "total_marks", "estimated_minutes", "mode_instructions"]
          },
          mode_exclusive_content: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              content: { type: Type.STRING }
            },
            required: ["type", "content"]
          },
          closing_prompt: { type: Type.STRING }
        },
        required: ["session_title", "opening_message", "flashcard_session", "exam_session", "mode_exclusive_content", "closing_prompt"]
      }
    }
  });

  try {
    const session: ModeEngineSession = JSON.parse(response.text || '{}');
    session.id = generateId();
    session.lessonId = auditData.id!;
    session.mode = selectedMode;
    session.createdAt = Date.now();
    return session;
  } catch (error) {
    console.error("Failed to parse Mode Engine response:", error);
    throw new Error("Unable to structure this study session. Please try again.");
  }
}

/**
 * Study Forge SRS Intelligence Layer: Analyzes session performance for patterns and interventions.
 */
export async function analyzeSRSSession(
  studentName: string,
  subject: string,
  sessionData: any,
  fullDeckStats: any
): Promise<SRSIntelligenceAnalysis> {
  const ai = getAI();
  console.log(`AI Request Sent - Performing SRS Intelligence Analysis for ${studentName} on ${subject}...`);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `STUDENT: ${studentName}\nSUBJECT: ${subject}\nSESSION DATA: ${JSON.stringify(sessionData)}\nDECK STATS: ${JSON.stringify(fullDeckStats)}`,
    config: {
      systemInstruction: `You are the Study Forge SRS Intelligence Layer. You work alongside the SM-2 algorithm already running in the app — you do not replace it. Your job is to analyse patterns in a student's card performance that pure mathematics cannot detect, and to take intelligent actions based on those patterns.

The SM-2 algorithm handles the scheduling intervals. You handle the intelligence layer: detecting why cards keep failing, generating better versions of struggling cards, predicting future failures, and keeping the student motivated through the grind of spaced repetition.

OUTPUT PROTOCOLS:
- session_quality = "crisis" ONLY if retention_rate_this_session is under 40%.
- Only generate new cards (max 5) when a specific pattern (like rote_memorisation or concept_confusion) justifies them.
- Memory hooks must be original and specific.
- improved_memory_hooks: only suggest if card has failed 4+ times despite current hook.
- motivational_output: Be honest and specific. NO INFLATION.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          session_analysis: {
            type: Type.OBJECT,
            properties: {
              retention_rate_this_session: { type: Type.NUMBER },
              average_response_time_ms: { type: Type.NUMBER },
              fastest_card_id: { type: Type.STRING },
              slowest_card_id: { type: Type.STRING },
              session_quality: { type: Type.STRING, enum: ["excellent", "good", "average", "poor", "crisis"] },
              session_quality_reason: { type: Type.STRING },
              estimated_next_session_retention: { type: Type.NUMBER },
              cognitive_load_assessment: { type: Type.STRING }
            },
            required: ["retention_rate_this_session", "average_response_time_ms", "fastest_card_id", "slowest_card_id", "session_quality", "session_quality_reason", "estimated_next_session_retention", "cognitive_load_assessment"]
          },
          pattern_detection: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                pattern_type: { type: Type.STRING, enum: ["rote_memorisation", "concept_confusion", "topic_avoidance", "context_dependency", "plateaued_card", "interference_effect"] },
                pattern_name: { type: Type.STRING },
                evidence: { type: Type.STRING },
                explanation: { type: Type.STRING },
                recommended_action: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ["critical", "moderate", "minor"] }
              },
              required: ["pattern_type", "pattern_name", "evidence", "explanation", "recommended_action", "severity"]
            }
          },
          cards_needing_intervention: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                card_id: { type: Type.STRING },
                intervention_type: { type: Type.STRING, enum: ["rewrite_card", "add_memory_hook", "create_sibling_card", "break_into_smaller_cards", "suspend_temporarily", "needs_prerequisite_card"] },
                reason: { type: Type.STRING },
                action_taken: { type: Type.STRING }
              },
              required: ["card_id", "intervention_type", "reason", "action_taken"]
            }
          },
          new_cards_generated: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                card_id: { type: Type.STRING },
                generated_because: { type: Type.STRING },
                generation_strategy: { type: Type.STRING },
                front: { type: Type.STRING },
                back: { type: Type.STRING },
                card_type: { type: Type.STRING },
                difficulty: { type: Type.STRING, enum: ["easy", "medium", "hard"] },
                topic_tag: { type: Type.STRING },
                memory_hook: { type: Type.STRING },
                hint: { type: Type.STRING },
                sm2_initial_ease_factor: { type: Type.NUMBER },
                sm2_initial_interval_days: { type: Type.NUMBER }
              },
              required: ["card_id", "generated_because", "generation_strategy", "front", "back", "card_type", "difficulty", "topic_tag", "memory_hook", "hint", "sm2_initial_ease_factor", "sm2_initial_interval_days"]
            }
          },
          improved_memory_hooks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                card_id: { type: Type.STRING },
                old_hook: { type: Type.STRING },
                new_hook: { type: Type.STRING },
                hook_type: { type: Type.STRING, enum: ["acronym", "story", "visual", "rhyme", "analogy", "shocking_fact", "number_anchor"] },
                why_this_will_work_better: { type: Type.STRING }
              },
              required: ["card_id", "old_hook", "new_hook", "hook_type", "why_this_will_work_better"]
            }
          },
          retention_predictions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                card_id: { type: Type.STRING },
                current_interval_days: { type: Type.NUMBER },
                predicted_retention_at_due_date_percent: { type: Type.NUMBER },
                recommendation: { type: Type.STRING, enum: ["advance", "keep_scheduled", "pull_forward", "suspend"] },
                reasoning: { type: Type.STRING }
              },
              required: ["card_id", "current_interval_days", "predicted_retention_at_due_date_percent", "recommendation", "reasoning"]
            }
          },
          motivational_output: {
            type: Type.OBJECT,
            properties: {
              streak_status: { type: Type.STRING },
              session_achievement: { type: Type.STRING },
              milestone_approaching: { type: Type.STRING },
              honest_assessment: { type: Type.STRING },
              one_thing_to_fix: { type: Type.STRING }
            },
            required: ["streak_status", "honest_assessment", "one_thing_to_fix"]
          }
        },
        required: ["session_analysis", "pattern_detection", "cards_needing_intervention", "new_cards_generated", "improved_memory_hooks", "retention_predictions", "motivational_output"]
      }
    }
  });

  try {
    const analysis: SRSIntelligenceAnalysis = JSON.parse(response.text || '{}');
    analysis.id = generateId();
    analysis.createdAt = Date.now();
    return analysis;
  } catch (error) {
    console.error("Failed to parse SRS Intelligence response:", error);
    throw new Error("Unable to perform Intelligence analysis. Please try again.");
  }
}

export async function generateExamSimulatorAction(
  action: 'generate_exam' | 'forge_revision_plan',
  payload: {
    student_context: any;
    audit_data: LessonArchitectAudit;
    exam_config?: any;
    student_answers?: any[];
    generated_exam?: any;
  }
): Promise<ExamSimulatorOutput | ForgeRevisionPlan> {
  const ai = getAI();
  console.log(`AI Request Sent - Exam Simulator Engine action: ${action}...`);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `INPUT PAYLOAD: ${JSON.stringify({ action, ...payload })}`,
    config: {
      temperature: 0,
      systemInstruction: `You are the Study Forge Exam Simulator and Forge Revision Plan engine. You serve two purposes depending on the action field:

ACTION = "generate_exam": Create a full, realistic exam paper from the student's audit data.
ACTION = "forge_revision_plan": Mark the student's completed exam and generate the Forge Revision Plan.

EXAM GENERATION RULES:
- MCQ distractors must be misconceptions from the audit_data.
- All HIDDEN_ fields must be complete and accurate.
- Authentically reflect the exam_board_style (AQA, Edexcel, OCR, IB, etc.).

FORGE REVISION PLAN RULES:
- Mark the student's answers against the mark schemes in the generated_exam.
- YOU MUST BE ABSOLUTELY ACCURATE IN MARKING. COMPARE THE STUDENT ANSWER AGAINST THE HIDDEN_mark_scheme PROVIDED IN EACH QUESTION OF THE generated_exam.
- ONLY AWARD MARKS IF THE REQUIRED KEY POINTS ARE PRESENT IN THE STUDENT ANSWER.
- BE RIGOROUS. IF AN ANSWER IS INCOMPLETE OR MISSED KEY POINTS, AWARD FEWER MARKS.
- USE THIS DYNAMIC GRADING SCALE:
  A+ = 97–100, A = 93–96, A- = 90–92
  B+ = 87–89, B = 83–86, B- = 80–82
  C+ = 77–79, C = 73–76, C- = 70–72
  D+ = 67–69, D = 63–66, D- = 60–62
  F = Below 60
- Always calculate total_marks dynamically as the sum of all individual question marks, never assume a fixed total.
- crash_course_flashcard_deck: generate ONLY cards targeting concepts the student got wrong.
- Never soften the reality of a poor result. Be honest but provide a clear path forward.`,
      responseMimeType: "application/json",
      responseSchema: action === 'generate_exam' ? {
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
                          type: { type: Type.STRING, enum: ["mcq", "short_answer", "long_answer", "data_response", "calculation", "evaluation"] },
                          marks: { type: Type.NUMBER },
                          question_text: { type: Type.STRING },
                          options: { type: Type.ARRAY, items: { type: Type.STRING } },
                          supporting_material: { type: Type.STRING },
                          topic_tag: { type: Type.STRING },
                          targets_weak_area: { type: Type.BOOLEAN },
                          is_trick_question: { type: Type.BOOLEAN },
                          cognitive_demand: { type: Type.STRING, enum: ["recall", "comprehension", "application", "analysis", "evaluation", "synthesis"] },
                          HIDDEN_correct_answer: { type: Type.STRING },
                          HIDDEN_mark_scheme: { type: Type.STRING },
                          HIDDEN_model_answer: { type: Type.STRING },
                          HIDDEN_common_mistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
                          HIDDEN_examiner_tip: { type: Type.STRING }
                        },
                        required: ["question_id", "type", "marks", "question_text", "topic_tag", "targets_weak_area", "is_trick_question", "cognitive_demand", "HIDDEN_correct_answer", "HIDDEN_mark_scheme", "HIDDEN_model_answer", "HIDDEN_common_mistakes", "HIDDEN_examiner_tip"]
                      }
                    }
                  },
                  required: ["section_id", "section_title", "section_instructions", "marks_available", "time_recommendation_minutes", "questions"]
                }
              },
              difficulty_map: {
                type: Type.OBJECT,
                properties: {
                  accessible_question_ids: { type: Type.ARRAY, items: { type: Type.STRING } },
                  target_question_ids: { type: Type.ARRAY, items: { type: Type.STRING } },
                  stretch_question_ids: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              }
            },
            required: ["exam_id", "title", "level", "exam_board_style", "total_marks", "time_limit_minutes", "difficulty_profile", "instructions", "sections", "difficulty_map"]
          }
        },
        required: ["exam"]
      } : {
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
              performance_tier: { type: Type.STRING, enum: ["distinction", "strong_pass", "borderline", "needs_work", "critical"] }
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
                knowledge_gap_type: { type: Type.STRING, enum: ["factual_gap", "conceptual_misunderstanding", "vocabulary_gap", "application_failure", "trick_missed", "time_pressure_error"] },
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
                    card_type: { type: Type.STRING, enum: ["correction", "clarification", "missing_concept", "vocabulary", "mechanism", "application"] },
                    front: { type: Type.STRING },
                    back: { type: Type.STRING },
                    why_this_card_was_created: { type: Type.STRING },
                    memory_hook: { type: Type.STRING },
                    hint: { type: Type.STRING },
                    difficulty: { type: Type.STRING, enum: ["easy", "medium", "hard"] },
                    urgency: { type: Type.STRING, enum: ["must_know_before_exam", "high_value", "good_to_know"] },
                    sm2_initial_ease_factor: { type: Type.NUMBER },
                    sm2_initial_interval_days: { type: Type.NUMBER }
                  },
                  required: ["card_id", "generated_from_question_id", "card_type", "front", "back", "why_this_card_was_created", "memory_hook", "hint", "difficulty", "urgency", "sm2_initial_ease_factor", "sm2_initial_interval_days"]
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
      }
    }
  });

  try {
    const data = JSON.parse(response.text || '{}');
    if (action === 'forge_revision_plan') {
      data.createdAt = Date.now();
    }
    return data;
  } catch (error) {
    console.error(`Failed to parse Exam Simulator (${action}) response:`, error);
    throw new Error(`Unable to execute ${action}. Please try again.`);
  }
}

export async function generateFlashcardsFromText(text: string, title: string): Promise<Deck> {
  const { deck } = await generateStudyMaterial(text, title, 'Generate exhaustive flashcards', 25, 'medium', 'flashcards', 'gcse', 'General', undefined, undefined, false);
  return deck;
}

/**
 * Enriches a deck with images based on card imagePrompts if they don't have imageUrls yet.
 */
export async function enrichDeckWithImages(deck: Deck): Promise<Deck> {
  const enrichedCards = await Promise.all(
    deck.cards.map(async (card, index) => {
      // Limit to first 10 cards to prevent huge delays
      if (!card.imageUrl && card.imagePrompt && index < 10) {
        const imageUrl = await generateImage(card.imagePrompt);
        return { ...card, imageUrl: imageUrl || undefined };
      }
      return card;
    })
  );
  return { ...deck, cards: enrichedCards };
}

export async function generateQuizFromText(text: string, title: string): Promise<Quiz> {
  const { quiz } = await generateStudyMaterial(text, title, 'Generate exhaustive quiz', 15, 'medium', 'quiz', 'gcse', 'General', undefined, undefined, false);
  return quiz;
}

export async function generateAdaptiveDeck(
  missedCards: Flashcard[],
  topic: string
): Promise<Flashcard[]> {
  const ai = getAI();
  console.log(`AI Request Sent - Generating adaptive reinforcement cards for ${topic}...`);
  
  const cardsData = missedCards.map(c => `Term: ${c.term}\nDefinition: ${c.definition}\nMissed Count: ${c.wrongCount}`).join('\n---\n');

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Topic: ${topic}\n\nMissed Concepts/Cards:\n${cardsData}`,
    config: {
      maxOutputTokens: 4096,
      systemInstruction: `You are the Lead Pedagogical Architect. 
        - Goal: Reinforce weak areas identified by a user's missed flashcards. 
        - Task: Generate NEW, complementary flashcards that approach the missed concepts from different angles (analogies, practical applications, related sub-concepts).
        - Directives: Do not repeat the existing cards exactly. Create "Scaffolding" cards.
        - Quantity: Generate 5-8 highly effective reinforcement cards.
        - Style: High-fidelity visual prompts and logical explanations included.`,
      responseMimeType: "application/json",
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
                explanation: { type: Type.STRING },
                visual_prompt: { type: Type.STRING }
              },
              required: ["front", "back", "explanation", "visual_prompt"]
            }
          }
        },
        required: ["reinforcement_cards"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text || '{}');
    const newCards = await Promise.all(
      (data.reinforcement_cards || []).map(async (f: any) => {
        const imageUrl = await generateImage(f.visual_prompt);
        return {
          id: generateId(),
          term: f.front,
          definition: f.back,
          explanation: f.explanation,
          imagePrompt: f.visual_prompt,
          imageUrl: imageUrl || undefined,
          interval: 0,
          ease: 2.5,
          nextReviewDate: Date.now(),
          wrongCount: 0,
          totalAttempts: 0
        };
      })
    );
    return newCards;
  } catch (error) {
    console.error("Adaptive generation failed:", error);
    return [];
  }
}
export async function generateExam(
  text: string,
  title: string,
  timeLimit: number = 20
): Promise<Quiz> {
  const ai = getAI();
  console.log(`AI Request Sent - Generating formal exam for ${title}...`);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Source Material: ${text}\nTitle: ${title}\nTime Limit: ${timeLimit} minutes`,
    config: {
      maxOutputTokens: 8192,
      systemInstruction: `You are the Lead Psychometrician and Chief Examiner.
        - Goal: Create a high-stakes competitive exam paper.
        - Task: Generate 10-15 rigorous questions.
        - Question Types: Include a mix of Multiple Choice (MCQ), Short Answer, and Long Answer/Evaluation questions.
        - Difficulty: Mix of recall, application, and synthesis (progressive difficulty).
        - Detailed Mark Scheme: Provide clear criteria for marking free-response questions.
        - Logics: Ensure questions cover the entire breadth of the source material.`,
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
                type: { type: Type.STRING, enum: ["mcq", "short_answer", "long_answer"] },
                options: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 4, maxItems: 4 },
                answer: { type: Type.STRING, description: "Correct option index (0-3) for MCQ, or model answer summary for others" },
                explanation: { type: Type.STRING },
                marks: { type: Type.NUMBER },
                marking_criteria: { type: Type.STRING }
              },
              required: ["question", "type", "answer", "explanation", "marks"]
            }
          }
        },
        required: ["exam_questions"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text || '{}');
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
        marks: q.marks,
        markingCriteria: q.marking_criteria
      })),
      isExam: true,
      timeLimit,
      examHistory: [],
      isAIGraded: true
    };
  } catch (error) {
    console.error("Exam generation failed:", error);
    throw new Error("Unable to construct exam paper. Please try again.");
  }
}

/**
 * Study Forge Academic Emporium: Generates actual reward content when students spend Embers.
 * Every item delivers real, high-quality academic value.
 */
export async function generateRewardContent(
  purchase: EmberPurchaseData,
  student: EmberStudentData,
  activeSkin: string = 'Default'
): Promise<EmberRewardResponse> {
  const ai = getAI();
  console.log(`AI Request Sent - Academic Emporium generating: ${purchase.item_id}...`);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `INPUT PAYLOAD: ${JSON.stringify({ 
      item_id: purchase.item_id, 
      student_context: {
        name: student.name,
        level: student.level.toLowerCase().includes('gcse') ? 'gcse' : student.level.toLowerCase().includes('level') ? 'a_level' : 'university',
        subject: student.subject_focus || 'General',
        active_skin: activeSkin
      },
      card_context: {
        card_front: purchase.context?.card_front || '',
        card_back: purchase.context?.card_back || '',
        their_wrong_answer: purchase.context?.their_wrong_answer || '',
        times_failed: purchase.context?.times_failed || 0,
        topic_tag: purchase.context?.topic_tag || purchase.context?.topic || '',
        card_type: purchase.context?.card_type || 'definition'
      }
    })}`,
    config: {
      maxOutputTokens: 4096,
      temperature: 0.4,
      systemInstruction: `You are the Study Forge Academic Emporium content engine. When a student spends Embers on a Tactical Utility item, you generate the actual content they receive. Every item must deliver real, high-quality academic value.
      
      ${activeSkin !== 'Default' ? `ACTIVE CORE SKIN:
      Pyra is currently using the ${activeSkin} skin. Apply the ${activeSkin} teaching style, persona, and analogy palette to the reward content.
      ` : ''}

      ITEM CONTENT RULES:

      item_id = "neural_nudge" (Brain Boost):
      Generate a precision hint that points to the underlying mechanism without revealing the answer. 1-2 sentences. 
      Goal: Activate the correct memory pathway.

      item_id = "temporal_splice" (Smart Fix):
      Analyze a mistake. Explain WHY it was tempting but WRONG. Provide a "Correction Logic" and a "Mastery Tip".
      Focus: Identifying the logical gap in their reasoning.

      item_id = "echo_chamber" (Memory Hooks):
      Generate 3 distinct memory hooks: 1 Mnemonics (Story/Acronym), 1 Analogy (Relatable real-world comparison), and 1 Rhyme or Catchy phrase.

      item_id = "phantom_recall" (Error Scan):
      Examine the failed concept. Identify if it's a 'Recall Gap', 'Conceptual Confusion', or 'Interference'. Provide a specific drill to fix it.

      item_id = "deep_dive" (Step-by-Step Explainer):
      Layered explanation. Tier 1: Literal 5-year-old level. Tier 2: Academic Step-by-Step. Tier 3: Examiner's Secret (why this trips people up).

      item_id = "void_collapse" (Full Reset):
      The "Nuclear Option". Tear down the concept and rebuild it from a radical new angle. 
      1. THE DESTRUCTION: Why your current mental model isn't working.
      2. THE CORE TRUTH: The absolute foundation.
      3. THE RECONSTRUCTION: Building up to the complex detail.

      item_id = "kill_chain" (Mastery Plan):
      Final 5-step sequence to master the topic. 1. Prerequisite check. 2. Conceptual drill. 3. Active recall challenge. 4. Application test. 5. Persistence goal.

      item_id = "memory_palace" (Mind Map):
      Describe a visual map of the topic. Link 4-5 key concepts using spatial relationships. "Center of the map is X, branching into Y because of Z..."

      Respond ONLY with valid JSON:
      {
        "item_id": "string",
        "item_name": "string",
        "ember_cost": number,
        "content": "string (Markdown allowed)",
        "follow_up_action": "string"
      }`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          item_id: { type: Type.STRING },
          item_name: { type: Type.STRING },
          ember_cost: { type: Type.NUMBER },
          content: { type: Type.STRING },
          follow_up_action: { type: Type.STRING }
        },
        required: ["item_id", "item_name", "ember_cost", "content", "follow_up_action"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text || '{}');
    // Map to EmberRewardResponse format
    return {
      reward_delivered: {
        item_id: data.item_id,
        item_name: data.item_name,
        ember_cost: data.ember_cost,
        new_balance: student.current_embers - data.ember_cost,
        delivery_message: `Unlocked: ${data.item_name}`
      },
      reward_content: {
        type: data.item_name,
        content: data.content,
        follow_up_action: data.follow_up_action
      }
    };
  } catch (error) {
    console.error("Failed to parse Reward Content response:", error);
    throw new Error("Unable to generate reward content. Please try again.");
  }
}

/**
 * Study Forge Atmosphere Engine: Generates thematic text and audio intros based on the active theme.
 * Implements the immersive world-building for each theme.
 */
export async function generateAtmosphere(req: AtmosphereRequest): Promise<AtmosphereResponse> {
  const ai = getAI();
  console.log(`AI Request Sent - Atmosphere Engine triggering: ${req.trigger} for ${req.active_theme}...`);

  const cacheKey = `atmosphere_${hashString(req.active_theme + req.trigger + req.student_name + (req.subject_context || ''))}`;
  const cached = await get(cacheKey);
  if (cached) {
    return cached as AtmosphereResponse;
  }

  try {
    const response = await withRetries(async () => await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `INPUT PAYLOAD: ${JSON.stringify(req)}`,
      config: {
        temperature: 0.7,
        systemInstruction: `You are the Study Forge atmosphere engine. When a student activates a theme, you generate the thematic text and audio intro that makes the environment feel alive. You create immersive, specific atmospheric content — not generic descriptions.

THEME CONTENT RULES — generate content that matches each theme's world:

theme_id = "void_cartographer":
World: Mapping unknown cognitive territory. Dark, starlit, ink-drawn coastlines.
Voice: Exploratory. Poetic. Language of discovery and uncharted territory.

theme_id = "deep_forge":
World: Ancient forge at the centre of the earth. Blacksmith of knowledge. Heat and pressure.
Voice: Elemental. Patient. Language of craft, heat, transformation.

theme_id = "signal_lost":
World: Deep-space signal analyst receiving transmissions. Decoded fragments. Static vs Clarity.
Voice: Technical. Measured. Language of signal, noise, clarity.

theme_id = "the_library_at_the_end":
World: Infinite library at the end of time. Librarian who has read all.
Voice: Warm. Ancient. Language of discovery, narrative, and deep time.

theme_id = "eigenstate":
World: Quantum superposition. Collapse the wavefunction toward certainty. Observation events.
Voice: Precise. Theoretical. Language of physics, probability, and collapse.

theme_id = "bone_circuit":
World: Biopunk merged tissue and circuit boards. Memory is a biological network being upgraded.
Voice: Clinical. Visceral. Language of bioengineering and neural architecture.

theme_id = "abyssal_current":
World: Deep-sea research station at 4,000m depth. Absolute pressure. Bioluminescence.
Voice: Still. Heavy. Language of pressure, patience, and discovery in darkness.

theme_id = "nebula_pulse":
World: Active stellar nursery. Sessions birth new stars. Growing personal constellations.
Voice: Cosmic. Vast. Language of stellar formation and deep time.

Output Requirements:
- theme_id: repeat the trigger's theme_id.
- session_greeting: 2-3 sentences. Specific to world. Reference student subject.
- ambient_descriptor: One sentence for UI tooltip.
- forgecast_atmosphere_line: One dramatic opening sentence.
- milestone_message: voice-specific milestone recognition.
- session_end_message: thematic closing.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            theme_id: { type: Type.STRING },
            session_greeting: { type: Type.STRING },
            ambient_descriptor: { type: Type.STRING },
            forgecast_atmosphere_line: { type: Type.STRING },
            milestone_message: { type: Type.STRING },
            session_end_message: { type: Type.STRING }
          },
          required: ["theme_id", "session_greeting", "ambient_descriptor", "forgecast_atmosphere_line", "milestone_message", "session_end_message"]
        }
      }
    }));

    const data = JSON.parse(response.text || '{}');
    await set(cacheKey, data);
    return data;
  } catch (error: any) {
    console.error("Atmosphere Engine failed (continuing with default):", error);
    
    // Return graceful fallback so the application doesn't completely blow up
    return {
      theme_id: req.active_theme,
      session_greeting: `Welcome back to the ${req.active_theme?.replace(/_/g, ' ') || 'forge'}. Your session is ready.`,
      ambient_descriptor: "The environment is stable and ready for focus.",
      forgecast_atmosphere_line: "Let the transmission begin.",
      milestone_message: "Your progress is recorded.",
      session_end_message: "Session complete. System entering standby."
    } as AtmosphereResponse;
  }
}
