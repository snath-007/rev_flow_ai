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

export const usageAggregateSchema = z.object({
  contractId: z.string().uuid(),
  customerName: z.string().nullable(),
  meterId: z.string().uuid(),
  meterName: z.string(),
  aggregationType: z.enum(["sum", "count"]),
  unit: z.string(),
  eventCount: z.number(),
  totalQuantity: z.number(),
  billableQuantity: z.number(),
  firstOccurredAt: z.string().nullable(),
  lastOccurredAt: z.string().nullable()
});

export type IngestUsageEventInput = z.output<typeof ingestUsageEventSchema>;
export type UsageAggregate = z.infer<typeof usageAggregateSchema>;
export type UsageEvent = z.infer<typeof usageEventSchema>;
