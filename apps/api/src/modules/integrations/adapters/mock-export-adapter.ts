import type {
  ExportEntityType,
  ExportPayload,
  IntegrationProvider,
} from "@revflow/shared";

export type MockExportAdapterResult = {
  provider: "mock_erp" | "mock_gl";
  externalBatchId: string;
  acceptedCount: number;
  failedCount: number;
  itemReferences: { entityId: string; externalReference: string }[];
};

export class MockExportAdapterError extends Error {
  constructor(
    message: string,
    public readonly details: {
      provider: "mock_erp" | "mock_gl";
      code: string;
      failedEntityIds: string[];
    },
  ) {
    super(message);
  }
}

const erpEntityTypes = new Set<ExportEntityType>([
  "customers",
  "invoices",
  "payments",
]);
const glEntityTypes = new Set<ExportEntityType>([
  "journal_entries",
  "revenue_schedules",
]);

function assertSupported(
  provider: "mock_erp" | "mock_gl",
  entityType: ExportEntityType,
) {
  const supported = provider === "mock_erp" ? erpEntityTypes : glEntityTypes;
  if (!supported.has(entityType)) {
    throw new MockExportAdapterError(
      `${provider} does not accept ${entityType} exports`,
      {
        provider,
        code: "MOCK_CONNECTOR_UNSUPPORTED_ENTITY",
        failedEntityIds: [],
      },
    );
  }
}

function batchId(
  provider: "mock_erp" | "mock_gl",
  exportReference: string | undefined,
) {
  const prefix = provider === "mock_erp" ? "ERP" : "GL";
  return `${prefix}-${exportReference ?? "UNREFERENCED"}`;
}

export function sendToMockExportAdapter(input: {
  provider: IntegrationProvider;
  payload: ExportPayload;
  simulateFailure: boolean;
}): MockExportAdapterResult | null {
  if (input.provider !== "mock_erp" && input.provider !== "mock_gl") {
    return null;
  }

  assertSupported(input.provider, input.payload.entityType);
  const entityIds = input.payload.records.map((record) => record.id);

  if (input.simulateFailure) {
    throw new MockExportAdapterError(
      `Simulated ${input.provider} connector failure`,
      {
        provider: input.provider,
        code: "MOCK_CONNECTOR_SIMULATED_FAILURE",
        failedEntityIds: entityIds.slice(
          0,
          Math.max(1, Math.min(3, entityIds.length)),
        ),
      },
    );
  }

  const externalBatchId = batchId(
    input.provider,
    input.payload.exportReference,
  );

  return {
    provider: input.provider,
    externalBatchId,
    acceptedCount: entityIds.length,
    failedCount: 0,
    itemReferences: entityIds.map((entityId, index) => ({
      entityId,
      externalReference: `${externalBatchId}-${String(index + 1).padStart(4, "0")}`,
    })),
  };
}
