import { z } from "zod";

export const usageEventSchema = z.object({
  id: z.string().uuid(),
  idempotencyKey: z.string(),
  meterId: z.string().uuid(),
  contractId: z.string().uuid(),
  quantity: z.number().positive(),
  occurredAt: z.string(),
  properties: z.record(z.string(), z.unknown()),
  createdAt: z.string()
});

export const ingestUsageEventSchema = z.object({
  idempotencyKey: z.string().min(1),
  meterId: z.string().uuid(),
  contractId: z.string().uuid(),
  quantity: z.number().positive(),
  occurredAt: z.string().datetime(),
  properties: z.record(z.string(), z.unknown()).optional()
});

export const aggregateUsageSchema = z.object({
  contractId: z.string().uuid(),
  meterId: z.string().uuid(),
  periodStart: z.string(),
  periodEnd: z.string()
});

export const usageAggregateSchema = z.object({
  id: z.string().uuid().optional(),
  contractId: z.string().uuid(),
  customerName: z.string().nullable(),
  meterId: z.string().uuid(),
  meterName: z.string(),
  aggregationType: z.enum(["sum", "count"]),
  unit: z.string(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  eventCount: z.number(),
  totalQuantity: z.number(),
  billableQuantity: z.number(),
  firstOccurredAt: z.string().nullable(),
  lastOccurredAt: z.string().nullable(),
  calculatedAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export type AggregateUsageInput = z.output<typeof aggregateUsageSchema>;
export type IngestUsageEventInput = z.output<typeof ingestUsageEventSchema>;
export type UsageAggregate = z.infer<typeof usageAggregateSchema>;
export type UsageEvent = z.infer<typeof usageEventSchema>;
