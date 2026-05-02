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

  const prompt = `You are an Advanced Academic Assistant. Transform the following text into a structured 5-scene educational video blueprint.
    
    Operational Protocol:
    - Pedagogy: Break the topic into 5 scenes that follow a logical educational sequence (e.g., introduction, conceptual breakdown, examples, cycle/flow, summary).
    - Accuracy: Use curriculum-appropriate scientific or mathematical symbols.
    - Focus: Maintain strict thematic adherence. If the topic is Geography, do not include math or history unless absolutely vital to the concept.
    - Visual Logic: Define literal and educational visual prompts for image generation.
    - Narration: Clear, professional, and supportive educational tone.
    - Overlay Logic: 
      * 'text' array: Use for 1-3 key conceptual headers or titles in the scene.
      * 'latex_formula': ONLY use for actual mathematical or scientific equations (e.g., E = mc^2). Leave EMPTY if the scene is textual or historical (e.g., Triple Entente). NEVER use \text{} wrappers for simple titles.
    - Response Structure: Structured Markdown within the narration or description if applicable. Use $LaTeX$ ($...$) for all mathematical or scientific notation.

    Text:
    ${text}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: `You are the Lead Academic Video Engine for Study Forge. Follow Elite Tutor protocols:
        - Strict Thematic Focus: Stay exclusively on the user's subject. If the topic is History, refrain from using math/science unless strictly required.
        - Pedagogy: Logical scaffolded sequence (Simple -> Complex -> Application).
        - Mathematical Precision: Use LaTeX ($...$) for every mathematical variable, equation, or chemical formula.
        - Tone: Professional, clear, and supportive. No blacksmithing metaphors.`,
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
      systemInstruction: `You are the Lead Academic Content Assistant. Follow Elite Tutor protocols:
        - Persona: Highly intelligent, logical, and pedagogically sound tutor.
        - Strict Subject Adherence: Only output content relevant to the specific subject/topic. Avoid math/science in history/geography and vice versa unless absolutely required.
        - Action: Transform input into a structured 5-scene teaching sequence.
        - Precision: Use LaTeX ($...$) for ALL math/science notation.
        - Rules: No blacksmithing metaphors. Overlay latex_formula field ONLY for raw equations.`,
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
    
    const systemPrompt = `You are the Lead Academic Assistant for Study Forge. You are a world-class tutor (ChatGPT/Claude tier) for 10th-grade students. You are professional, insightful, and clear. NEVER use roleplay gimmicks like "Blacksmith," "Furnace," or "Smelting."

STRICT SUBJECT PROTOCOL:
- You must refrain from including topics that are not part of the user's requested subject. 
- Example: If the user is talking about geography, refrain from math equations or scientific expressions unless totally required.
- Example: If the user is talking about history, do not introduce math/science topics unless vital for context.
- Keep your output focused exclusively on the subject of instruction.

FUNCTIONAL COMMAND CENTER (Tool Logic):
When a user expresses intent, you must provide the data and signal the UI.

1. Flashcards: If a user says "Make me flashcards on [Topic]," skip the lecture. Generate a clean list (Front | Back) immediately and provide the [[DATA:FLASHCARDS:...]] payload.
2. Lesson Generator: When users paste raw text or ask for an analysis, analyze it and extract key definitions, summaries, and a "Study Sheet."
3. Navigation: At the end of a task, suggest the next section using one of these tags: [OPEN_PLANNER], [OPEN_VAULT], or [OPEN_FORGECAST].

FORMATTING & TUTOR PROTOCOLS:
- Human-Readable Math: For science/math, use Standard Text Notation (e.g., U-235, H2O, x^2) unless the user explicitly asks for LaTeX. Avoid "code-heavy" math that humans can't read.
- Socratic Method: If asked a question, don't just give the answer. Provide a hint + a "Knowledge Check" question to help them learn.
- Visuals: Use Markdown tables for all comparisons. Use bolding for key terms.

DATA TAGS:
1. Flashcards: [[DATA:FLASHCARDS:{"title": "Topic", "cards": [{"term": "T", "definition": "D"}]}]]
2. Quiz: [[DATA:QUIZ:{"title": "Topic", "questions": [{"question": "Q", "options": ["A","B","C","D"], "correctAnswer": 0}]}]]

Example Flow:
User: "Make 3 cards about Mitochondria."
AI: "I've generated 3 cards on the Mitochondria for your library.
| Front | Back |
|---|---|
| Mitochondria | The cell structure responsible for energy production (ATP). |
...
[[DATA:FLASHCARDS:{"title": "Mitochondria", "cards": [{"term": "Mitochondria", "definition": "The cell structure responsible for energy production (ATP)."}]}]].
[OPEN_VAULT]"

${fileContent ? `Context from User's Uploaded Material: ${fileContent}` : ''}`;

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
      systemInstruction: "You are an Academic Content Parser. Output ONLY valid JSON. Use high-fidelity LaTeX ($...$) for ALL scientific terms, isotopes, and equations now that Study Forge has full KaTeX rendering enabled.",
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
  quantity: number = 10, 
  difficulty: string = 'medium',
  mode: 'quiz' | 'flashcards' | 'both' = 'quiz'
): Promise<{ deck: Deck; quiz: Quiz }> {
  const ai = getAI();
  console.log(`AI Request Sent - Generating ${quantity} educational ${mode} items at ${difficulty} difficulty...`);
  
  const isBoth = mode === 'both';
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Text: ${text}`,
    config: {
      systemInstruction: `You are the Lead Academic Content Architect. Follow Elite Tutor protocols:
        - Goal: Create ${quantity} world-class ${mode} items at ${difficulty} difficulty.
        - THEMATIC FOCUS: Only generate questions, terms, and explanations that are strictly relevant to the subject of the text provided. Refrain from introducing outside subjects unless absolutely required.
        - Mathematical Precision: Use high-fidelity LaTeX ($...$) for ALL variables, equations, and isotopes to leverage Study Forge's new rendering engine.
        - Quality: Ensure high pedagogical value.`,
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
                answer: { type: Type.INTEGER }
              },
              required: ["question", "options", "answer"]
            }
          },
          flashcard_items: {
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
        required: isBoth ? ["quiz_items", "flashcard_items"] : (mode === 'quiz' ? ["quiz_items"] : ["flashcard_items"])
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
        definition: f.back
      }))
    };

    const quiz: Quiz = {
      id: crypto.randomUUID(),
      title: `Quiz: ${title}`,
      questions: (data.quiz_items || []).map((q: any) => ({
        id: crypto.randomUUID(),
        question: q.question,
        options: q.options,
        correctAnswer: q.answer
      }))
    };

    return { deck, quiz };
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    throw new Error("Unable to generate this content. Please try again.");
  }
}

export async function generateFlashcardsFromText(text: string, title: string): Promise<Deck> {
  const { deck } = await generateStudyMaterial(text, title, 10, 'medium', 'flashcards');
  return deck;
}

export async function generateQuizFromText(text: string, title: string): Promise<Quiz> {
  const { quiz } = await generateStudyMaterial(text, title, 10, 'medium', 'quiz');
  return quiz;
}
