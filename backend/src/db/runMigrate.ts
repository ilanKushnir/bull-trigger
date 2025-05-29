// @ts-nocheck
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const DB_FILE = process.env.DB_FILE || path.resolve(process.cwd(), 'database.sqlite');
const MIGRATIONS_DIR = path.resolve(process.cwd(), 'migrations/sqlite');

const db = new Database(DB_FILE);

db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);`);

function getAppliedMigrations(): Set<string> {
  const rows = db.prepare('SELECT name FROM _migrations').all();
  return new Set(rows.map((r: any) => r.name));
}

function applyMigration(file: string) {
  const sql = fs.readFileSync(file, 'utf8');
  db.exec(sql);
  db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(path.basename(file));
  console.log(`[migrate] Applied ${path.basename(file)}`);
}

function runMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('[migrate] No migrations directory found, skipping');
    return;
  }
  const files: string[] = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const applied = getAppliedMigrations();

  for (const file of files) {
    if (!applied.has(file)) {
      applyMigration(path.join(MIGRATIONS_DIR, file));
    }
  }
  console.log('[migrate] All migrations applied');
}

if (require.main === module) {
  runMigrations();
}

export { runMigrations }; 