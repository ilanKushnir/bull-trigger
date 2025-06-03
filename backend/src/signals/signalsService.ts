// @ts-nocheck
import Database from 'better-sqlite3';
import path from 'path';

// Database setup with the same path logic as server.ts
const cwd = process.cwd();
const isInBackendDir = cwd.endsWith('/backend');
const DB_FILE_PATH = process.env.DB_FILE || (isInBackendDir 
  ? path.resolve(cwd, 'database.sqlite')
  : path.resolve(cwd, 'backend/database.sqlite'));

const db = new Database(DB_FILE_PATH);

export interface Signal {
  id?: number;
  signalType: 'LONG' | 'SHORT';
  symbol: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  confidence: number; // 0-100
  entryPriceMin: number;
  entryPriceMax: number;
  leverage: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  stopLoss: number;
  strategyName: string;
  note?: string;
  signalTag?: string;
  status: 'active' | 'closed' | 'cancelled';
  createdAt?: string;
  updatedAt?: string;
}

export class SignalsService {
  // Create a new signal
  static createSignal(signal: Omit<Signal, 'id' | 'createdAt' | 'updatedAt'>): Signal {
    const stmt = db.prepare(`
      INSERT INTO signals (
        signal_type, symbol, risk_level, confidence, entry_price_min, entry_price_max,
        leverage, tp1, tp2, tp3, stop_loss, strategy_name, note, signal_tag, status
      ) VALUES (
        @signalType, @symbol, @riskLevel, @confidence, @entryPriceMin, @entryPriceMax,
        @leverage, @tp1, @tp2, @tp3, @stopLoss, @strategyName, @note, @signalTag, @status
      )
    `);
    
    const result = stmt.run({
      signalType: signal.signalType,
      symbol: signal.symbol,
      riskLevel: signal.riskLevel,
      confidence: signal.confidence,
      entryPriceMin: signal.entryPriceMin,
      entryPriceMax: signal.entryPriceMax,
      leverage: signal.leverage,
      tp1: signal.tp1 || null,
      tp2: signal.tp2 || null,
      tp3: signal.tp3 || null,
      stopLoss: signal.stopLoss,
      strategyName: signal.strategyName,
      note: signal.note || null,
      signalTag: signal.signalTag || null,
      status: signal.status
    });
    
    return this.getSignalById(result.lastInsertRowid as number)!;
  }
  
  // Get all signals with optional filters
  static getSignals(filters?: {
    status?: string;
    symbol?: string;
    signalType?: string;
    limit?: number;
    offset?: number;
  }): Signal[] {
    let query = 'SELECT * FROM signals';
    const conditions: string[] = [];
    const params: any = {};
    
    if (filters?.status) {
      conditions.push('status = @status');
      params.status = filters.status;
    }
    
    if (filters?.symbol) {
      conditions.push('symbol = @symbol');
      params.symbol = filters.symbol;
    }
    
    if (filters?.signalType) {
      conditions.push('signal_type = @signalType');
      params.signalType = filters.signalType;
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC';
    
    if (filters?.limit) {
      query += ' LIMIT @limit';
      params.limit = filters.limit;
      
      if (filters?.offset) {
        query += ' OFFSET @offset';
        params.offset = filters.offset;
      }
    }
    
    const stmt = db.prepare(query);
    return stmt.all(params) as Signal[];
  }
  
  // Get signal by ID
  static getSignalById(id: number): Signal | null {
    const stmt = db.prepare('SELECT * FROM signals WHERE id = ?');
    return stmt.get(id) as Signal | null;
  }
  
  // Update signal
  static updateSignal(id: number, updates: Partial<Signal>): Signal | null {
    const updateFields: string[] = [];
    const params: any = { id };
    
    if (updates.status !== undefined) {
      updateFields.push('status = @status');
      params.status = updates.status;
    }
    
    if (updates.note !== undefined) {
      updateFields.push('note = @note');
      params.note = updates.note;
    }
    
    if (updateFields.length === 0) {
      return this.getSignalById(id);
    }
    
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    
    const query = `UPDATE signals SET ${updateFields.join(', ')} WHERE id = @id`;
    const stmt = db.prepare(query);
    stmt.run(params);
    
    return this.getSignalById(id);
  }
  
  // Delete signal
  static deleteSignal(id: number): boolean {
    const stmt = db.prepare('DELETE FROM signals WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
  
  // Get signal statistics
  static getSignalStats(): {
    total: number;
    active: number;
    closed: number;
    cancelled: number;
    byType: { LONG: number; SHORT: number };
    byRisk: { Low: number; Medium: number; High: number };
  } {
    const total = db.prepare('SELECT COUNT(*) as count FROM signals').get() as { count: number };
    const active = db.prepare('SELECT COUNT(*) as count FROM signals WHERE status = "active"').get() as { count: number };
    const closed = db.prepare('SELECT COUNT(*) as count FROM signals WHERE status = "closed"').get() as { count: number };
    const cancelled = db.prepare('SELECT COUNT(*) as count FROM signals WHERE status = "cancelled"').get() as { count: number };
    
    const longSignals = db.prepare('SELECT COUNT(*) as count FROM signals WHERE signal_type = "LONG"').get() as { count: number };
    const shortSignals = db.prepare('SELECT COUNT(*) as count FROM signals WHERE signal_type = "SHORT"').get() as { count: number };
    
    const lowRisk = db.prepare('SELECT COUNT(*) as count FROM signals WHERE risk_level = "Low"').get() as { count: number };
    const mediumRisk = db.prepare('SELECT COUNT(*) as count FROM signals WHERE risk_level = "Medium"').get() as { count: number };
    const highRisk = db.prepare('SELECT COUNT(*) as count FROM signals WHERE risk_level = "High"').get() as { count: number };
    
    return {
      total: total.count,
      active: active.count,
      closed: closed.count,
      cancelled: cancelled.count,
      byType: {
        LONG: longSignals.count,
        SHORT: shortSignals.count
      },
      byRisk: {
        Low: lowRisk.count,
        Medium: mediumRisk.count,
        High: highRisk.count
      }
    };
  }
  
  // Format signal for Telegram
  static formatSignalForTelegram(signal: Signal): string {
    const emoji = signal.signalType === 'LONG' ? '📈' : '📉';
    const riskEmoji = signal.riskLevel === 'Low' ? '🟢' : signal.riskLevel === 'Medium' ? '🟡' : '🔴';
    
    let message = `${emoji} ${signal.signalType} SIGNAL - ${signal.symbol}\n`;
    message += `📊 Risk: ${signal.riskLevel} ${riskEmoji} | Confidence: ${signal.confidence}%\n\n`;
    
    message += `🔹 Entry Zone: $${signal.entryPriceMin.toLocaleString()}`;
    if (signal.entryPriceMin !== signal.entryPriceMax) {
      message += ` – $${signal.entryPriceMax.toLocaleString()}`;
    }
    message += `\n🔹 Leverage: ${signal.leverage}x\n`;
    
    if (signal.tp1) message += `🔹 TP1: $${signal.tp1.toLocaleString()}\n`;
    if (signal.tp2) message += `🔹 TP2: $${signal.tp2.toLocaleString()}\n`;
    if (signal.tp3) message += `🔹 TP3: $${signal.tp3.toLocaleString()}\n`;
    
    message += `🔻 Stop Loss: $${signal.stopLoss.toLocaleString()}\n\n`;
    message += `🧠 Strategy: ${signal.strategyName}\n`;
    
    if (signal.note) {
      message += `💬 Note: ${signal.note}\n`;
    }
    
    if (signal.signalTag) {
      message += `${signal.signalTag}`;
    }
    
    return message;
  }
  
  // Generate signal tag
  static generateSignalTag(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const signalCount = db.prepare('SELECT COUNT(*) as count FROM signals WHERE DATE(created_at) = DATE("now")').get() as { count: number };
    const signalNumber = String(signalCount.count + 1).padStart(2, '0');
    
    return `#Signal-${month}${day}-${signalNumber}`;
  }
} 