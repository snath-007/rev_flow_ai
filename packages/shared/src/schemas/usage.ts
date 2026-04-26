import { z } from "zod";

export const usageEventSchema = z.object({
  idempotencyKey: z.string().min(1),
  meterId: z.string().uuid(),
  contractId: z.string().uuid(),
  quantity: z.number().positive(),
  occurredAt: z.string().datetime()
});

export type UsageEventInput = z.infer<typeof usageEventSchema>;

