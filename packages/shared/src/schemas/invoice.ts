import { z } from "zod";

export const invoiceStatusSchema = z.enum([
  "draft",
  "approved",
  "issued",
  "paid",
  "void",
  "credited"
]);

export const invoiceSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  contractId: z.string().uuid(),
  status: invoiceStatusSchema,
  subtotal: z.number().nonnegative(),
  total: z.number().nonnegative()
});

export type Invoice = z.infer<typeof invoiceSchema>;
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

