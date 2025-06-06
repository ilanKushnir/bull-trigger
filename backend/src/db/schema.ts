import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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
  enabled: integer('enabled', { mode: 'boolean' }).default(true).notNull(),
  castToNumber: integer('cast_to_number', { mode: 'boolean' }).default(false).notNull() // Cast result to number
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
  stepType: text('step_type').notNull(), // 'api_call', 'model_call', 'condition_node', 'strategy_trigger_node', 'telegram_message_node'
  stepId: integer('step_id').notNull(),
  input: text('input'), // JSON string of input data
  output: text('output'), // JSON string of output data
  error: text('error'),
  duration: integer('duration'), // execution time in milliseconds
  timestamp: text('timestamp').default(sql`CURRENT_TIMESTAMP`).notNull()
});

export const strategyNodesConditions = sqliteTable('strategy_nodes_conditions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  strategyId: integer('strategy_id').notNull(),
  name: text('name').notNull(),
  conditionType: text('condition_type').notNull(), // 'api_result', 'model_response', 'variable_value'
  leftOperand: text('left_operand').notNull(), // Variable name or JSONPath
  operator: text('operator').notNull(), // '==', '!=', '>', '<', '>=', '<=', 'contains', 'startsWith', 'endsWith'
  rightOperand: text('right_operand').notNull(), // Value to compare against
  trueOutputVariable: text('true_output_variable'), // Variable to set if condition is true
  falseOutputVariable: text('false_output_variable'), // Variable to set if condition is false
  orderIndex: integer('order_index').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).default(true).notNull()
});

export const strategyNodesTriggers = sqliteTable('strategy_nodes_triggers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  strategyId: integer('strategy_id').notNull(),
  name: text('name').notNull(),
  targetStrategyId: integer('target_strategy_id').notNull(),
  conditionVariable: text('condition_variable'), // Optional: only trigger if this variable is truthy
  passVariables: text('pass_variables'), // JSON array of variable names to pass to target strategy
  waitForCompletion: integer('wait_for_completion', { mode: 'boolean' }).default(false).notNull(),
  outputVariable: text('output_variable'), // Variable to store result if waiting for completion
  orderIndex: integer('order_index').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).default(true).notNull()
});

export const strategyNodesTelegram = sqliteTable('strategy_nodes_telegram', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  strategyId: integer('strategy_id').notNull(),
  name: text('name').notNull(),
  chatId: text('chat_id').notNull(), // Telegram chat ID or channel username
  messageTemplate: text('message_template').notNull(), // Message template with variable interpolation
  includeApiData: integer('include_api_data', { mode: 'boolean' }).default(false).notNull(),
  onlyIfVariable: text('only_if_variable'), // Optional: only send if this variable is truthy
  messageType: text('message_type').default('info').notNull(), // 'info', 'success', 'warning', 'error'
  parseMode: text('parse_mode').default('Markdown').notNull(), // 'Markdown', 'HTML', or 'none'
  orderIndex: integer('order_index').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).default(true).notNull()
});

export const signals = sqliteTable('signals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  signalType: text('signal_type', { enum: ['LONG', 'SHORT'] }).notNull(),
  symbol: text('symbol').notNull(),
  riskLevel: text('risk_level', { enum: ['Low', 'Medium', 'High'] }).notNull(),
  confidence: integer('confidence').notNull(),
  entryPriceMin: real('entry_price_min').notNull(),
  entryPriceMax: real('entry_price_max').notNull(),
  leverage: real('leverage').notNull().default(1),
  tp1: real('tp1'),
  tp2: real('tp2'),
  tp3: real('tp3'),
  stopLoss: real('stop_loss').notNull(),
  strategyName: text('strategy_name').notNull(),
  note: text('note'),
  signalTag: text('signal_tag'),
  status: text('status', { enum: ['active', 'closed', 'cancelled'] }).notNull().default('active'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`)
});