import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { Deck, Quiz, Flashcard, QuizQuestion, ForgeCastBlueprint, ForgeCastChapter } from "../types";

const ai = new GoogleGenAI({ 
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' 
});

/**
 * Cleans text from AI responses, removing markdown code blocks and other artifacts.
 */
function cleanText(text: string): string {
  if (!text) return "";
  // Remove markdown code blocks
  let cleaned = text.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "");
  // Remove leading/trailing whitespace
  cleaned = cleaned.trim();
  return cleaned;
}

/**
 * Generates an image using gemini-2.5-flash-image based on a prompt.
 */
export async function generateImage(prompt: string): Promise<string | null> {
  try {
    console.log(`AI Request Sent - Generating image for: ${prompt.substring(0, 50)}...`);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [{ text: prompt }]
      },
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
    return null;
  }
}

export interface GeneratedStudyMaterial {
  // ... existing interface ...
}

export async function generateForgeCast(
  text: string,
  topic: string
): Promise<ForgeCastBlueprint> {
  console.log(`AI Request Sent - Forging ForgeCast for ${topic}...`);

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are the "ForgeCast" Cinematic Engine. Your goal is to transform the following educational text into a high-production, step-by-step AI video blueprint.
    
    Operational Protocol:
    - Pedagogy: Break the topic into 5 "Scenes" that build logically.
    - Visual Aesthetic: Use high-fidelity, cinematic, and professional descriptors (e.g., "Macro 3D," "Volumetric lighting," "Minimalist motion graphics").
    - Narration: Concise, rhythmic, and professional. Use [pause] for timing.
    - Overlays: Use $LaTeX$ for all mathematical and scientific notation.

    Text:
    ${text}`,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
                transition: { type: Type.STRING, enum: ["fade", "zoom", "slide"] }
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
    const data = JSON.parse(cleanText(response.text || '{}'));
    
    // Generate images for each chapter in parallel
    const chaptersWithImages = await Promise.all(
      data.chapters.map(async (chapter: any) => {
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
  console.log(`AI Request Sent - Forging ForgeCast from chat...`);

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are the "ForgeCast" Cinematic Agent. Your goal is to transform the following user input into a structured 5-scene video blueprint.
    
    Operational Parameters:
    - Context Handling: If file content is provided, prioritize its specific data.
    - Visual Style: "The Forge" Aesthetic (Industrial, cinematic lighting, glowing embers, high-contrast, metallic textures).
    - Constraint: Limit narration to 150 words total across all scenes.

    User Input: ${input}
    ${fileContent ? `File Content: ${fileContent}` : ''}`,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
    const data = JSON.parse(cleanText(response.text || '{}'));
    
    // Generate images for each scene in parallel
    const scenesWithImages = await Promise.all(
      data.scenes.map(async (scene: any) => {
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

export async function generateStudyMaterial(
  text: string, 
  title: string, 
  quantity: number = 10, 
  difficulty: string = 'medium',
  mode: 'quiz' | 'flashcards' | 'both' = 'quiz'
): Promise<{ deck: Deck; quiz: Quiz }> {
  console.log(`AI Request Sent - Forging ${quantity} ${mode} at ${difficulty} difficulty...`);
  
  const isBoth = mode === 'both';
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are the "Master Smith" of Focus Forge. Your task is to smelt the following text into high-quality study materials.
${isBoth ? `You must generate BOTH a Multiple Choice Quiz and Flashcards.` : `Mode: ${mode === 'quiz' ? 'Multiple Choice Quiz' : 'Flashcards'}`}

Requirements:
1. Quantity: Exactly ${quantity} items ${isBoth ? 'for EACH category (Quiz and Flashcards)' : ''}.
2. Difficulty: ${difficulty.toUpperCase()}. Adjust the complexity of questions and depth of knowledge required accordingly.
3. Focus: Identify key concepts, definitions, and important facts. Focus only on examinable material.
4. Quality: Questions must be clear, precise, and exam-style. Avoid vague or obvious questions.

Return response strictly in this JSON format:
{
  ${isBoth ? `
  "quiz_items": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "answer": 0
    }
  ],
  "flashcard_items": [
    {
      "front": "...",
      "back": "..."
    }
  ]
  ` : `
  "items": [
    ${mode === 'quiz' ? `
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "answer": 0
    }` : `
    {
      "front": "...",
      "back": "..."
    }`}
  ]
  `}
}

Text:
${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: isBoth ? {
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
            },
            minItems: quantity,
            maxItems: quantity
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
            },
            minItems: quantity,
            maxItems: quantity
          }
        } : {
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: mode === 'quiz' ? {
                question: { type: Type.STRING },
                options: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  minItems: 4,
                  maxItems: 4
                },
                answer: { type: Type.INTEGER }
              } : {
                front: { type: Type.STRING },
                back: { type: Type.STRING }
              },
              required: mode === 'quiz' ? ["question", "options", "answer"] : ["front", "back"]
            },
            minItems: quantity,
            maxItems: quantity
          }
        },
        required: isBoth ? ["quiz_items", "flashcard_items"] : ["items"]
      }
    }
  });

  console.log("AI Response Received");
  
  try {
    const data = JSON.parse(response.text || '{}');
    console.log("JSON Parse Success", data);

    const deck: Deck = {
      id: crypto.randomUUID(),
      title: `Blueprint: ${title}`,
      cards: (isBoth ? data.flashcard_items : (mode === 'flashcards' ? data.items : [])).map((f: any) => ({
        id: crypto.randomUUID(),
        term: f.front,
        definition: f.back
      }))
    };

    const quiz: Quiz = {
      id: crypto.randomUUID(),
      title: `Smelter: ${title}`,
      questions: (isBoth ? data.quiz_items : (mode === 'quiz' ? data.items : [])).map((q: any) => ({
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

// Keep legacy functions for compatibility if needed, but update them to use the new logic or mark as deprecated
export async function generateFlashcardsFromText(text: string, title: string): Promise<Deck> {
  const { deck } = await generateStudyMaterial(text, title);
  return deck;
}

export async function generateQuizFromText(text: string, title: string): Promise<Quiz> {
  const { quiz } = await generateStudyMaterial(text, title);
  return quiz;
}
