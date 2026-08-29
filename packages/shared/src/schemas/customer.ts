import { z } from "zod";

export const customerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  billingAddress: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  email: z.string().email("A valid email is required"),
  billingAddress: z.string().optional().nullable()
});

export type Customer = z.infer<typeof customerSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
