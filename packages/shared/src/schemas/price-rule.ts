import { z } from "zod";

export const pricingModelSchema = z.enum(["flat", "per_unit", "tiered"]);

export const priceRuleSchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  meterId: z.string().uuid().nullable(),
  pricingModel: pricingModelSchema,
  unitPrice: z.number().nonnegative(),
  currency: z.string().length(3),
  config: z.record(z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const createPriceRuleSchema = z.object({
  planId: z.string().uuid("A plan is required"),
  meterId: z.string().uuid().optional().nullable(),
  pricingModel: pricingModelSchema,
  unitPrice: z.number().nonnegative(),
  currency: z.string().length(3).default("USD"),
  config: z.record(z.unknown()).optional()
});

export type PriceRule = z.infer<typeof priceRuleSchema>;
export type CreatePriceRuleInput = z.output<typeof createPriceRuleSchema>;
export type PricingModel = z.infer<typeof pricingModelSchema>;

