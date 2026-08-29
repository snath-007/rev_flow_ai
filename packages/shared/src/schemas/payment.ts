import { z } from "zod";

export const paymentStatusSchema = z.enum(["received", "void"]);
export const paymentAllocationStatusSchema = z.enum(["unapplied", "partial", "applied", "overpayment"]);

export const paymentAllocationSchema = z.object({
  id: z.string().uuid(),
  paymentId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  createdAt: z.string()
});

export const paymentSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  customerName: z.string().nullable(),
  invoiceId: z.string().uuid().nullable(),
  invoiceTotal: z.number().nonnegative().nullable().optional(),
  amount: z.number().positive(),
  allocatedAmount: z.number().nonnegative(),
  unappliedAmount: z.number().nonnegative(),
  currency: z.string().length(3),
  receivedAt: z.string(),
  reference: z.string().nullable(),
  status: paymentStatusSchema,
  allocationStatus: paymentAllocationStatusSchema,
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
  allocations: z.array(paymentAllocationSchema).optional()
});

export const receivePaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  receivedAt: z.string().min(1),
  reference: z.string().trim().min(1).max(120).nullable().optional()
});

export type Payment = z.infer<typeof paymentSchema>;
export type PaymentAllocation = z.infer<typeof paymentAllocationSchema>;
export type PaymentAllocationStatus = z.infer<typeof paymentAllocationStatusSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type ReceivePaymentInput = z.output<typeof receivePaymentSchema>;