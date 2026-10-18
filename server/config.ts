import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

export const MODEL_ID = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
export const FALLBACK_MODEL_ID = 'gemini-3-flash-preview';

const apiKey = process.env.GEMINI_API_KEY || '';

export const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});
