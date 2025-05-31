// @ts-nocheck
import { AbstractStrategy } from './abstract';
import { getTokenUsage, notificationsEnabled } from '../utils/settings';
import { sendMessage } from '../telegram/gateway';

let lastWarn = 0;

export class TokenWatcherStrategy extends AbstractStrategy {
  async execute() {
    if (!notificationsEnabled()) {
      return; // Skip if notifications are disabled
    }

    const tokenInfo = getTokenUsage();
    const now = Date.now();

    if (tokenInfo.panic) {
      await sendMessage(`🚨 Token usage at ${tokenInfo.percentage.toFixed(1)}%! Consider upgrading plan.`);
      lastWarn = now; // reset cool-down
      return;
    }
    
    if (tokenInfo.warning && now - lastWarn > 1000 * 60 * 60 * 24) {
      await sendMessage(`⚠️ Token usage high ${tokenInfo.percentage.toFixed(1)}%`);
      lastWarn = now;
    }
  }
} 