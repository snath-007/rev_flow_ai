import { z } from "zod";

export const exportDtoVersionSchema = z.literal("revflow-export-v1");

export const exportEntityTypeSchema = z.enum([
  "customers",
  "invoices",
  "payments",
  "journal_entries",
  "revenue_schedules",
]);

export const exportFormatSchema = z.enum(["csv", "json"]);

export const integrationProviderSchema = z.enum([
  "mock_erp",
  "mock_gl",
  "csv",
  "json",
]);

export const integrationRunStatusSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "failed",
  "skipped",
]);

export const exportDuplicateBehaviorSchema = z.enum(["fail", "reuse"]);

export const exportEnvelopeSchema = z.object({
  version: exportDtoVersionSchema,
  workspaceId: z.string().uuid(),
  entityType: exportEntityTypeSchema,
  generatedAt: z.string(),
  idempotencyKey: z.string().min(1),
  exportReference: z.string().min(1).optional(),
  actor: z.string().min(1),
  format: exportFormatSchema,
  recordCount: z.number().int().nonnegative(),
});

export const customerExportDtoSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  billingEmail: z.string().email().nullable(),
  taxId: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const invoiceLineExportDtoSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid().nullable(),
  description: z.string(),
  quantity: z.number(),
  unitAmount: z.number(),
  amount: z.number(),
  currency: z.string(),
});

export const invoiceExportDtoSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  customerId: z.string().uuid(),
  contractId: z.string().uuid().nullable(),
  invoiceNumber: z.string(),
  status: z.string(),
  currency: z.string(),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  issuedAt: z.string().nullable(),
  dueAt: z.string().nullable(),
  lines: z.array(invoiceLineExportDtoSchema),
});

export const paymentExportDtoSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  customerId: z.string().uuid(),
  invoiceId: z.string().uuid().nullable(),
  status: z.string(),
  method: z.string(),
  currency: z.string(),
  amount: z.number(),
  appliedAmount: z.number(),
  unappliedAmount: z.number(),
  receivedAt: z.string(),
  reference: z.string().nullable(),
});

export const journalEntryLineExportDtoSchema = z.object({
  accountCode: z.string(),
  accountName: z.string(),
  debit: z.number(),
  credit: z.number(),
  memo: z.string().nullable(),
});

export const journalEntryExportDtoSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  revenueScheduleId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  entryDate: z.string(),
  status: z.string(),
  currency: z.string(),
  amount: z.number(),
  externalExportReference: z.string().nullable(),
  lines: z.array(journalEntryLineExportDtoSchema).min(2),
});

export const revenueScheduleExportDtoSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  invoiceLineItemId: z.string().uuid(),
  performanceObligationId: z.string().uuid().nullable(),
  status: z.string(),
  currency: z.string(),
  recognitionDate: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  recognizedAmount: z.number(),
  deferredAmount: z.number(),
  externalExportReference: z.string().nullable(),
});

export const exportPayloadSchema = z.discriminatedUnion("entityType", [
  exportEnvelopeSchema.extend({
    entityType: z.literal("customers"),
    records: z.array(customerExportDtoSchema),
  }),
  exportEnvelopeSchema.extend({
    entityType: z.literal("invoices"),
    records: z.array(invoiceExportDtoSchema),
  }),
  exportEnvelopeSchema.extend({
    entityType: z.literal("payments"),
    records: z.array(paymentExportDtoSchema),
  }),
  exportEnvelopeSchema.extend({
    entityType: z.literal("journal_entries"),
    records: z.array(journalEntryExportDtoSchema),
  }),
  exportEnvelopeSchema.extend({
    entityType: z.literal("revenue_schedules"),
    records: z.array(revenueScheduleExportDtoSchema),
  }),
]);

export const createExportRequestSchema = z.object({
  entityType: exportEntityTypeSchema,
  provider: integrationProviderSchema.optional(),
  format: exportFormatSchema.default("json"),
  idempotencyKey: z.string().trim().min(8).max(160).optional(),
  duplicateBehavior: exportDuplicateBehaviorSchema.default("fail"),
  simulateFailure: z.boolean().default(false),
});

export const integrationRunSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  provider: integrationProviderSchema,
  exportType: exportEntityTypeSchema,
  status: integrationRunStatusSchema,
  actor: z.string(),
  idempotencyKey: z.string(),
  exportReference: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  errorSummary: z.string().nullable(),
  metadata: z.record(z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const integrationRunItemSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  integrationRunId: z.string().uuid(),
  entityType: exportEntityTypeSchema,
  entityId: z.string().uuid(),
  status: integrationRunStatusSchema,
  externalReference: z.string().nullable(),
  errorSummary: z.string().nullable(),
  metadata: z.record(z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CustomerExportDto = z.infer<typeof customerExportDtoSchema>;
export type CreateExportRequest = z.output<typeof createExportRequestSchema>;
export type ExportDtoVersion = z.infer<typeof exportDtoVersionSchema>;
export type ExportEntityType = z.infer<typeof exportEntityTypeSchema>;
export type ExportEnvelope = z.infer<typeof exportEnvelopeSchema>;
export type ExportDuplicateBehavior = z.infer<
  typeof exportDuplicateBehaviorSchema
>;
export type ExportFormat = z.infer<typeof exportFormatSchema>;
export type ExportPayload = z.infer<typeof exportPayloadSchema>;
export type IntegrationProvider = z.infer<typeof integrationProviderSchema>;
export type IntegrationRun = z.infer<typeof integrationRunSchema>;
export type IntegrationRunItem = z.infer<typeof integrationRunItemSchema>;
export type IntegrationRunStatus = z.infer<typeof integrationRunStatusSchema>;
export type InvoiceExportDto = z.infer<typeof invoiceExportDtoSchema>;
export type InvoiceLineExportDto = z.infer<typeof invoiceLineExportDtoSchema>;
export type JournalEntryExportDto = z.infer<typeof journalEntryExportDtoSchema>;
export type JournalEntryLineExportDto = z.infer<
  typeof journalEntryLineExportDtoSchema
>;
export type PaymentExportDto = z.infer<typeof paymentExportDtoSchema>;
export type RevenueScheduleExportDto = z.infer<
  typeof revenueScheduleExportDtoSchema
>;
