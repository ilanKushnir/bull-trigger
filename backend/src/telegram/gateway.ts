// @ts-nocheck
import Database from 'better-sqlite3';
import dotenvSafe from 'dotenv-safe';
import fs from 'fs';
import path from 'path';
import { Markup, Telegraf } from 'telegraf';

// Environment and Database Setup
function loadEnvironment() {
  const backendDir = process.cwd();
  const rootDir = fs.existsSync(`${backendDir}/../.env`)
    ? path.resolve(backendDir, '..')
    : backendDir;
  const exampleFile = fs.existsSync(path.join(backendDir, '.env.example'))
    ? path.join(backendDir, '.env.example')
    : path.join(rootDir, '.env.example');

  process.chdir(rootDir);
  dotenvSafe.config({ example: exampleFile, allowEmptyValues: true });
}

function getDatabasePath(): string {
  const cwd = process.cwd();
  const isInBackendDir = cwd.endsWith('/backend');
  return process.env.DB_FILE || (isInBackendDir 
    ? path.resolve(cwd, 'database.sqlite')
    : path.resolve(cwd, 'backend/database.sqlite'));
}

function getSettingFromDB(dbPath: string, key: string): string | undefined {
  try {
    const db = new Database(dbPath);
    const result = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    db.close();
    return result?.value;
  } catch (error) {
    console.warn(`[telegram] Failed to read ${key} from database:`, error);
    return undefined;
  }
}

function getBotToken(): string {
  loadEnvironment();
  
  let botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    const dbPath = getDatabasePath();
    botToken = getSettingFromDB(dbPath, 'TELEGRAM_BOT_TOKEN');
  }
  
  if (!botToken) {
    console.error('[telegram] TELEGRAM_BOT_TOKEN missing in both environment and database settings');
    console.error('[telegram] Please configure TELEGRAM_BOT_TOKEN in environment or database settings');
    process.exit(1);
  }
  
  return botToken;
}

// Initialize Database and Bot
const DB_PATH = getDatabasePath();
const sqlite = new Database(DB_PATH);
const bot = new Telegraf(getBotToken());

// Utility Functions
const responseTemplates = {
  hype: ['🚀 Boom! Let\'s ride the waves! ', '🔥 Markets are heating up! ', '💎 Hands, engage! '],
  congrats: ['🎉 Nailed it! ', '🙌 Victory! ', '🏆 Mission accomplished! ']
};

const randomChoice = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

function isAdmin(telegramId: number): boolean {
  try {
    const row = sqlite.prepare('SELECT 1 FROM users WHERE id = ? AND is_admin = 1 LIMIT 1').get(telegramId);
    return !!row;
  } catch {
    return false;
  }
}

function createAssetKeyboard() {
  const symbols = ['BTC', 'ETH', 'SOL', 'XRP'];
  return Markup.inlineKeyboard(
    symbols.map(symbol => Markup.button.callback(symbol, `asset_${symbol}`)),
    { columns: 2 }
  );
}

// Bot Middleware & Commands
bot.use(async (ctx, next) => {
  if (ctx.from && !isAdmin(ctx.from.id)) {
    return ctx.reply('🚫 Unauthorized');
  }
  await next();
});

bot.command('analyze_market', (ctx) => {
  ctx.reply(
    randomChoice(responseTemplates.hype) + 'Select an asset to analyze:', 
    createAssetKeyboard()
  );
});

bot.command('scrape_signals', async (ctx) => {
  try {
    const signals = sqlite.prepare(`
      SELECT id, strategy, symbol, direction, confidence, price_entry, 
             price_target, price_stop, sent_at, reaction
      FROM messages 
      WHERE sent_at > datetime('now', '-24 hours') 
      ORDER BY sent_at DESC 
      LIMIT 10
    `).all();
    
    if (signals.length === 0) {
      return ctx.reply('📊 No signals found in the last 24 hours.');
    }
    
    const response = ['📊 **Recent Signals (Last 24h)**\n']
      .concat(signals.map((signal: any, index: number) => {
        const reactionEmoji = signal.reaction === 'join' ? '👍' : 
                            signal.reaction === 'profit' ? '✅' : 
                            signal.reaction === 'loss' ? '❌' : '⏳';
        
        return [
          `${index + 1}. **${signal.symbol}** ${signal.direction?.toUpperCase()}`,
          `   Strategy: ${signal.strategy}`,
          `   Confidence: ${signal.confidence}%`,
          `   Entry: $${signal.price_entry}`,
          signal.price_target ? `   Target: $${signal.price_target}` : '',
          signal.price_stop ? `   Stop: $${signal.price_stop}` : '',
          `   Status: ${reactionEmoji}\n`
        ].filter(Boolean).join('\n');
      }))
      .join('\n');
    
    ctx.reply(response, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('[telegram] Error fetching signals:', error);
    ctx.reply('❌ Error fetching recent signals. Please try again later.');
  }
});

bot.command('history', (ctx) => {
  ctx.reply('📊 Fetching historical data...');
});

bot.on('callback_query', async (ctx) => {
  const { data } = ctx.callbackQuery;
  const msgId = ctx.callbackQuery.message?.message_id;
  
  if (msgId) {
    sqlite.prepare('UPDATE messages SET reaction = ? WHERE tg_msg_id = ?').run(data, msgId);
    await ctx.answerCbQuery('Recorded 👍');
  }
});

// Export Functions
export async function startTelegram() {
  try {
    await bot.launch();
    console.log('[telegram] Bot started successfully');
  } catch (error) {
    console.error('[telegram] Failed to start bot:', error);
    throw error;
  }
}

export async function sendMessage(text: string, buttons?: any) {
  const chatId = getSettingFromDB(DB_PATH, 'TELEGRAM_CHAT_ID') || process.env.TELEGRAM_CHAT_ID;
  
  if (!chatId) {
    console.warn('[telegram] TELEGRAM_CHAT_ID not configured, skipping message send');
    return undefined;
  }
  
  try {
    // Send as plain text to avoid markdown parsing issues
    const result = await bot.telegram.sendMessage(chatId, text, {
      ...(buttons ? { reply_markup: buttons } : {})
    });
    
    return result;
  } catch (error) {
    console.error('[telegram] Failed to send message:', error);
    throw error;
  }
}

// Auto-start when executed directly
startTelegram(); 