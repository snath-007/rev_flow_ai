import { z } from "zod";

export const aiExtractionSourceTypeSchema = z.enum(["text", "document"]);

export const aiExtractionStatusSchema = z.enum([
  "created",
  "extracting",
  "extracted",
  "reviewing",
  "approved",
  "rejected",
  "applied",
  "failed"
]);

export const aiExtractionReviewStatusSchema = z.enum(["in_progress", "approved", "rejected"]);

export const aiFieldDecisionStatusSchema = z.enum(["pending", "accepted", "edited", "rejected"]);

export const aiExtractedFieldCategorySchema = z.enum([
  "customer",
  "contract",
  "billing",
  "product",
  "metering",
  "pricing",
  "revenue_recognition",
  "other"
]);

export const aiExtractedValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null()
]);

export const aiExtractedFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  category: aiExtractedFieldCategorySchema,
  value: aiExtractedValueSchema,
  confidence: z.number().min(0).max(1),
  sourceSnippet: z.string().nullable(),
  ambiguity: z.string().nullable()
});

export const aiExtractionOutputSchema = z.object({
  summary: z.string(),
  fields: z.array(aiExtractedFieldSchema),
  ambiguities: z.array(z.string()),
  missingFields: z.array(z.string())
});

export const aiConfidenceSummarySchema = z.object({
  overall: z.number().min(0).max(1),
  highConfidenceCount: z.number().int().nonnegative(),
  lowConfidenceCount: z.number().int().nonnegative()
});

export const aiFieldDecisionSchema = z.object({
  fieldKey: z.string().min(1),
  status: aiFieldDecisionStatusSchema,
  originalValue: aiExtractedValueSchema,
  reviewedValue: aiExtractedValueSchema,
  notes: z.string().nullable().optional()
});

export const aiExtractionRunSchema = z.object({
  id: z.string().uuid(),
  sourceType: aiExtractionSourceTypeSchema,
  sourceName: z.string().nullable(),
  sourceText: z.string(),
  status: aiExtractionStatusSchema,
  provider: z.string(),
  model: z.string().nullable(),
  promptVersion: z.string(),
  structuredOutput: aiExtractionOutputSchema.nullable(),
  confidenceSummary: aiConfidenceSummarySchema.nullable(),
  ambiguities: z.array(z.string()),
  errorMessage: z.string().nullable(),
  reviewedOutput: aiExtractionOutputSchema.nullable(),
  reviewedBy: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  appliedContractId: z.string().uuid().nullable(),
  appliedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const aiExtractionReviewSchema = z.object({
  id: z.string().uuid(),
  extractionRunId: z.string().uuid(),
  status: aiExtractionReviewStatusSchema,
  reviewer: z.string(),
  fieldDecisions: z.array(aiFieldDecisionSchema),
  reviewedOutput: aiExtractionOutputSchema,
  notes: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const createAiExtractionSchema = z.object({
  sourceType: aiExtractionSourceTypeSchema.default("text"),
  sourceName: z.string().min(1).optional(),
  sourceText: z.string().min(20, "Contract text must contain at least 20 characters")
});

export const reviewAiExtractionSchema = z.object({
  reviewer: z.string().min(1),
  status: z.enum(["approved", "rejected"]),
  fieldDecisions: z.array(aiFieldDecisionSchema).min(1),
  reviewedOutput: aiExtractionOutputSchema,
  notes: z.string().optional()
});

export type AiConfidenceSummary = z.infer<typeof aiConfidenceSummarySchema>;
export type AiExtractedField = z.infer<typeof aiExtractedFieldSchema>;
export type AiExtractedFieldCategory = z.infer<typeof aiExtractedFieldCategorySchema>;
export type AiExtractedValue = z.infer<typeof aiExtractedValueSchema>;
export type AiExtractionOutput = z.infer<typeof aiExtractionOutputSchema>;
export type AiExtractionReview = z.infer<typeof aiExtractionReviewSchema>;
export type AiExtractionReviewStatus = z.infer<typeof aiExtractionReviewStatusSchema>;
export type AiExtractionRun = z.infer<typeof aiExtractionRunSchema>;
export type AiExtractionSourceType = z.infer<typeof aiExtractionSourceTypeSchema>;
export type AiExtractionStatus = z.infer<typeof aiExtractionStatusSchema>;
export type AiFieldDecision = z.infer<typeof aiFieldDecisionSchema>;
export type AiFieldDecisionStatus = z.infer<typeof aiFieldDecisionStatusSchema>;
export type CreateAiExtractionInput = z.output<typeof createAiExtractionSchema>;
export type ReviewAiExtractionInput = z.output<typeof reviewAiExtractionSchema>;