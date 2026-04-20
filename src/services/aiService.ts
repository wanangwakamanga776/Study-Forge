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
  console.log(`AI Request Sent - Forging ForgeCast for ${topic}...`);

  const prompt = `You are the "ForgeCast" Cinematic Engine. Transform the following text into a structured 5-scene video blueprint.
    
    Operational Protocol:
    - Pedagogy: Break the topic into 5 "Scenes" that build logically.
    - Visual Aesthetic: Use high-fidelity, cinematic, and professional descriptors.
    - Narration: Concise, rhythmic, and professional.
    - Overlays: Use $LaTeX$ for all mathematical notation.

    Text:
    ${text}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: "You are the ForgeCast Cinematic Engine specialized in JSON output.",
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
    throw new Error("The Forge failed to smelt this ForgeCast. Please try again.");
  }
}

export async function generateForgeCastFromChat(
  input: string,
  fileContent?: string
): Promise<any> {
  const ai = getAI();
  console.log(`AI Request Sent - Forging ForgeCast from chat...`);

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `User Input: ${input}\n${fileContent ? `File Content: ${fileContent}` : ''}`,
    config: {
      systemInstruction: "You are the ForgeCast Cinematic Agent. Transform input into a structured 5-scene JSON blueprint. Use industrial metaphors.",
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
                on_screen_latex: { type: Type.STRING },
                duration_seconds: { type: Type.NUMBER }
              },
              required: ["id", "label", "narration", "visual_prompt", "on_screen_latex", "duration_seconds"]
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
    throw new Error("The Forge Agent failed to smelt this request. Please try again.");
  }
}

export async function chatWithMasterSmith(
  message: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  fileContent?: string
): Promise<string> {
  try {
    const ai = getAI();
    
    const systemPrompt = `You are the "Master Smith" of Study Forge. 
    Personality: Encouraging, expert, industrial, and highly professional. You speak like a weathered master of the craft who sees learning as "smelting knowledge" and "forging the mind."
    Core Values: Detail-oriented explanations, exam-focused advice.
    Style: Industrial metaphors (heat, metal, hammers, anvils, smelting).
    
    ${fileContent ? `Context from User's Blueprint: ${fileContent}` : ''}
    
    Keep responses concise. Use markdown.`;

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

    return response.text || "The Forge is silent. Perhaps try another query, apprentice.";
  } catch (error) {
    console.error("Master Smith Chat Error:", error);
    if (error instanceof Error && error.message.includes("AI_SETUP_REQUIRED")) {
      throw error;
    }
    throw new Error("The Forge is cooling. I cannot answer right now, apprentice. Check your connection.");
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
  console.log(`AI Request Sent - Forging ${quantity} ${mode} at ${difficulty} difficulty...`);
  
  const isBoth = mode === 'both';
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Text: ${text}`,
    config: {
      systemInstruction: `You are the "Master Smith" of Focus Forge. Smelt the text into ${quantity} ${mode} items at ${difficulty} difficulty.`,
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
      title: `Blueprint: ${title}`,
      cards: (data.flashcard_items || []).map((f: any) => ({
        id: crypto.randomUUID(),
        term: f.front,
        definition: f.back
      }))
    };

    const quiz: Quiz = {
      id: crypto.randomUUID(),
      title: `Smelter: ${title}`,
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
    throw new Error("The Forge failed to smelt this content. Please try again.");
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
