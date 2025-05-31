// @ts-nocheck
import Database from 'better-sqlite3';
import dotenvSafe from 'dotenv-safe';
import fs from 'fs';
import path from 'path';
import { Markup, Telegraf } from 'telegraf';

// Load environment
function loadEnv() {
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

loadEnv();

// Try to get bot token from database settings first, then fall back to environment
let BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  try {
    console.log('🔍 [telegram] TELEGRAM_BOT_TOKEN not found in environment, checking database settings...');
    
    // Initialize database connection for settings check
    const cwd = process.cwd();
    const isInBackendDir = cwd.endsWith('/backend');
    const tempDbFile = process.env.DB_FILE || (isInBackendDir 
      ? path.resolve(cwd, 'database.sqlite')
      : path.resolve(cwd, 'backend/database.sqlite'));
    
    console.log('🔍 [telegram] Checking database at:', tempDbFile);
    console.log('🔍 [telegram] File exists:', fs.existsSync(tempDbFile));
    
    const tempDb = new Database(tempDbFile);
    
    // Check if settings table exists
    const tableExists = tempDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'").get();
    console.log('🔍 [telegram] Settings table exists:', !!tableExists);
    
    // Try to get the bot token
    const tokenRow = tempDb.prepare('SELECT value FROM settings WHERE key = ?').get('TELEGRAM_BOT_TOKEN') as { value: string } | undefined;
    console.log('🔍 [telegram] Bot token query result:', tokenRow ? `Found token with length ${tokenRow.value.length}` : 'No token found');
    
    BOT_TOKEN = tokenRow?.value;
    tempDb.close();
    
    if (BOT_TOKEN) {
      console.log('✅ [telegram] Bot token found in database settings');
    } else {
      console.log('❌ [telegram] Bot token not found in database settings');
    }
  } catch (error) {
    console.warn('[telegram] Failed to read TELEGRAM_BOT_TOKEN from database:', error);
  }
}

if (!BOT_TOKEN) {
  console.error('[telegram] TELEGRAM_BOT_TOKEN missing in both environment and database settings');
  console.error('[telegram] Please set TELEGRAM_BOT_TOKEN in:');
  console.error('[telegram] 1. Environment variable, or');
  console.error('[telegram] 2. Database settings via the dashboard');
  process.exit(1);
}

// SQLite connection (reuse same file as backend)
// Use the same database path logic as server.ts
const cwd = process.cwd();
const isInBackendDir = cwd.endsWith('/backend');
const DB_FILE = process.env.DB_FILE || (isInBackendDir 
  ? path.resolve(cwd, 'database.sqlite')
  : path.resolve(cwd, 'backend/database.sqlite'));
console.log('🔍 [telegram] Database file path:', DB_FILE);
console.log('🔍 [telegram] Current working directory:', cwd);
console.log('🔍 [telegram] Is in backend directory:', isInBackendDir);
const sqlite = new Database(DB_FILE);

function isAdmin(telegramId: number): boolean {
  const row = sqlite
    .prepare('SELECT 1 FROM users WHERE id = ? AND is_admin = 1 LIMIT 1')
    .get(telegramId);
  return !!row;
}

const hypeLines = [
  '🚀 Boom! Let\'s ride the waves! ',
  '🔥 Markets are heating up! ',
  '💎 Hands, engage! '
];
const congratsLines = [
  '🎉 Nailed it! ',
  '🙌 Victory! ',
  '🏆 Mission accomplished! '
];

function pick(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const bot = new Telegraf(BOT_TOKEN);

// Inline keyboard formatter
function assetInlineKeyboard() {
  const symbols = ['BTC', 'ETH', 'SOL', 'XRP'];
  return Markup.inlineKeyboard(
    symbols.map((s) => Markup.button.callback(s, `asset_${s}`)),
    { columns: 2 }
  );
}

bot.use(async (ctx, next) => {
  if (ctx.from && !isAdmin(ctx.from.id)) {
    return ctx.reply('🚫 Unauthorized');
  }
  await next();
});

bot.command('analyze_market', (ctx) => {
  ctx.reply(pick(hypeLines) + 'Select an asset to analyze:', assetInlineKeyboard());
});

bot.command('scrape_signals', async (ctx) => {
  try {
    // Get recent signals from database
    const recentSignals = sqlite.prepare(`
      SELECT 
        id, 
        strategy, 
        symbol, 
        direction, 
        confidence, 
        price_entry, 
        price_target, 
        price_stop, 
        sent_at,
        reaction
      FROM messages 
      WHERE sent_at > datetime('now', '-24 hours') 
      ORDER BY sent_at DESC 
      LIMIT 10
    `).all();
    
    if (recentSignals.length === 0) {
      ctx.reply('📊 No signals found in the last 24 hours.');
      return;
    }
    
    let response = `📊 **Recent Signals (Last 24h)**\n\n`;
    
    recentSignals.forEach((signal: any, index: number) => {
      const reactionEmoji = signal.reaction ? 
        (signal.reaction === 'join' ? '👍' : signal.reaction === 'profit' ? '✅' : '❌') : 
        '⏳';
      
      response += `${index + 1}. **${signal.symbol}** ${signal.direction?.toUpperCase()}\n`;
      response += `   Strategy: ${signal.strategy}\n`;
      response += `   Confidence: ${signal.confidence}%\n`;
      response += `   Entry: $${signal.price_entry}\n`;
      if (signal.price_target) response += `   Target: $${signal.price_target}\n`;
      if (signal.price_stop) response += `   Stop: $${signal.price_stop}\n`;
      response += `   Status: ${reactionEmoji}\n\n`;
    });
    
    ctx.reply(response, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error fetching signals:', error);
    ctx.reply('❌ Error fetching recent signals. Please try again later.');
  }
});

bot.command('history', (ctx) => {
  ctx.reply('📊 Fetching historical data...');
});

bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const msgId = ctx.callbackQuery.message?.message_id;
  if (!msgId) return;
  sqlite.prepare('UPDATE messages SET reaction = ? WHERE tg_msg_id = ?').run(data, msgId);
  await ctx.answerCbQuery('Recorded 👍');
});

export async function startTelegram() {
  await bot.launch();
  console.log('[telegram] Bot started');
}

export async function sendMessage(text: string, buttons?: any) {
  // First try to get chat ID from database settings, fallback to environment variables
  let chatId: string | undefined;
  
  try {
    // Try to get from database settings first
    const settingRow = sqlite.prepare('SELECT value FROM settings WHERE key = ?').get('TELEGRAM_CHAT_ID') as { value: string } | undefined;
    chatId = settingRow?.value;
    
    console.log(`[telegram] Chat ID from database: ${chatId}`);
  } catch (error) {
    console.warn('[telegram] Failed to read TELEGRAM_CHAT_ID from database:', error);
  }
  
  // Fallback to environment variable if not found in database
  if (!chatId) {
    chatId = process.env.TELEGRAM_CHAT_ID;
    console.log(`[telegram] Chat ID from environment: ${chatId}`);
  }
  
  if (!chatId) {
    console.warn('[telegram] TELEGRAM_CHAT_ID not set in database settings or environment, skipping send');
    return undefined;
  }
  
  try {
    console.log(`[telegram] Sending message to chat ${chatId}: ${text.substring(0, 100)}...`);
    const result = await bot.telegram.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      ...(buttons ? { reply_markup: buttons } : {})
    });
    console.log(`[telegram] Message sent successfully, message ID: ${result.message_id}`);
    return result;
  } catch (error) {
    console.error('[telegram] Failed to send message:', error);
    throw error;
  }
}

// start directly when executed
startTelegram(); // Re-enabled for testing 