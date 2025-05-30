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
  // Start tracking a strategy execution
  startExecution(strategyId: number, executionType: 'cron' | 'manual'): number {
    const result: any = db.prepare(`
      INSERT INTO strategy_executions (strategy_id, status, execution_type)
      VALUES (?, 'running', ?)
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
  }

  // Mark execution as failed
  failExecution(executionId: number, error?: string): void {
    db.prepare(`
      UPDATE strategy_executions 
      SET status = 'failed', completed_at = CURRENT_TIMESTAMP, error = ?
      WHERE id = ?
    `).run(error || null, executionId);
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

    return {
      strategyId,
      totalRuns: totalRuns.count,
      successfulRuns: successfulRuns.count,
      failedRuns: failedRuns.count,
      successRate,
      lastRun: lastRun?.started_at,
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