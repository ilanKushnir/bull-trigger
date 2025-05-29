// @ts-nocheck
import { AbstractStrategy } from './abstract';
import Database from 'better-sqlite3';
import path from 'path';
import { sendMessage } from '../telegram/gateway';

const DB_FILE = process.env.DB_FILE || path.resolve(process.cwd(), 'database.sqlite');
const sqlite = new Database(DB_FILE);

function getSetting(key: string, fallback: string) {
  const row = sqlite.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row?.value ?? fallback;
}

let lastWarn = 0;

export class TokenWatcherStrategy extends AbstractStrategy {
  async execute() {
    const used = Number(getSetting('TOKEN_USED', '0'));
    const limit = Number(getSetting('TOKEN_LIMIT', '100000'));
    const warnThreshold = Number(getSetting('TOKEN_WARN', '0.8'));
    const panicThreshold = Number(getSetting('TOKEN_PANIC', '0.95'));

    const ratio = used / limit;
    const now = Date.now();

    if (ratio >= panicThreshold) {
      await sendMessage(`🚨 Token usage at ${(ratio * 100).toFixed(1)}%! Consider upgrading plan.`);
      lastWarn = now; // reset cool-down
      return;
    }
    if (ratio >= warnThreshold && now - lastWarn > 1000 * 60 * 60 * 24) {
      await sendMessage(`⚠️ Token usage high ${(ratio * 100).toFixed(1)}%`);
      lastWarn = now;
    }
  }
} 