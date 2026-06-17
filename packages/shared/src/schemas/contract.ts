import { z } from "zod";

export const contractStatusSchema = z.enum(["draft", "active"]);

export const contractSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  status: contractStatusSchema,
  startDate: z.string(),
  endDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const contractSummarySchema = contractSchema.extend({
  customerName: z.string().nullable(),
  lineItemCount: z.number()
});

export const contractVersionSchema = z.object({
  id: z.string().uuid(),
  contractId: z.string().uuid(),
  versionNumber: z.number().int().positive(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
  termsSnapshot: z.record(z.string(), z.unknown()),
  createdAt: z.string()
});

export const contractLineItemSchema = z.object({
  id: z.string().uuid(),
  contractVersionId: z.string().uuid(),
  priceRuleId: z.string().uuid(),
  name: z.string(),
  overrideConfig: z.record(z.string(), z.unknown()),
  createdAt: z.string()
});

export const contractDetailSchema = contractSchema.extend({
  customerName: z.string().nullable(),
  currentVersion: contractVersionSchema.nullable(),
  lineItems: z.array(contractLineItemSchema)
});

export const createContractSchema = z.object({
  customerId: z.string().uuid(),
  startDate: z.string().min(1),
  endDate: z.string().min(1).nullable().optional()
});

export const addContractLineItemSchema = z.object({
  priceRuleId: z.string().uuid(),
  name: z.string().min(1),
  overrideConfig: z.record(z.string(), z.unknown()).optional()
});

export type AddContractLineItemInput = z.output<typeof addContractLineItemSchema>;
export type Contract = z.infer<typeof contractSchema>;
export type ContractDetail = z.infer<typeof contractDetailSchema>;
export type ContractLineItem = z.infer<typeof contractLineItemSchema>;
export type ContractStatus = z.infer<typeof contractStatusSchema>;
export type ContractSummary = z.infer<typeof contractSummarySchema>;
export type ContractVersion = z.infer<typeof contractVersionSchema>;
export type CreateContractInput = z.output<typeof createContractSchema>;
