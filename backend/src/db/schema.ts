import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const migrations = sqliteTable('_migrations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  appliedAt: text('applied_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name'),
  telegramId: text('telegram_id').unique(),
  isAdmin: integer('is_admin', { mode: 'boolean' }).default(false).notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`)
});

export const strategies = sqliteTable('strategies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  enabled: integer('enabled', { mode: 'boolean' }).default(true).notNull(),
  cron: text('cron').default('*/5 * * * *'),
  triggers: text('triggers')
});

export const prompts = sqliteTable('prompts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  content: text('content').notNull()
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value')
});

export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  signalHash: text('signal_hash').notNull(),
  tgMsgId: integer('tg_msg_id'),
  sentAt: text('sent_at'),
  reaction: text('reaction')
});

export const strategyCalls = sqliteTable('strategy_calls', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  strategyId: integer('strategy_id').notNull(),
  orderIdx: integer('order_idx').notNull(),
  type: text('type').notNull(),
  configJson: text('config_json').notNull()
});

export const strategyEdges = sqliteTable('strategy_edges', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  srcCallId: integer('src_call_id').notNull(),
  dstStrategyId: integer('dst_strategy_id').notNull()
});

export const strategyExecutions = sqliteTable('strategy_executions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  strategyId: integer('strategy_id').notNull(),
  startedAt: text('started_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  completedAt: text('completed_at'),
  status: text('status').notNull(), // 'running', 'success', 'failed'
  error: text('error'),
  executionType: text('execution_type').notNull() // 'cron', 'manual'
});

export const apiCalls = sqliteTable('api_calls', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  strategyId: integer('strategy_id').notNull(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  method: text('method').default('GET').notNull(),
  headers: text('headers'), // JSON string
  body: text('body'), // JSON string for POST requests
  jsonPath: text('json_path'), // JSON path to extract data (e.g., "data.price")
  outputVariable: text('output_variable').notNull(), // Variable name to store result
  orderIndex: integer('order_index').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).default(true).notNull()
});

export const modelCalls = sqliteTable('model_calls', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  strategyId: integer('strategy_id').notNull(),
  name: text('name').notNull(),
  modelTier: text('model_tier').notNull(), // 'cheap' or 'deep'
  systemPrompt: text('system_prompt'),
  userPrompt: text('user_prompt').notNull(),
  includeApiData: integer('include_api_data', { mode: 'boolean' }).default(true).notNull(),
  outputVariable: text('output_variable').notNull(),
  orderIndex: integer('order_index').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).default(true).notNull()
});

export const flowExecutionLogs = sqliteTable('flow_execution_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  executionId: integer('execution_id').notNull(),
  stepType: text('step_type').notNull(), // 'api_call' or 'model_call'
  stepId: integer('step_id').notNull(),
  input: text('input'), // JSON string of input data
  output: text('output'), // JSON string of output data
  error: text('error'),
  duration: integer('duration'), // execution time in milliseconds
  timestamp: text('timestamp').default(sql`CURRENT_TIMESTAMP`).notNull()
});