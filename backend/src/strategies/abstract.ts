export interface StrategyContext {
  id: number;
  name: string;
  triggers: any;
}

export abstract class AbstractStrategy {
  constructor(protected ctx: StrategyContext) {}

  // Entry point when cron fires or manual run
  abstract execute(): Promise<void> | void;

  // Helper to evaluate triggers (placeholder)
  protected match(condition: any): boolean {
    return true;
  }
} 