import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Model used to turn text into embeddings (numbers representing meaning)
export const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

// Model used to generate chat answers from retrieved context
export const chatModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
