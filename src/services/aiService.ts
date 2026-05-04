import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { Deck, Quiz, Flashcard, QuizQuestion, ForgeCastBlueprint, ForgeCastChapter } from "../types";

/**
 * Indicates if the AI service has been configured with an API key.
 * Checks both environment variables to ensure compatibility.
 */
export const isAIConfigured = !!(process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY);

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
    aiInstance = new GoogleGenAI({ apiKey });
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
 * Generates an image using gemini-2.5-flash-image based on a prompt.
 */
export async function generateImage(prompt: string): Promise<string | null> {
  try {
    const ai = getAI();
    console.log(`AI Request Sent - Generating image for: ${prompt.substring(0, 50)}...`);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
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
  } catch (error) {
    console.error("Failed to generate image:", error);
    // Fallback to placeholder if native image generation fails/is restricted
    return `https://picsum.photos/seed/${encodeURIComponent(prompt.substring(0, 10))}/800/400`;
  }
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
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: `You are the Lead Pedagogical Architect and "Greatest Teacher" for Study Forge.
        - Persona: Peer-like, supportive, world-class tutor.
        - Strategic Scaffolding: Combine expert clarity with analogies from Engineering, Programming, or Sports.
        - Strict Subject Protocol: Stay exclusively on the user's topic. No math/science in history unless vital.
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
      id: crypto.randomUUID(),
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
    model: "gemini-3-flash-preview",
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
  fileContent?: string
): Promise<string> {
  try {
    const ai = getAI();
    
    const systemPrompt = `You are the Lead Academic Oracle for Study Forge. You are the "Greatest Teacher".
 
 CORE DIRECTIVES:
 1. Content Extraction & Semantic Audit: Identify unique "Knowledge Units" (KUs).
 2. UI NAVIGATION: Redirect users by including [[ACTION:NAVIGATE:viewName]] anywhere in your response. Views: dashboard, planner, timer, flashcards, quiz, match, forgeCast.
 3. STATE MODIFICATION (CRITICAL): 
    - To CREATE/SAVE a new study set, use: [[ACTION:SAVE_DECK:{"title": "...", "cards": [...]}]].
    - To ADD new items to existing, use: [[ACTION:ADD_TO_DECK:{"title": "...", "cards": [...]}]].
    - To ADD questions to quiz, use: [[ACTION:ADD_TO_QUIZ:{"title": "...", "questions": [...]}]].
    - To REPLACE/EDIT, use: [[ACTION:EDIT_DECK:{...}]] or [[ACTION:EDIT_QUIZ:{...}]].
 4. Removing Barriers: Show the 'Why' using analogies from Programming, Engineering, or Sports.
 
 CRITICAL PROTOCOL:
 - You MUST use the [[ACTION:COMMAND:JSON]] format for all data operations.
 - The JSON must be MINIFIED and strictly valid. No trailing commas.
 - If a user says "create cards about X", you should:
   1. Explain the concepts.
   2. Use [[ACTION:SAVE_DECK:{"title": "X", "cards": [...]}]].
   3. Use [[ACTION:NAVIGATE:flashcards]].
 - NEVER use "Open Lab:" or other arbitrary text for commands. Use the [[ACTION:...]] tags.
 
 ${fileContent ? `Context: ${fileContent}` : ''}`;

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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
        systemInstruction: systemPrompt
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
- sampleFlashcards: A set of 3 sample flashcards (Front: [Question], Back: [Detailed Answer]).

Text to analyze:
${text}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: `You are the Lead Pedagogical Architect. Your goal is to move users to mastery.
        - Persona: Peer-like, supportive tutor. Explain the 'Why' using analogies from Programming, Engineering, or Sports.
        - Strategic Scaffolding: Perform a Semantic Audit of the input to identify unique Knowledge Units (KUs).
        - Strict Subject Adherence: Only output content relevant to the specific subject/topic. 
        - Multi-Modal Structure: Every lesson must follow: [Logic/Mental Model] -> [Active Practice] -> [Roadmap].`,
      responseMimeType: "application/json",
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
                back: { type: Type.STRING }
              },
              required: ["front", "back"]
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

export async function generateStudyMaterial(
  text: string, 
  title: string, 
  instructions: string = '',
  quantity: number = 10, 
  difficulty: string = 'medium',
  mode: 'quiz' | 'flashcards' | 'both' = 'quiz'
): Promise<{ deck: Deck; quiz: Quiz }> {
  const ai = getAI();
  console.log(`AI Request Sent - Generating educational material at ${difficulty} difficulty...`);
  
  const isBoth = mode === 'both' || instructions.toLowerCase().includes('both');
  const finalMode = isBoth ? 'both' : (instructions.toLowerCase().includes('quiz') ? 'quiz' : (instructions.toLowerCase().includes('flashcard') ? 'flashcards' : mode));

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Source Material: ${text}\n\nUser Instructions: ${instructions}`,
    config: {
      systemInstruction: `You are the Lead Pedagogical Architect and "Greatest Teacher".
        - The Semantic Audit Protocol: Analyze the source material and instructions. Identify every unique, standalone "Knowledge Unit" (KU) that must be mastered.
        - Comprehensive Coverage: You MUST ensure total mastery. Generate at least 15 high-quality interactions (Cards or Questions) to cover all essential sub-topics. If the material is dense or expansion is requested, exceed 15-20 items as needed.
        - Expansion Protocol: If the input contains "Previous Context", do not repeat old items. Generate NEW content that expands understanding or dives deeper.
        - Optimal Density (1:1 Ratio): Generate exactly one interaction for every unique KU identified. 
        - Instructions Adherence: Prioritize difficulty requests or specific topic focus.
        - Efficiency & Effectiveness: Eliminate the "hardness" barrier. Show the 'Why'. Provide a logical rationale (explanation field) for every answer.
        - Strategic Scaffolding: Use analogies from Programming (Python logic), Engineering, or Sports to make abstract ideas intuitive.
        - Subject Mastery: Stay strictly focused on the core subject. No outside fluff.
        - Precision: Use LaTeX ($...$) for all math/science variables, formulas, and equations.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          quiz_items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 4, maxItems: 4 },
                answer: { type: Type.INTEGER },
                explanation: { type: Type.STRING }
              },
              required: ["question", "options", "answer", "explanation"]
            }
          },
          flashcard_items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                front: { type: Type.STRING },
                back: { type: Type.STRING },
                explanation: { type: Type.STRING }
              },
              required: ["front", "back", "explanation"]
            }
          }
        },
        required: finalMode === 'both' ? ["quiz_items", "flashcard_items"] : (finalMode === 'quiz' ? ["quiz_items"] : ["flashcard_items"])
      }
    }
  });

  try {
    const data = JSON.parse(response.text || '{}');

    const deck: Deck = {
      id: crypto.randomUUID(),
      title: `Deck: ${title}`,
      cards: (data.flashcard_items || []).map((f: any) => ({
        id: crypto.randomUUID(),
        term: f.front,
        definition: f.back,
        explanation: f.explanation
      }))
    };

    const quiz: Quiz = {
      id: crypto.randomUUID(),
      title: `Quiz: ${title}`,
      questions: (data.quiz_items || []).map((q: any) => ({
        id: crypto.randomUUID(),
        question: q.question,
        options: q.options,
        correctAnswer: q.answer,
        explanation: q.explanation
      }))
    };

    return { deck, quiz };
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    throw new Error("Unable to generate this content. Please try again.");
  }
}

export async function generateFlashcardsFromText(text: string, title: string): Promise<Deck> {
  const { deck } = await generateStudyMaterial(text, title, 'Generate flashcards', 10, 'medium', 'flashcards');
  return deck;
}

export async function generateQuizFromText(text: string, title: string): Promise<Quiz> {
  const { quiz } = await generateStudyMaterial(text, title, 'Generate quiz', 10, 'medium', 'quiz');
  return quiz;
}
