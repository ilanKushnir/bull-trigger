// @ts-nocheck
import { Telegraf, Markup } from 'telegraf';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenvSafe from 'dotenv-safe';
import { randomUUID } from 'crypto';

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

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('[telegram] TELEGRAM_BOT_TOKEN missing in env');
  process.exit(1);
}

// SQLite connection (reuse same file as backend)
const DB_FILE = process.env.DB_FILE || path.resolve(process.cwd(), 'database.sqlite');
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

bot.command('scrape_signals', (ctx) => {
  // placeholder
  ctx.reply(pick(hypeLines) + 'Scraping latest signals...');
});

bot.command('history', (ctx) => {
  ctx.reply('📊 Fetching historical data...');
});

bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  if (data?.startsWith('asset_')) {
    const symbol = data.split('_')[1];
    await ctx.answerCbQuery(`Analyzing ${symbol}...`);
    // fake analysis result
    await ctx.editMessageText(`📈 ${symbol} looks strong! ${pick(congratsLines)}`);
  }
});

export async function startTelegram() {
  await bot.launch();
  console.log('[telegram] Bot started');
}

export async function sendMessage(text: string, buttons?: any) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    console.warn('[telegram] TELEGRAM_CHAT_ID not set, skipping send');
    return;
  }
  await bot.telegram.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    ...(buttons ? { reply_markup: buttons } : {})
  });
}

// start directly when executed
startTelegram(); 