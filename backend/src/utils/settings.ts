import Database from 'better-sqlite3';
import path from 'path';

// Use the same database path resolution logic as the server
const cwd = process.cwd();
const isInBackendDir = cwd.endsWith('/backend');
const DB_FILE = process.env.DB_FILE || (isInBackendDir 
  ? path.resolve(cwd, 'database.sqlite')
  : path.resolve(cwd, 'backend/database.sqlite'));

const sqlite = new Database(DB_FILE);

// Type definitions for settings
export interface SystemSettings {
  // Token management
  TOKEN_LIMIT: number;
  TOKEN_USED: number;
  TOKEN_WARN: number;
  TOKEN_PANIC: number;
  
  // AI Models
  MODEL_DEEP: string;
  MODEL_CHEAP: string;
  
  // API Keys (optional)
  OPENAI_API_KEY?: string;
  TELEGRAM_BOT_TOKEN?: string;
  
  // Telegram Integration
  TELEGRAM_CHAT_ID: string;
  
  // System Behavior
  SIGNAL_COOLDOWN: number;
  HEARTBEAT_INTERVAL: number;
  ENABLE_NOTIFICATIONS: boolean;
  AUTO_DISABLE_FAILING_STRATEGIES: boolean;
}

// Default values for all settings
const DEFAULT_SETTINGS: SystemSettings = {
  // Token management
  TOKEN_LIMIT: 100000,
  TOKEN_USED: 0,
  TOKEN_WARN: 0.8,
  TOKEN_PANIC: 0.95,
  
  // AI Models - Updated to latest 2024-2025 models
  MODEL_DEEP: 'o1',  // Updated: Advanced reasoning model for complex tasks
  MODEL_CHEAP: 'gpt-4o-mini',  // Updated: Latest efficient model for fast operations
  
  // Telegram Integration
  TELEGRAM_CHAT_ID: '-1001234567890',
  
  // System Behavior
  SIGNAL_COOLDOWN: 30,
  HEARTBEAT_INTERVAL: 120,
  ENABLE_NOTIFICATIONS: true,
  AUTO_DISABLE_FAILING_STRATEGIES: false,
};

/**
 * Get a setting value with proper type conversion and fallback
 */
export function getSetting<K extends keyof SystemSettings>(
  key: K,
  fallback?: SystemSettings[K]
): SystemSettings[K] {
  try {
    const row = sqlite.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    
    if (!row) {
      return fallback !== undefined ? fallback : DEFAULT_SETTINGS[key];
    }
    
    const value = row.value;
    const defaultValue = DEFAULT_SETTINGS[key];
    
    // Type conversion based on the expected type
    if (typeof defaultValue === 'number') {
      const numValue = Number(value);
      return (isNaN(numValue) ? defaultValue : numValue) as SystemSettings[K];
    }
    
    if (typeof defaultValue === 'boolean') {
      return (value === 'true' || value === '1') as SystemSettings[K];
    }
    
    return value as SystemSettings[K];
  } catch (error) {
    console.error(`Failed to get setting ${key}:`, error);
    return fallback !== undefined ? fallback : DEFAULT_SETTINGS[key];
  }
}

/**
 * Set a setting value with proper type conversion
 */
export function setSetting<K extends keyof SystemSettings>(
  key: K,
  value: SystemSettings[K]
): void {
  try {
    const serializedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    sqlite.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, serializedValue);
  } catch (error) {
    console.error(`Failed to set setting ${key}:`, error);
    throw error;
  }
}

/**
 * Get all settings as a typed object
 */
export function getAllSettings(): Partial<SystemSettings> {
  try {
    const rows = sqlite.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const settings: Partial<SystemSettings> = {};
    
    for (const { key, value } of rows) {
      if (key in DEFAULT_SETTINGS) {
        const typedKey = key as keyof SystemSettings;
        const defaultValue = DEFAULT_SETTINGS[typedKey];
        
        if (typeof defaultValue === 'number') {
          const numValue = Number(value);
          (settings as any)[key] = isNaN(numValue) ? defaultValue : numValue;
        } else if (typeof defaultValue === 'boolean') {
          (settings as any)[key] = value === 'true' || value === '1';
        } else {
          (settings as any)[key] = value;
        }
      }
    }
    
    return settings;
  } catch (error) {
    console.error('Failed to get all settings:', error);
    return {};
  }
}

/**
 * Update multiple settings at once
 */
export function updateSettings(settings: Partial<SystemSettings>): void {
  try {
    const updateStmt = sqlite.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const transaction = sqlite.transaction((settingsToUpdate: Array<[string, any]>) => {
      for (const [key, value] of settingsToUpdate) {
        const serializedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        updateStmt.run(key, serializedValue);
      }
    });
    
    transaction(Object.entries(settings));
  } catch (error) {
    console.error('Failed to update settings:', error);
    throw error;
  }
}

/**
 * Check if notifications are enabled
 */
export function notificationsEnabled(): boolean {
  return getSetting('ENABLE_NOTIFICATIONS', true);
}

/**
 * Get the current model for a specific tier
 */
export function getModel(tier: 'deep' | 'cheap'): string {
  return tier === 'deep' 
    ? getSetting('MODEL_DEEP', 'o1')  // Updated: Advanced reasoning model fallback
    : getSetting('MODEL_CHEAP', 'gpt-4o-mini');  // Updated: Latest efficient model fallback
}

/**
 * Get token usage information
 */
export function getTokenUsage() {
  const used = getSetting('TOKEN_USED', 0);
  const limit = getSetting('TOKEN_LIMIT', 100000);
  const warnThreshold = getSetting('TOKEN_WARN', 0.8);
  const panicThreshold = getSetting('TOKEN_PANIC', 0.95);
  
  const ratio = used / limit;
  
  return {
    used,
    limit,
    ratio,
    percentage: ratio * 100,
    warning: ratio >= warnThreshold,
    panic: ratio >= panicThreshold,
    warnThreshold,
    panicThreshold,
  };
}

/**
 * Increment token usage
 */
export function incrementTokenUsage(tokens: number): void {
  const currentUsage = getSetting('TOKEN_USED', 0);
  setSetting('TOKEN_USED', currentUsage + tokens);
}

/**
 * Reset token usage to zero
 */
export function resetTokenUsage(): void {
  setSetting('TOKEN_USED', 0);
} 