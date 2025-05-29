import { z } from 'zod';

// DTO Definitions & Schemas
export const signalSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  price: z.number(),
  timestamp: z.date()
});
export type Signal = z.infer<typeof signalSchema>;

export const strategySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  parameters: z.record(z.any()).optional()
});
export type Strategy = z.infer<typeof strategySchema>;

// Utility functions
export function getNowIso(): string {
  return new Date().toISOString();
}

export function tokenMath(amount: number, price: number): number {
  return amount * price;
}

export const dateUtil = {
  nowIso: getNowIso,
  addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60000);
  }
}; 