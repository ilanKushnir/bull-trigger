// @ts-nocheck
import { ChatOpenAI } from '@langchain/openai';
import Database from 'better-sqlite3';
import path from 'path';

const DB_FILE = process.env.DB_FILE || path.resolve(process.cwd(), 'database.sqlite');
const sqlite = new Database(DB_FILE);

function getSetting(key: string, fallback?: string): string | undefined {
  const row = sqlite.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row?.value ?? fallback;
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export function getLLM(type: 'deep' | 'cheap' = 'cheap') {
  const modelName = type === 'deep'
    ? getSetting('MODEL_DEEP', 'o3')
    : getSetting('MODEL_CHEAP', 'gpt-4o-mini');
  return new ChatOpenAI({
    temperature: 0.2,
    modelName,
    openAIApiKey: OPENAI_API_KEY
  });
} 