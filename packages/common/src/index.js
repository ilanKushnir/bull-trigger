import { z } from 'zod';
// DTO Definitions & Schemas
export const signalSchema = z.object({
    id: z.string(),
    symbol: z.string(),
    price: z.number(),
    timestamp: z.date()
});
export const strategySchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    parameters: z.record(z.any()).optional()
});
// Utility functions
export function getNowIso() {
    return new Date().toISOString();
}
export function tokenMath(amount, price) {
    return amount * price;
}
export const dateUtil = {
    nowIso: getNowIso,
    addMinutes(date, minutes) {
        return new Date(date.getTime() + minutes * 60000);
    }
};
