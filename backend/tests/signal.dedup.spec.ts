// @ts-nocheck
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import { dispatchSignal } from '../src/signals/dispatcher';

vi.mock('../src/telegram/gateway', () => {
  return {
    sendMessage: vi.fn().mockResolvedValue({ message_id: 123 })
  };
});

const DB_FILE = process.env.DB_FILE || path.resolve(process.cwd(), 'database.sqlite');
const db = new Database(DB_FILE);

describe('Signal dedup', () => {
  const signal = { symbol: 'BTC', price: 65000, timestamp: Date.now() };
  beforeAll(() => db.prepare('DELETE FROM messages').run());

  it('sends once, reminder second', async () => {
    await dispatchSignal(signal);
    await dispatchSignal(signal);
    const rows = db.prepare('SELECT * FROM messages').all();
    expect(rows.length).toBe(1);
    const { sendMessage } = await import('../src/telegram/gateway');
    expect(sendMessage).toHaveBeenCalledTimes(2); // first with buttons, second without
  });

  afterAll(() => db.prepare('DELETE FROM messages').run());
}); 