// @ts-nocheck
import { AbstractStrategy } from './abstract';
import { sendMessage } from '../telegram/gateway';

const EDUCATION_QUOTES = [
  '📚 *Tip*: Use risk management and never invest more than you can lose.',
  '📖 *Did you know?* Dollar-cost averaging reduces volatility impact.',
  '🧠 *Reminder*: Diversify across un-correlated assets for stability.'
];

function pick(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class WeeklyEducationStrategy extends AbstractStrategy {
  async execute() {
    const text = pick(EDUCATION_QUOTES);
    await sendMessage(text);
    console.log('[strategy] WeeklyEducation sent');
  }
} 