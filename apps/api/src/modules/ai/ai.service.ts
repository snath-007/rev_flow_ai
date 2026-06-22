import {
  aiConfidenceSummarySchema,
  aiExtractionOutputSchema,
  createContractSchema,
  createCustomerSchema,
  type AiExtractionOutput,
  type CreateAiExtractionInput,
  type ReviewAiExtractionInput
} from "@revflow/shared";

import { ApiError } from "../../lib/http.js";
import { createAuditLog } from "../audit/audit.service.js";
import * as contractsService from "../contracts/contracts.service.js";
import * as customersService from "../customers/customers.service.js";
import * as aiRepository from "./ai.repository.js";
import type { AiProvider } from "./ai.types.js";
import { CONTRACT_EXTRACTION_PROMPT_VERSION } from "./prompts/contract-extraction.js";
import { getAiProvider } from "./providers/ai-provider.js";

export async function listExtractionRuns() {
  return aiRepository.listExtractionRuns();
}

export async function getExtractionRunById(id: string) {
  const run = await aiRepository.getExtractionRunById(id);

  if (!run) {
    throw new ApiError(404, "AI_EXTRACTION_NOT_FOUND", "AI extraction run not found");
  }

  return run;
}

export async function createContractExtraction(
  input: CreateAiExtractionInput,
  provider: AiProvider = getAiProvider()
) {
  const run = await aiRepository.createExtractionRun(
    input,
    provider.name,
    CONTRACT_EXTRACTION_PROMPT_VERSION
  );

  await createAuditLog({
    entityType: "ai_extraction_run",
    entityId: run.id,
    action: "ai_extraction.created",
    afterState: {
      status: run.status,
      sourceType: run.sourceType,
      sourceName: run.sourceName,
      provider: run.provider,
      promptVersion: run.promptVersion
    }
  });

  const extractingRun = await aiRepository.markExtractionRunExtracting(run.id);

  if (!extractingRun) {
    throw new Error("AI extraction run could not transition to extracting");
  }

  try {
    const providerResult = await provider.extractContractTerms({
      sourceText: input.sourceText,
      sourceName: input.sourceName ?? null
    });
    const validatedResult = {
      ...providerResult,
      output: aiExtractionOutputSchema.parse(providerResult.output),
      confidenceSummary: aiConfidenceSummarySchema.parse(providerResult.confidenceSummary)
    };
    const completedRun = await aiRepository.completeExtractionRun(run.id, validatedResult);

    if (!completedRun) {
      throw new Error("AI extraction run could not transition to extracted");
    }

    await createAuditLog({
      entityType: "ai_extraction_run",
      entityId: completedRun.id,
      action: "ai_extraction.completed",
      beforeState: { status: extractingRun.status },
      afterState: {
        status: completedRun.status,
        provider: completedRun.provider,
        model: completedRun.model,
        promptVersion: completedRun.promptVersion,
        confidenceSummary: completedRun.confidenceSummary,
        ambiguityCount: completedRun.ambiguities.length,
        extractedFieldCount: completedRun.structuredOutput?.fields.length ?? 0
      }
    });

    return completedRun;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "AI extraction failed";
    const failedRun = await aiRepository.failExtractionRun(run.id, errorMessage);

    await createAuditLog({
      entityType: "ai_extraction_run",
      entityId: run.id,
      action: "ai_extraction.failed",
      beforeState: { status: extractingRun.status },
      afterState: {
        status: failedRun?.status ?? "failed",
        provider: provider.name,
        errorMessage
      }
    });

    throw error;
  }
}

export async function reviewContractExtraction(id: string, input: ReviewAiExtractionInput) {
  const result = await aiRepository.reviewExtractionRun(id, input);

  if (result === "AI_EXTRACTION_NOT_FOUND") {
    throw new ApiError(404, "AI_EXTRACTION_NOT_FOUND", "AI extraction run not found");
  }

  if (result === "AI_EXTRACTION_NOT_REVIEWABLE") {
    throw new ApiError(
      409,
      "AI_EXTRACTION_NOT_REVIEWABLE",
      "Only extracted or in-review AI extraction runs can be reviewed"
    );
  }

  await createAuditLog({
    entityType: "ai_extraction_run",
    entityId: result.run.id,
    action: input.status === "approved" ? "ai_extraction.approved" : "ai_extraction.rejected",
    actor: input.reviewer,
    beforeState: { status: "extracted" },
    afterState: {
      status: result.run.status,
      reviewer: result.review.reviewer,
      acceptedFieldCount: input.fieldDecisions.filter((decision) => decision.status === "accepted").length,
      editedFieldCount: input.fieldDecisions.filter((decision) => decision.status === "edited").length,
      rejectedFieldCount: input.fieldDecisions.filter((decision) => decision.status === "rejected").length,
      notes: result.review.notes
    }
  });

  return result;
}

function reviewedFieldValue(output: AiExtractionOutput, key: string) {
  return output.fields.find((field) => field.key === key)?.value ?? null;
}

function requiredReviewedString(output: AiExtractionOutput, key: string, label: string) {
  const value = reviewedFieldValue(output, key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(
      422,
      "AI_EXTRACTION_APPLY_DATA_INCOMPLETE",
      `${label} must be reviewed before applying this extraction`
    );
  }

  return value.trim();
}

export async function applyReviewedExtraction(id: string) {
  const run = await getExtractionRunById(id);

  if (run.status === "applied") {
    throw new ApiError(409, "AI_EXTRACTION_ALREADY_APPLIED", "AI extraction has already been applied");
  }

  if (run.status !== "approved" || !run.reviewedOutput) {
    throw new ApiError(
      409,
      "AI_EXTRACTION_NOT_APPROVED",
      "AI extraction must be reviewed and approved before it can be applied"
    );
  }

  const customerInputResult = createCustomerSchema.safeParse({
    name: requiredReviewedString(run.reviewedOutput, "customer_name", "Customer name"),
    email: requiredReviewedString(run.reviewedOutput, "customer_email", "Customer email"),
    billingAddress: null
  });

  if (!customerInputResult.success) {
    throw new ApiError(
      422,
      "AI_EXTRACTION_APPLY_DATA_INVALID",
      "Reviewed customer data is invalid",
      customerInputResult.error.flatten()
    );
  }

  const existingCustomer = await customersService.findCustomerByEmail(customerInputResult.data.email);
  const customer = existingCustomer ?? await customersService.createCustomer(customerInputResult.data);
  const endDateValue = reviewedFieldValue(run.reviewedOutput, "contract_end_date");
  const contractInputResult = createContractSchema.safeParse({
    customerId: customer.id,
    startDate: requiredReviewedString(run.reviewedOutput, "contract_start_date", "Contract start date"),
    endDate: typeof endDateValue === "string" && endDateValue.trim() ? endDateValue.trim() : null
  });

  if (!contractInputResult.success) {
    throw new ApiError(
      422,
      "AI_EXTRACTION_APPLY_DATA_INVALID",
      "Reviewed contract data is invalid",
      contractInputResult.error.flatten()
    );
  }

  const contract = await contractsService.createContract(contractInputResult.data);
  const appliedRun = await aiRepository.markExtractionRunApplied(run.id, contract.id);

  if (!appliedRun) {
    throw new ApiError(409, "AI_EXTRACTION_APPLY_CONFLICT", "AI extraction could not be marked as applied");
  }

  await createAuditLog({
    entityType: "ai_extraction_run",
    entityId: appliedRun.id,
    action: "ai_extraction.applied",
    actor: run.reviewedBy ?? "system",
    beforeState: { status: run.status },
    afterState: {
      status: appliedRun.status,
      customerId: customer.id,
      customerCreated: !existingCustomer,
      contractId: contract.id,
      contractStatus: contract.status,
      lineItemsCreated: 0
    }
  });

  return {
    extraction: appliedRun,
    customer,
    customerCreated: !existingCustomer,
    contract
  };
}