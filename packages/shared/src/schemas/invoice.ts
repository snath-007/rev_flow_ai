import { z } from "zod";

export const invoiceStatusSchema = z.enum([
  "draft",
  "approved",
  "issued",
  "paid",
  "void",
  "credited"
]);

export const invoiceLineItemSchema = z.object({
  id: z.string().uuid(),
  invoiceId: z.string().uuid(),
  contractLineItemId: z.string().uuid().nullable(),
  priceRuleId: z.string().uuid(),
  description: z.string(),
  quantity: z.number().nonnegative(),
  unitPrice: z.number().nonnegative(),
  amount: z.number().nonnegative(),
  currency: z.string(),
  calculationSnapshot: z.record(z.string(), z.unknown()),
  createdAt: z.string()
});

export const invoiceSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  contractId: z.string().uuid(),
  customerName: z.string().nullable(),
  status: invoiceStatusSchema,
  periodStart: z.string(),
  periodEnd: z.string(),
  currency: z.string(),
  subtotal: z.number().nonnegative(),
  total: z.number().nonnegative(),
  calculationSnapshot: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
  lineItems: z.array(invoiceLineItemSchema).optional()
});

export const generateInvoiceSchema = z.object({
  contractId: z.string().uuid(),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1)
});

export type GenerateInvoiceInput = z.output<typeof generateInvoiceSchema>;
export type Invoice = z.infer<typeof invoiceSchema>;
export type InvoiceLineItem = z.infer<typeof invoiceLineItemSchema>;
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;
