export interface StrategyContext {
  id: number;
  name: string;
  triggers: any;
}

export abstract class AbstractStrategy {
  constructor(protected ctx: StrategyContext) {}

  // Entry point when cron fires or manual run
  abstract execute(): Promise<void> | void;

  // Helper to evaluate triggers based on condition object
  protected match(condition: any): boolean {
    if (!condition || typeof condition !== 'object') {
      return true; // Default to true if no condition specified
    }
    
    try {
      // Handle different types of conditions
      if (condition.type === 'cron_only') {
        return true; // Always execute for cron-only strategies
      }
      
      if (condition.price_change) {
        // Price change condition (would need actual price data)
        // For now, return true as we don't have price context here
        console.log(`[Strategy] ${this.ctx.name}: Price change condition detected: ${JSON.stringify(condition.price_change)}`);
        return true;
      }
      
      if (condition.volume_change) {
        // Volume change condition
        console.log(`[Strategy] ${this.ctx.name}: Volume change condition detected: ${JSON.stringify(condition.volume_change)}`);
        return true;
      }
      
      if (condition.time_based) {
        // Time-based conditions
        const now = new Date();
        if (condition.time_based.hours) {
          return condition.time_based.hours.includes(now.getHours());
        }
        if (condition.time_based.day_of_week) {
          return condition.time_based.day_of_week.includes(now.getDay());
        }
      }
      
      if (condition.threshold) {
        // Threshold-based conditions (would need actual data context)
        console.log(`[Strategy] ${this.ctx.name}: Threshold condition detected: ${JSON.stringify(condition.threshold)}`);
        return true;
      }
      
      // If condition structure is unrecognized, default to true
      console.log(`[Strategy] ${this.ctx.name}: Unknown condition type, defaulting to true:`, condition);
      return true;
      
    } catch (error) {
      console.error(`[Strategy] ${this.ctx.name}: Error evaluating condition:`, error);
      return false; // Default to false on error to prevent unwanted executions
    }
  }
} 