import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const EMBEDDING_MODEL = 'gemini-embedding-001';
export const CHAT_MODEL = 'gemini-flash-latest';

async function withRetry(fn, { retries = 2, delayMs = 1500 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isOverloaded = err?.status === 503;
      const isLastAttempt = attempt === retries;

      if (!isOverloaded || isLastAttempt) {
        throw err;
      }

      console.warn(`Gemini returned 503 (attempt ${attempt + 1}/${retries + 1}), retrying in ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs *= 2;
    }
  }
}

export async function embedText(text, taskType = 'RETRIEVAL_DOCUMENT') {
  const response = await withRetry(() =>
    ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: [text],
      config: {
        taskType,
        outputDimensionality: 768,
      },
    })
  );
  return response.embeddings[0].values;
}

export async function generateAnswer(question, contextChunks) {
  const context = contextChunks.join('\n\n---\n\n');

  const prompt = `You are answering a question using ONLY the context below, taken from a document the user uploaded.
If the answer isn't in the context, say you don't know based on the document - do not make anything up.

Context:
${context}

Question: ${question}

Answer:`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: CHAT_MODEL,
      contents: prompt,
    })
  );

  return response.text;
}