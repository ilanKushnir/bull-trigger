import Database from 'better-sqlite3';
import path from 'path';

// Use the same database path logic as server.ts
const cwd = process.cwd();
const isInBackendDir = cwd.endsWith('/backend');
const DB_FILE = process.env.DB_FILE || (isInBackendDir 
  ? path.resolve(cwd, 'database.sqlite')
  : path.resolve(cwd, 'backend/database.sqlite'));
const db = new Database(DB_FILE);

export interface StrategyExecution {
  id: number;
  strategyId: number;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'success' | 'failed';
  error?: string;
  executionType: 'cron' | 'manual';
}

export interface StrategyMetrics {
  strategyId: number;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  successRate: number;
  lastRun?: string;
  nextRun?: string;
  avgExecutionTime?: number;
}

export class StrategyExecutionService {
  private websocketService: any = null;

  constructor() {
    // Import websocket service dynamically to avoid circular dependencies
    this.initWebSocket();
  }

  private async initWebSocket() {
    try {
      const { getWebSocketService } = await import('../websocket/websocketService');
      this.websocketService = getWebSocketService();
    } catch (error) {
      console.warn('WebSocket service not available for strategy execution broadcasts');
    }
  }

  // Start tracking a strategy execution
  startExecution(strategyId: number, executionType: 'cron' | 'manual'): number {
    const result: any = db.prepare(`
      INSERT INTO strategy_executions (strategy_id, execution_type, status)
      VALUES (?, ?, 'running')
    `).run(strategyId, executionType);
    
    return result.lastInsertRowid;
  }

  // Complete a strategy execution with success
  completeExecution(executionId: number): void {
    db.prepare(`
      UPDATE strategy_executions 
      SET status = 'success', completed_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(executionId);
    
    // Get the strategy ID and broadcast updated metrics
    const execution = db.prepare(`
      SELECT strategy_id FROM strategy_executions WHERE id = ?
    `).get(executionId) as { strategy_id: number } | undefined;
    
    if (execution && this.websocketService) {
      const metrics = this.getStrategyMetrics(execution.strategy_id);
      this.websocketService.broadcastStrategyUpdate({
        strategyId: execution.strategy_id,
        metrics: metrics
      });
    }
  }

  // Mark execution as failed
  failExecution(executionId: number, error?: string): void {
    db.prepare(`
      UPDATE strategy_executions 
      SET status = 'failed', completed_at = CURRENT_TIMESTAMP, error = ?
      WHERE id = ?
    `).run(error || null, executionId);
    
    // Get the strategy ID and broadcast updated metrics
    const execution = db.prepare(`
      SELECT strategy_id FROM strategy_executions WHERE id = ?
    `).get(executionId) as { strategy_id: number } | undefined;
    
    if (execution && this.websocketService) {
      const metrics = this.getStrategyMetrics(execution.strategy_id);
      this.websocketService.broadcastStrategyUpdate({
        strategyId: execution.strategy_id,
        metrics: metrics
      });
    }
  }

  // Get metrics for a specific strategy
  getStrategyMetrics(strategyId: number): StrategyMetrics {
    const totalRuns = db.prepare(`
      SELECT COUNT(*) as count 
      FROM strategy_executions 
      WHERE strategy_id = ? AND status IN ('success', 'failed')
    `).get(strategyId) as { count: number };

    const successfulRuns = db.prepare(`
      SELECT COUNT(*) as count 
      FROM strategy_executions 
      WHERE strategy_id = ? AND status = 'success'
    `).get(strategyId) as { count: number };

    const failedRuns = db.prepare(`
      SELECT COUNT(*) as count 
      FROM strategy_executions 
      WHERE strategy_id = ? AND status = 'failed'
    `).get(strategyId) as { count: number };

    const lastRun = db.prepare(`
      SELECT started_at 
      FROM strategy_executions 
      WHERE strategy_id = ? AND status IN ('success', 'failed')
      ORDER BY started_at DESC 
      LIMIT 1
    `).get(strategyId) as { started_at: string } | undefined;

    const avgExecution = db.prepare(`
      SELECT AVG(
        JULIANDAY(completed_at) - JULIANDAY(started_at)
      ) * 24 * 60 * 60 as avg_seconds
      FROM strategy_executions 
      WHERE strategy_id = ? AND status = 'success' AND completed_at IS NOT NULL
    `).get(strategyId) as { avg_seconds: number } | undefined;

    const successRate = totalRuns.count > 0 
      ? Math.round((successfulRuns.count / totalRuns.count) * 100)
      : 0;

    // Convert the database timestamp to a proper ISO string
    let formattedLastRun: string | undefined = undefined;
    if (lastRun?.started_at) {
      try {
        // SQLite CURRENT_TIMESTAMP returns UTC time in format 'YYYY-MM-DD HH:MM:SS'
        // We need to append 'Z' to make it a proper UTC ISO string
        const utcTimestamp = lastRun.started_at.includes('T') ? 
          lastRun.started_at : 
          lastRun.started_at.replace(' ', 'T') + 'Z';
        formattedLastRun = new Date(utcTimestamp).toISOString();
      } catch (error) {
        console.warn('Failed to parse timestamp:', lastRun.started_at, error);
        formattedLastRun = lastRun.started_at;
      }
    }

    return {
      strategyId,
      totalRuns: totalRuns.count,
      successfulRuns: successfulRuns.count,
      failedRuns: failedRuns.count,
      successRate,
      lastRun: formattedLastRun,
      avgExecutionTime: avgExecution?.avg_seconds ? Math.round(avgExecution.avg_seconds) : undefined
    };
  }

  // Get metrics for all strategies
  getAllStrategiesMetrics(): StrategyMetrics[] {
    const strategies = db.prepare('SELECT id FROM strategies').all() as { id: number }[];
    return strategies.map(strategy => this.getStrategyMetrics(strategy.id));
  }

  // Get recent executions for a strategy
  getRecentExecutions(strategyId: number, limit: number = 10): StrategyExecution[] {
    return db.prepare(`
      SELECT * FROM strategy_executions 
      WHERE strategy_id = ? 
      ORDER BY started_at DESC 
      LIMIT ?
    `).all(strategyId, limit) as StrategyExecution[];
  }

  // Add some sample data for existing strategies (for demonstration)
  seedSampleData(): void {
    const strategies = db.prepare('SELECT id FROM strategies').all() as { id: number }[];
    
    strategies.forEach(strategy => {
      // Add some historical executions for each strategy
      const executionCount = Math.floor(Math.random() * 50) + 10; // 10-60 executions
      
      for (let i = 0; i < executionCount; i++) {
        const startedAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Last 30 days
        const completedAt = new Date(startedAt.getTime() + Math.random() * 60000); // 0-60 seconds execution time
        const isSuccess = Math.random() > 0.15; // 85% success rate
        const executionType = Math.random() > 0.8 ? 'manual' : 'cron'; // 20% manual, 80% cron
        
        db.prepare(`
          INSERT INTO strategy_executions 
          (strategy_id, started_at, completed_at, status, execution_type)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          strategy.id,
          startedAt.toISOString(),
          completedAt.toISOString(),
          isSuccess ? 'success' : 'failed',
          executionType
        );
      }
    });
  }
}

export const strategyExecutionService = new StrategyExecutionService(); 