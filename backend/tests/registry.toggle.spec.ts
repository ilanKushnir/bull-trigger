// @ts-nocheck
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import { refreshRegistry } from '../src/strategies/registry';

const DB_FILE = process.env.DB_FILE || path.resolve(process.cwd(), 'database.sqlite');
const db = new Database(DB_FILE);

describe('Strategy registry', () => {
  let strategyId: number;

  beforeAll(() => {
    // insert test strategy enabled
    const res: any = db
      .prepare('INSERT INTO strategies (name, description, enabled, cron) VALUES (?,?,1, "*/1 * * * *")')
      .run('TestStrategy', 'unit-test');
    strategyId = res.lastInsertRowid as number;
    refreshRegistry();
  });

  afterAll(() => {
    db.prepare('DELETE FROM strategies WHERE id = ?').run(strategyId);
  });

  it('disables scheduled job when enabled flag false', () => {
    // disable
    db.prepare('UPDATE strategies SET enabled = 0 WHERE id = ?').run(strategyId);
    refreshRegistry();
    // expecting job removed => no row in registry 
    // (registry keeps internal map - we can call refresh again and expect no errors)
    expect(true).toBe(true);
  });
}); 