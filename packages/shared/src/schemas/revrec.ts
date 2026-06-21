import { z } from "zod";

export const revenueRecognitionMethodSchema = z.enum([
  "immediate",
  "straight_line",
  "usage_based"
]);

export const revenueScheduleStatusSchema = z.enum([
  "draft",
  "generated",
  "posted",
  "void"
]);

export const journalEntryStatusSchema = z.enum(["draft", "posted", "void"]);

export const performanceObligationSchema = z.object({
  id: z.string().uuid(),
  contractLineItemId: z.string().uuid(),
  name: z.string(),
  recognitionMethod: revenueRecognitionMethodSchema,
  serviceStartDate: z.string().nullable(),
  serviceEndDate: z.string().nullable(),
  allocationAmount: z.number().nonnegative(),
  currency: z.string().length(3),
  config: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const revenueScheduleSchema = z.object({
  id: z.string().uuid(),
  invoiceId: z.string().uuid(),
  invoiceLineItemId: z.string().uuid(),
  performanceObligationId: z.string().uuid().nullable(),
  recognitionMethod: revenueRecognitionMethodSchema,
  status: revenueScheduleStatusSchema,
  periodStart: z.string(),
  periodEnd: z.string(),
  recognitionDate: z.string(),
  recognizedAmount: z.number().nonnegative(),
  deferredAmount: z.number().nonnegative(),
  currency: z.string().length(3),
  calculationSnapshot: z.record(z.string(), z.unknown()),
  customerName: z.string().nullable().optional(),
  invoicePeriodStart: z.string().nullable().optional(),
  invoicePeriodEnd: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const journalEntrySchema = z.object({
  id: z.string().uuid(),
  revenueScheduleId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  status: journalEntryStatusSchema,
  entryDate: z.string(),
  debitAccount: z.string(),
  creditAccount: z.string(),
  amount: z.number().nonnegative(),
  currency: z.string().length(3),
  memo: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  customerName: z.string().nullable().optional(),
  postedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const generateRevenueSchedulesSchema = z.object({
  invoiceId: z.string().uuid(),
  recognitionMethod: revenueRecognitionMethodSchema.optional(),
  serviceStartDate: z.string().min(1).optional(),
  serviceEndDate: z.string().min(1).optional()
});

export type GenerateRevenueSchedulesInput = z.output<typeof generateRevenueSchedulesSchema>;
export type JournalEntry = z.infer<typeof journalEntrySchema>;
export type JournalEntryStatus = z.infer<typeof journalEntryStatusSchema>;
export type PerformanceObligation = z.infer<typeof performanceObligationSchema>;
export type RevenueRecognitionMethod = z.infer<typeof revenueRecognitionMethodSchema>;
export type RevenueSchedule = z.infer<typeof revenueScheduleSchema>;
export type RevenueScheduleStatus = z.infer<typeof revenueScheduleStatusSchema>;