import { z } from "zod";

export const contractStatusSchema = z.enum([
  "draft",
  "pending_review",
  "active",
  "expired",
  "terminated"
]);

export const contractSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  status: contractStatusSchema,
  startDate: z.string(),
  endDate: z.string().nullable()
});

export type Contract = z.infer<typeof contractSchema>;
export type ContractStatus = z.infer<typeof contractStatusSchema>;

