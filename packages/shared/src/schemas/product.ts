import { z } from "zod";

export const recordStatusSchema = z.enum(["active", "archived"]);

export const productSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  status: recordStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});

export const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional().nullable(),
  status: recordStatusSchema.optional()
});

export type Product = z.infer<typeof productSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type RecordStatus = z.infer<typeof recordStatusSchema>;
