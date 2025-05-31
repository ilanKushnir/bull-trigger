// @ts-nocheck
import cron from 'node-cron';
import Database from 'better-sqlite3';
import path from 'path';
import { AbstractStrategy, StrategyContext } from './abstract';
import { WeeklyEducationStrategy } from './weeklyEducation';
import { TokenWatcherStrategy } from './tokenWatcher';

// Use the same database path logic as server.ts
const cwd = process.cwd();
const isInBackendDir = cwd.endsWith('/backend');
const DB_FILE = process.env.DB_FILE || (isInBackendDir 
  ? path.resolve(cwd, 'database.sqlite')
  : path.resolve(cwd, 'backend/database.sqlite'));
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
  // Clear existing strategies first
  sqlite.prepare('DELETE FROM strategies').run();
  sqlite.prepare('DELETE FROM api_calls').run();
  sqlite.prepare('DELETE FROM model_calls').run();
  sqlite.prepare('DELETE FROM telegram_message_nodes').run();
  sqlite.prepare('DELETE FROM strategy_trigger_nodes').run();
  
  // Strategy 1: BTC Market Analysis
  const btcAnalysisResult = sqlite.prepare('INSERT INTO strategies (name, description, enabled, cron) VALUES (?, ?, ?, ?)').run(
    'BTC Market Analysis', 
    'Analyzes BTC price and fear/greed index, sends analysis to Telegram and triggers crypto tip', 
    1, 
    '0 9 * * *' // Daily at 9 AM
  );
  const btcStrategyId = btcAnalysisResult.lastInsertRowid;
  
  // Strategy 2: Crypto Tip
  const tipResult = sqlite.prepare('INSERT INTO strategies (name, description, enabled, cron) VALUES (?, ?, ?, ?)').run(
    'Crypto Tip', 
    'Provides crypto trading tips and sends them to Telegram', 
    1, 
    '0 12 * * *' // Daily at 12 PM (but mainly triggered by BTC Analysis)
  );
  const tipStrategyId = tipResult.lastInsertRowid;
  
  // API Call 1: Get BTC Price
  sqlite.prepare(`INSERT INTO api_calls (strategy_id, name, url, method, json_path, output_variable, order_index, enabled) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    btcStrategyId,
    'Get BTC Price',
    'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
    'GET',
    '$.price',
    'btc_price',
    1,
    1
  );
  
  // API Call 2: Get Fear & Greed Index (parallel with BTC Price)
  sqlite.prepare(`INSERT INTO api_calls (strategy_id, name, url, method, json_path, output_variable, order_index, enabled) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    btcStrategyId,
    'Get Fear & Greed Index',
    'https://api.alternative.me/fng/',
    'GET',
    '$.data[0].value',
    'fear_greed_index',
    1,
    1
  );
  
  // Model Call: Analyze Market Data
  sqlite.prepare(`INSERT INTO model_calls (strategy_id, name, model_tier, system_prompt, user_prompt, include_api_data, output_variable, order_index, enabled) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    btcStrategyId,
    'Market Analysis',
    'cheap',
    'You are a crypto market analyst. Analyze the provided BTC price and fear/greed index data.',
    'Based on the current BTC price and fear/greed index, provide a brief market analysis with key insights and potential trading signals. Keep it concise and actionable.',
    1,
    'market_analysis',
    2,
    1
  );
  
  // Telegram Message: Send Analysis
  sqlite.prepare(`INSERT INTO telegram_message_nodes (strategy_id, name, chat_id, message_template, include_api_data, message_type, parse_mode, order_index, enabled) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    btcStrategyId,
    'Send Market Analysis',
    '@yourchannel',
    '🔍 **Daily Market Analysis**\n\n📊 BTC Price: ${{btc_price}}\n😱 Fear & Greed: {{fear_greed_index}}\n\n{{market_analysis}}',
    0,
    'info',
    'Markdown',
    3,
    1
  );
  
  // Strategy Trigger: Trigger Crypto Tip
  sqlite.prepare(`INSERT INTO strategy_trigger_nodes (strategy_id, name, target_strategy_id, condition_variable, wait_for_completion, order_index, enabled) 
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    btcStrategyId,
    'Trigger Crypto Tip',
    tipStrategyId,
    null,
    0,
    4,
    1
  );
  
  // Model Call for Crypto Tip Strategy
  sqlite.prepare(`INSERT INTO model_calls (strategy_id, name, model_tier, system_prompt, user_prompt, include_api_data, output_variable, order_index, enabled) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    tipStrategyId,
    'Generate Crypto Tip',
    'cheap',
    'You are a helpful crypto trading educator. Provide educational tips and insights for crypto traders.',
    'Generate a useful crypto trading tip for today. Focus on general trading principles, risk management, or market insights. Keep it educational and practical.',
    0,
    'crypto_tip',
    1,
    1
  );
  
  // Telegram Message: Send Crypto Tip
  sqlite.prepare(`INSERT INTO telegram_message_nodes (strategy_id, name, chat_id, message_template, include_api_data, message_type, parse_mode, order_index, enabled) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    tipStrategyId,
    'Send Crypto Tip',
    '@yourchannel',
    '💡 **Daily Crypto Tip**\n\n{{crypto_tip}}',
    0,
    'success',
    'Markdown',
    2,
    1
  );
}

// Note: ensureDefaultStrategies() and refreshRegistry() should be called 
// after database is fully initialized, not at module import time 