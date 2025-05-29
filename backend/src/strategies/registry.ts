// @ts-nocheck
import cron from 'node-cron';
import Database from 'better-sqlite3';
import path from 'path';
import { AbstractStrategy, StrategyContext } from './abstract';
import { WeeklyEducationStrategy } from './weeklyEducation';
import { TokenWatcherStrategy } from './tokenWatcher';

const DB_FILE = process.env.DB_FILE || path.resolve(process.cwd(), 'database.sqlite');
const sqlite = new Database(DB_FILE);

type JobEntry = {
  strategy: any;
  task: cron.ScheduledTask;
};

const jobs: Record<number, JobEntry> = {};

const STRATEGY_MAP: Record<string, any> = {
  WeeklyEducation: WeeklyEducationStrategy,
  TokenWatcher: TokenWatcherStrategy
};

function loadEnabledStrategies() {
  return sqlite.prepare('SELECT * FROM strategies WHERE enabled = 1').all();
}

export function refreshRegistry() {
  // stop existing
  for (const id in jobs) {
    jobs[id].task.stop();
    delete jobs[id];
  }
  const rows = loadEnabledStrategies();
  for (const row of rows) {
    const ctx: StrategyContext = {
      id: row.id,
      name: row.name,
      triggers: row.triggers ? JSON.parse(row.triggers) : undefined
    };
    const implClass = STRATEGY_MAP[row.name] ?? (class extends AbstractStrategy{execute(){}});
    const impl = new implClass(ctx);
    const task = cron.schedule(row.cron || '*/5 * * * *', () => impl.execute());
    jobs[row.id] = { strategy: impl, task };
  }
  console.log(`[registry] Loaded ${Object.keys(jobs).length} strategies`);
}

export function runStrategyOnce(id: number) {
  const row = sqlite.prepare('SELECT * FROM strategies WHERE id = ?').get(id);
  if (!row) throw new Error('Not found');
  const ctx: StrategyContext = { id: row.id, name: row.name, triggers: row.triggers ? JSON.parse(row.triggers) : undefined };
  const impl = new (class extends AbstractStrategy {
    execute() { console.log(`[strategy] manual run ${this.ctx.name}`); }
  })(ctx);
  impl.execute();
}

export function stopStrategy(id: number) {
  const entry = jobs[id];
  if (entry) {
    entry.task.stop();
    delete jobs[id];
  }
}

export function ensureDefaultStrategies() {
  const count = sqlite.prepare('SELECT COUNT(1) as c FROM strategies WHERE name = ?').get('WeeklyEducation');
  if (!count.c) {
    sqlite.prepare('INSERT INTO strategies (name, description, enabled, cron) VALUES (?,?,0, "0 10 * * 0")').run('WeeklyEducation','Weekly educational tip');
  }
  const tw = sqlite.prepare('SELECT COUNT(1) as c FROM strategies WHERE name = ?').get('TokenWatcher');
  if (!tw.c) {
    sqlite.prepare('INSERT INTO strategies (name, description, enabled, cron) VALUES (?,?,1, "0 * * * *")').run('TokenWatcher','Token usage monitor');
  }
}

// initial load
ensureDefaultStrategies();
refreshRegistry(); 