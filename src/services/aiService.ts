import { GoogleGenAI, Type } from "@google/genai";
import { Deck, Quiz, Flashcard, QuizQuestion } from "../types";

const ai = new GoogleGenAI({ 
  apiKey: (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '') || '' 
});

export interface GeneratedStudyMaterial {
  multiple_choice: {
    question: string;
    options: string[];
    answer: number; // Index of correct option
  }[];
  short_answer: {
    question: string;
    answer: string;
  }[];
  flashcards: {
    front: string;
    back: string;
  }[];
}

export async function generateStudyMaterial(
  text: string, 
  title: string, 
  quantity: number = 10, 
  difficulty: string = 'medium',
  mode: 'quiz' | 'flashcards' = 'quiz'
): Promise<{ deck: Deck; quiz: Quiz }> {
  console.log(`AI Request Sent - Forging ${quantity} ${mode} at ${difficulty} difficulty...`);
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are the "Master Smith" of Focus Forge. Your task is to smelt the following text into high-quality ${mode}.

Requirements:
1. Mode: ${mode === 'quiz' ? 'Multiple Choice Quiz' : 'Flashcards'}
2. Quantity: Exactly ${quantity} items.
3. Difficulty: ${difficulty.toUpperCase()}. Adjust the complexity of questions and depth of knowledge required accordingly.
4. Focus: Identify key concepts, definitions, and important facts. Focus only on examinable material.
5. Quality: Questions must be clear, precise, and exam-style. Avoid vague or obvious questions.

Return response strictly in this JSON format:
{
  "items": [
    ${mode === 'quiz' ? `
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "answer": 0 // Index of the correct option (0-3)
    }` : `
    {
      "front": "...",
      "back": "..."
    }`}
  ]
}

Text:
${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
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
        required: ["items"]
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
      cards: mode === 'flashcards' ? data.items.map((f: any) => ({
        id: crypto.randomUUID(),
        term: f.front,
        definition: f.back
      })) : []
    };

    const quiz: Quiz = {
      id: crypto.randomUUID(),
      title: `Smelter: ${title}`,
      questions: mode === 'quiz' ? data.items.map((q: any) => ({
        id: crypto.randomUUID(),
        question: q.question,
        options: q.options,
        correctAnswer: q.answer
      })) : []
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
