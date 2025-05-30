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