import { describe, expect, it } from "vitest";
import type { ExportPayload } from "@revflow/shared";

import {
  MockExportAdapterError,
  sendToMockExportAdapter,
} from "./mock-export-adapter.js";

const basePayload = {
  version: "revflow-export-v1",
  workspaceId: "00000000-0000-4000-8000-000000000001",
  generatedAt: "2026-07-03T00:00:00.000Z",
  idempotencyKey: "test-key-0001",
  exportReference: "EXP-TEST0001",
  actor: "test-user",
  format: "json",
  recordCount: 1,
} as const;

const customerPayload: ExportPayload = {
  ...basePayload,
  entityType: "customers",
  records: [
    {
      id: "00000000-0000-4000-8000-000000000101",
      workspaceId: basePayload.workspaceId,
      name: "Acme",
      billingEmail: "finance@acme.test",
      taxId: null,
      status: "active",
      createdAt: basePayload.generatedAt,
      updatedAt: basePayload.generatedAt,
    },
  ],
};

const journalPayload: ExportPayload = {
  ...basePayload,
  entityType: "journal_entries",
  records: [
    {
      id: "00000000-0000-4000-8000-000000000201",
      workspaceId: basePayload.workspaceId,
      revenueScheduleId: "00000000-0000-4000-8000-000000000202",
      invoiceId: "00000000-0000-4000-8000-000000000203",
      entryDate: "2026-07-03",
      status: "posted",
      currency: "USD",
      amount: 100,
      externalExportReference: null,
      lines: [
        {
          accountCode: "Deferred Revenue",
          accountName: "Deferred Revenue",
          debit: 100,
          credit: 0,
          memo: null,
        },
        {
          accountCode: "Revenue",
          accountName: "Revenue",
          debit: 0,
          credit: 100,
          memo: null,
        },
      ],
    },
  ],
};

describe("mock export adapter", () => {
  it("accepts ERP commercial records and returns deterministic references", () => {
    const result = sendToMockExportAdapter({
      provider: "mock_erp",
      payload: customerPayload,
      simulateFailure: false,
    });

    expect(result?.externalBatchId).toBe("ERP-EXP-TEST0001");
    expect(result?.itemReferences[0]?.externalReference).toBe(
      "ERP-EXP-TEST0001-0001",
    );
  });

  it("accepts GL journal exports", () => {
    const result = sendToMockExportAdapter({
      provider: "mock_gl",
      payload: journalPayload,
      simulateFailure: false,
    });

    expect(result?.externalBatchId).toBe("GL-EXP-TEST0001");
    expect(result?.acceptedCount).toBe(1);
  });

  it("rejects unsupported provider/entity combinations", () => {
    expect(() =>
      sendToMockExportAdapter({
        provider: "mock_gl",
        payload: customerPayload,
        simulateFailure: false,
      }),
    ).toThrow(MockExportAdapterError);
  });

  it("can simulate an auditable connector failure", () => {
    expect(() =>
      sendToMockExportAdapter({
        provider: "mock_erp",
        payload: customerPayload,
        simulateFailure: true,
      }),
    ).toThrow("Simulated mock_erp connector failure");
  });
});
