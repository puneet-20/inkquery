import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Model names as of mid-2026. Google occasionally renames/deprecates models,
// so if these ever 404 again, check https://ai.google.dev/gemini-api/docs/models
export const EMBEDDING_MODEL = 'gemini-embedding-001';
export const CHAT_MODEL = 'gemini-2.5-flash';

// Turns a piece of text into a 768-number embedding (matches our Supabase schema).
export async function embedText(text, taskType = 'RETRIEVAL_DOCUMENT') {
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: [text],
    config: {
      taskType, // 'RETRIEVAL_DOCUMENT' when storing chunks, 'RETRIEVAL_QUERY' when embedding a question
      outputDimensionality: 768,
    },
  });
  return response.embeddings[0].values;
}