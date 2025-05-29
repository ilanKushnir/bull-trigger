// @ts-nocheck
import Database from 'better-sqlite3';
import path from 'path';
import { users, strategies, prompts, settings } from './schema';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const DB_FILE = process.env.DB_FILE || path.resolve(process.cwd(), 'database.sqlite');
const sqlite = new Database(DB_FILE);
const db = drizzle(sqlite);

(async () => {
  console.log('[seed] inserting defaults...');
  await db.insert(users).values({ email: 'admin@example.com', isAdmin: true }).onConflictDoNothing();
  await db.insert(settings).values({ key: 'app_name', value: 'Bull Trigger' }).onConflictDoNothing();
  await db.insert(strategies).values({ name: 'Mean Reversion', description: 'Simple MR strategy' }).onConflictDoNothing();
  await db.insert(prompts).values({ content: 'You are a helpful trading assistant.' }).onConflictDoNothing();
  console.log('[seed] done.');
})(); 