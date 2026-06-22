import type { AiExtractionOutput, AiExtractionRun, ReviewAiExtractionInput } from "@revflow/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAuditLog } from "../audit/audit.service.js";
import * as contractsService from "../contracts/contracts.service.js";
import * as customersService from "../customers/customers.service.js";
import * as aiRepository from "./ai.repository.js";
import {
  applyReviewedExtraction,
  createContractExtraction,
  getExtractionRunById,
  reviewContractExtraction
} from "./ai.service.js";
import type { AiProvider } from "./ai.types.js";

vi.mock("./ai.repository.js", () => ({
  listExtractionRuns: vi.fn(),
  getExtractionRunById: vi.fn(),
  createExtractionRun: vi.fn(),
  markExtractionRunExtracting: vi.fn(),
  completeExtractionRun: vi.fn(),
  failExtractionRun: vi.fn(),
  reviewExtractionRun: vi.fn(),
  markExtractionRunApplied: vi.fn()
}));

vi.mock("../audit/audit.service.js", () => ({
  createAuditLog: vi.fn()
}));

vi.mock("../customers/customers.service.js", () => ({
  findCustomerByEmail: vi.fn(),
  createCustomer: vi.fn()
}));

vi.mock("../contracts/contracts.service.js", () => ({
  createContract: vi.fn()
}));

const mockedRepository = vi.mocked(aiRepository);
const mockedCreateAuditLog = vi.mocked(createAuditLog);
const mockedCustomersService = vi.mocked(customersService);
const mockedContractsService = vi.mocked(contractsService);

const reviewedOutput: AiExtractionOutput = {
  summary: "Reviewed contract terms.",
  fields: [
    {
      key: "customer_name",
      label: "Customer name",
      category: "customer",
      value: "Acme Corp",
      confidence: 0.94,
      sourceSnippet: "Customer: Acme Corp",
      ambiguity: null
    },
    {
      key: "customer_email",
      label: "Customer email",
      category: "customer",
      value: "billing@acme.example",
      confidence: 0.94,
      sourceSnippet: "Email: billing@acme.example",
      ambiguity: null
    },
    {
      key: "contract_start_date",
      label: "Contract start date",
      category: "contract",
      value: "2026-07-01",
      confidence: 0.93,
      sourceSnippet: "Effective date: 2026-07-01",
      ambiguity: null
    },
    {
      key: "contract_end_date",
      label: "Contract end date",
      category: "contract",
      value: "2027-06-30",
      confidence: 0.91,
      sourceSnippet: "End date: 2027-06-30",
      ambiguity: null
    }
  ],
  ambiguities: [],
  missingFields: []
};

function extractionRun(overrides: Partial<AiExtractionRun> = {}): AiExtractionRun {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    sourceType: "text",
    sourceName: null,
    sourceText: "Customer: Acme Corp. Billing frequency: monthly.",
    status: "created",
    provider: "mock",
    model: null,
    promptVersion: "contract-extraction-v1",
    structuredOutput: null,
    confidenceSummary: null,
    ambiguities: [],
    errorMessage: null,
    reviewedOutput: null,
    reviewedBy: null,
    reviewedAt: null,
    appliedContractId: null,
    appliedAt: null,
    createdAt: "2026-06-21T00:00:00.000Z",
    updatedAt: "2026-06-21T00:00:00.000Z",
    ...overrides
  };
}

const providerResult = {
  provider: "mock",
  model: "deterministic-contract-parser-v1",
  promptVersion: "contract-extraction-v1",
  output: reviewedOutput,
  confidenceSummary: {
    overall: 0.93,
    highConfidenceCount: 4,
    lowConfidenceCount: 0
  }
};

const reviewInput: ReviewAiExtractionInput = {
  reviewer: "finance@example.com",
  status: "approved",
  fieldDecisions: reviewedOutput.fields.map((field) => ({
    fieldKey: field.key,
    status: "accepted" as const,
    originalValue: field.value,
    reviewedValue: field.value,
    notes: null
  })),
  reviewedOutput,
  notes: "Reviewed against the source contract."
};

describe("AI extraction service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("maps a missing extraction run to a not found API error", async () => {
    mockedRepository.getExtractionRunById.mockResolvedValue(null);

    await expect(
      getExtractionRunById("11111111-1111-4111-8111-111111111111")
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "AI_EXTRACTION_NOT_FOUND"
    });
  });

  it("persists a successful extraction lifecycle and audit events", async () => {
    const createdRun = extractionRun();
    const extractingRun = extractionRun({ status: "extracting" });
    const completedRun = extractionRun({
      status: "extracted",
      model: providerResult.model,
      structuredOutput: providerResult.output,
      confidenceSummary: providerResult.confidenceSummary
    });
    const provider: AiProvider = {
      name: "mock",
      extractContractTerms: vi.fn().mockResolvedValue(providerResult)
    };

    mockedRepository.createExtractionRun.mockResolvedValue(createdRun);
    mockedRepository.markExtractionRunExtracting.mockResolvedValue(extractingRun);
    mockedRepository.completeExtractionRun.mockResolvedValue(completedRun);

    const result = await createContractExtraction(
      { sourceType: "text", sourceText: createdRun.sourceText },
      provider
    );

    expect(result.status).toBe("extracted");
    expect(mockedRepository.completeExtractionRun).toHaveBeenCalledWith(createdRun.id, providerResult);
    expect(mockedCreateAuditLog).toHaveBeenNthCalledWith(2, expect.objectContaining({
      action: "ai_extraction.completed"
    }));
  });

  it("persists provider failures and keeps the failed run auditable", async () => {
    const createdRun = extractionRun();
    const extractingRun = extractionRun({ status: "extracting" });
    const failedRun = extractionRun({ status: "failed", errorMessage: "Mock provider unavailable" });
    const provider: AiProvider = {
      name: "mock",
      extractContractTerms: vi.fn().mockRejectedValue(new Error("Mock provider unavailable"))
    };

    mockedRepository.createExtractionRun.mockResolvedValue(createdRun);
    mockedRepository.markExtractionRunExtracting.mockResolvedValue(extractingRun);
    mockedRepository.failExtractionRun.mockResolvedValue(failedRun);

    await expect(
      createContractExtraction({ sourceType: "text", sourceText: createdRun.sourceText }, provider)
    ).rejects.toThrow("Mock provider unavailable");

    expect(mockedRepository.failExtractionRun).toHaveBeenCalledWith(createdRun.id, "Mock provider unavailable");
    expect(mockedCreateAuditLog).toHaveBeenLastCalledWith(expect.objectContaining({
      action: "ai_extraction.failed"
    }));
  });

  it("persists an approved human review and audit event", async () => {
    const approvedRun = extractionRun({
      status: "approved",
      structuredOutput: reviewedOutput,
      reviewedOutput,
      reviewedBy: reviewInput.reviewer,
      reviewedAt: "2026-06-21T01:00:00.000Z"
    });
    const review = {
      id: "22222222-2222-4222-8222-222222222222",
      extractionRunId: approvedRun.id,
      status: "approved" as const,
      reviewer: reviewInput.reviewer,
      fieldDecisions: reviewInput.fieldDecisions,
      reviewedOutput,
      notes: reviewInput.notes ?? null,
      completedAt: "2026-06-21T01:00:00.000Z",
      createdAt: "2026-06-21T01:00:00.000Z",
      updatedAt: "2026-06-21T01:00:00.000Z"
    };

    mockedRepository.reviewExtractionRun.mockResolvedValue({ run: approvedRun, review });

    const result = await reviewContractExtraction(approvedRun.id, reviewInput);

    expect(result.run.status).toBe("approved");
    expect(mockedCreateAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      entityId: approvedRun.id,
      action: "ai_extraction.approved"
    }));
  });

  it("applies approved output by creating a customer and draft contract", async () => {
    const approvedRun = extractionRun({ status: "approved", reviewedOutput });
    const customer = {
      id: "33333333-3333-4333-8333-333333333333",
      name: "Acme Corp",
      email: "billing@acme.example",
      billingAddress: null,
      createdAt: "2026-06-21T02:00:00.000Z",
      updatedAt: "2026-06-21T02:00:00.000Z"
    };
    const contract = {
      id: "44444444-4444-4444-8444-444444444444",
      customerId: customer.id,
      status: "draft" as const,
      startDate: "2026-07-01",
      endDate: "2027-06-30",
      createdAt: "2026-06-21T02:00:00.000Z",
      updatedAt: "2026-06-21T02:00:00.000Z",
      customerName: null,
      currentVersion: {
        id: "55555555-5555-4555-8555-555555555555",
        contractId: "44444444-4444-4444-8444-444444444444",
        versionNumber: 1,
        effectiveFrom: "2026-07-01",
        effectiveTo: "2027-06-30",
        termsSnapshot: {},
        createdAt: "2026-06-21T02:00:00.000Z"
      },
      lineItems: []
    };    const appliedRun = extractionRun({
      status: "applied",
      reviewedOutput,
      appliedContractId: contract.id,
      appliedAt: "2026-06-21T02:00:00.000Z"
    });

    mockedRepository.getExtractionRunById.mockResolvedValue(approvedRun);
    mockedCustomersService.findCustomerByEmail.mockResolvedValue(null);
    mockedCustomersService.createCustomer.mockResolvedValue(customer);
    mockedContractsService.createContract.mockResolvedValue(contract);
    mockedRepository.markExtractionRunApplied.mockResolvedValue(appliedRun);

    const result = await applyReviewedExtraction(approvedRun.id);

    expect(result.customerCreated).toBe(true);
    expect(result.contract.status).toBe("draft");
    expect(mockedContractsService.createContract).toHaveBeenCalledWith({
      customerId: customer.id,
      startDate: "2026-07-01",
      endDate: "2027-06-30"
    });
    expect(mockedCreateAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: "ai_extraction.applied",
      afterState: expect.objectContaining({
        contractStatus: "draft",
        lineItemsCreated: 0
      })
    }));
  });

  it("does not apply an extraction that has not been approved", async () => {
    mockedRepository.getExtractionRunById.mockResolvedValue(extractionRun({
      status: "extracted",
      structuredOutput: reviewedOutput
    }));

    await expect(
      applyReviewedExtraction("11111111-1111-4111-8111-111111111111")
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "AI_EXTRACTION_NOT_APPROVED"
    });

    expect(mockedContractsService.createContract).not.toHaveBeenCalled();
  });
});