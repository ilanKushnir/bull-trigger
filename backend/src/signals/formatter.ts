// @ts-nocheck
import { signalSchema } from '@bull-trigger/common';
import { Markup } from 'telegraf';

export function formatSignal(signal: any) {
  // validate structure if needed
  const parsed = signalSchema.safeParse(signal);
  if (!parsed.success) throw new Error('Invalid signal');
  const { symbol, price, timestamp } = parsed.data;
  const text = `*New Signal*\nSymbol: *${symbol}*\nPrice: *${price}*\nTime: ${new Date(timestamp).toISOString()}`;
  const buttons = Markup.inlineKeyboard([
    Markup.button.callback('👍 Trade', 'trade_yes'),
    Markup.button.callback('❌ Skip', 'trade_no')
  ]);
  return { text, buttons };
}

export function signalHash(signal: any) {
  return `${signal.symbol}_${signal.price}`;
} 