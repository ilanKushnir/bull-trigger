// @ts-nocheck
import Database from 'better-sqlite3';
import { CronJob } from 'cron';
import path from 'path';
import { StrategyExecutionService } from '../services/strategyExecutionService';
import { StrategyFlowService } from '../services/strategyFlowService';
import { AbstractStrategy, StrategyContext } from './abstract';
import { TokenWatcherStrategy } from './tokenWatcher';
import { WeeklyEducationStrategy } from './weeklyEducation';

// Use the same database path logic as server.ts
const cwd = process.cwd();
const isInBackendDir = cwd.endsWith('/backend');
const DB_FILE = process.env.DB_FILE || (isInBackendDir 
  ? path.resolve(cwd, 'database.sqlite')
  : path.resolve(cwd, 'backend/database.sqlite'));
const sqlite = new Database(DB_FILE);

// Initialize services
const strategyFlowService = new StrategyFlowService();
const strategyExecutionService = new StrategyExecutionService();

type JobEntry = {
  strategy: any;
  task: CronJob;
};

const jobs: Record<number, JobEntry> = {};

const STRATEGY_MAP: Record<string, any> = {
  WeeklyEducation: WeeklyEducationStrategy,
  TokenWatcher: TokenWatcherStrategy
};

// Generic strategy implementation that uses StrategyFlowService
class GenericStrategy extends AbstractStrategy {
  async execute(): Promise<void> {
    const startTime = Date.now();
    console.log(`🚀 Executing: ${this.ctx.name}`);
    
    try {
      // Start execution tracking
      const executionId = strategyExecutionService.startExecution(this.ctx.id, 'cron');
      
      // Execute the strategy flow
      const result = await strategyFlowService.executeStrategyFlow(this.ctx.id, executionId);
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (result.success) {
        strategyExecutionService.completeExecution(executionId);
        console.log(`✅ ${this.ctx.name} completed (${duration}s total)`);
      } else {
        strategyExecutionService.failExecution(executionId, result.error);
        console.error(`❌ ${this.ctx.name} failed: ${result.error} (${duration}s)`);
      }
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.error(`💥 ${this.ctx.name} crashed: ${error} (${duration}s)`);
    }
  }
}

function loadEnabledStrategies() {
  return sqlite.prepare('SELECT * FROM strategies WHERE enabled = 1').all();
}

export function refreshRegistry() {
  console.log('🔄 Refreshing strategy registry...');
  
  // stop existing
  for (const id in jobs) {
    jobs[id].task.stop();
    delete jobs[id];
  }
  
  const rows = loadEnabledStrategies();
  console.log(`📋 Found ${rows.length} enabled strategies`);
  
  for (const row of rows) {
    try {
      const ctx: StrategyContext = {
        id: row.id,
        name: row.name,
        triggers: row.triggers ? JSON.parse(row.triggers) : undefined
      };
      
      // Use the specific strategy implementation if available, otherwise use GenericStrategy
      const implClass = STRATEGY_MAP[row.name] ?? GenericStrategy;
      const impl = new implClass(ctx);
      
      // Validate and adjust cron expression
      let cronExpression = row.cron || '*/5 * * * *';
      
      // Handle both 5-part and 6-part cron expressions
      const parts = cronExpression.trim().split(/\s+/);
      
      if (parts.length === 6) {
        // Already 6-part, use as-is
      } else if (parts.length === 5) {
        // Convert 5-part to 6-part by adding seconds at the beginning
        cronExpression = `0 ${cronExpression}`;
      } else {
        console.warn(`⚠️ Invalid cron expression for strategy "${row.name}": ${cronExpression}. Using default.`);
        cronExpression = '0 */5 * * * *'; // Every 5 minutes by default
      }
      
      const task = new CronJob(cronExpression, () => {
        impl.execute();
      });
      
      task.start();
      jobs[row.id] = { strategy: impl, task };
      
      console.log(`✅ Scheduled "${row.name}" (ID: ${row.id}) - ${cronExpression}`);
    } catch (error) {
      console.error(`❌ Failed to schedule strategy "${row.name}" (ID: ${row.id}):`, error);
    }
  }
  
  console.log(`✅ Registry loaded ${Object.keys(jobs).length} strategies`);
}

export function runStrategyOnce(id: number) {
  const row = sqlite.prepare('SELECT * FROM strategies WHERE id = ?').get(id);
  if (!row) throw new Error('Strategy not found');
  
  const ctx: StrategyContext = { 
    id: row.id, 
    name: row.name, 
    triggers: row.triggers ? JSON.parse(row.triggers) : undefined 
  };
  
  const impl = new (class extends AbstractStrategy {
    execute() { /* Manual strategy execution */ }
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
  sqlite.prepare('DELETE FROM strategy_nodes_telegram').run();
  sqlite.prepare('DELETE FROM strategy_nodes_triggers').run();
  
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
  sqlite.prepare(`INSERT INTO strategy_nodes_telegram (strategy_id, name, chat_id, message_template, include_api_data, message_type, parse_mode, order_index, enabled) 
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
  sqlite.prepare(`INSERT INTO strategy_nodes_triggers (strategy_id, name, target_strategy_id, condition_variable, wait_for_completion, order_index, enabled) 
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
  sqlite.prepare(`INSERT INTO strategy_nodes_telegram (strategy_id, name, chat_id, message_template, include_api_data, message_type, parse_mode, order_index, enabled) 
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