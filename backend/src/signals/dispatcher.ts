// @ts-nocheck
import Database from 'better-sqlite3';
import { differenceInHours } from 'date-fns';
import path from 'path';
import { sendMessage } from '../telegram/gateway';
import { formatSignal } from './formatter';

const DB_FILE = process.env.DB_FILE || path.resolve(process.cwd(), 'database.sqlite');
const sqlite = new Database(DB_FILE);

function findRecent(hash: string): any {
  const row = sqlite.prepare('SELECT * FROM messages WHERE signal_hash = ? ORDER BY sent_at DESC LIMIT 1').get(hash);
  if (!row) return null;
  const hrs = differenceInHours(new Date(), new Date(row.sent_at));
  return hrs < 72 ? row : null;
}

export async function dispatchSignal(signal: any) {
  try {
    // Check for duplicates based on recent signals
    const recent = getRecentSignals(signal.symbol);
    const isDuplicate = recent.some(s => 
      s.strategy === signal.strategy && 
      s.direction === signal.direction
    );

    if (isDuplicate) {
      // Send reminder instead of new signal
      await sendMessage(`📝 Reminder: ${signal.symbol} ${signal.direction} signal still active`);
      return;
    }

    // Dispatch new signal
    await sendMessage(formatSignal(signal));
    
  } catch (error) {
    console.error('Failed to dispatch signal:', error);
  }
}

function formatSignal(signal: any): string {
  return `🚀 **${signal.symbol} ${signal.direction}**
📊 Strategy: ${signal.strategy}
💎 Confidence: ${signal.confidence}%
💰 Entry: $${signal.price_entry}`;
}

function getRecentSignals(symbol: string): any[] {
  // Implementation to get recent signals from database
  return [];
} 