// @ts-nocheck
import Database from 'better-sqlite3';
import path from 'path';
import { formatSignal, signalHash } from './formatter';
import { sendMessage } from '../telegram/gateway';
import { differenceInHours } from 'date-fns';

const DB_FILE = process.env.DB_FILE || path.resolve(process.cwd(), 'database.sqlite');
const sqlite = new Database(DB_FILE);

function findRecent(hash: string): any {
  const row = sqlite.prepare('SELECT * FROM messages WHERE signal_hash = ? ORDER BY sent_at DESC LIMIT 1').get(hash);
  if (!row) return null;
  const hrs = differenceInHours(new Date(), new Date(row.sent_at));
  return hrs < 72 ? row : null;
}

export async function dispatchSignal(signal: any) {
  const hash = signalHash(signal);
  const recent = findRecent(hash);
  const { text, buttons } = formatSignal(signal);
  if (recent) {
    await sendMessage(text); // reminder without buttons
    console.log('[signal] dedup reminder sent');
    return;
  }
  const res: any = await sendMessage(text, buttons.reply_markup);
  sqlite
    .prepare('INSERT INTO messages (signal_hash, tg_msg_id) VALUES (?, ?)')
    .run(hash, res?.message_id ?? null);
  console.log('[signal] new signal dispatched');
} 