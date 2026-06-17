import { z } from "zod";

import { recordStatusSchema } from "./product.js";

export const billingIntervalSchema = z.enum(["monthly", "annual"]);

export const planSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  name: z.string(),
  billingInterval: billingIntervalSchema,
  status: recordStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});

export const createPlanSchema = z.object({
  productId: z.string().uuid("A product is required"),
  name: z.string().min(1, "Plan name is required"),
  billingInterval: billingIntervalSchema,
  status: recordStatusSchema.optional()
});

export type Plan = z.infer<typeof planSchema>;
export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type BillingInterval = z.infer<typeof billingIntervalSchema>;
