import { z } from "zod";

export const aggregationTypeSchema = z.enum(["sum", "count"]);

export const meterSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  name: z.string(),
  eventName: z.string(),
  aggregationType: aggregationTypeSchema,
  unit: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const createMeterSchema = z.object({
  productId: z.string().uuid("A product is required"),
  name: z.string().min(1, "Meter name is required"),
  eventName: z.string().min(1, "Event name is required"),
  aggregationType: aggregationTypeSchema,
  unit: z.string().min(1, "Unit is required")
});

export type Meter = z.infer<typeof meterSchema>;
export type CreateMeterInput = z.infer<typeof createMeterSchema>;
export type AggregationType = z.infer<typeof aggregationTypeSchema>;
