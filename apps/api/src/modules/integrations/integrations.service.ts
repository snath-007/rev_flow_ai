import { randomUUID } from "node:crypto";

import { createSqlClient } from "@revflow/db";
import {
  exportPayloadSchema,
  type CreateExportRequest,
  type ExportEntityType,
  type ExportFormat,
  type ExportPayload,
} from "@revflow/shared";

import { ApiError } from "../../lib/http.js";
import {
  getRequiredAuthenticatedActor,
  getRequiredWorkspaceId,
} from "../../lib/request-context.js";
import {
  MockExportAdapterError,
  sendToMockExportAdapter,
} from "./adapters/mock-export-adapter.js";
import * as integrationsRepository from "./integrations.repository.js";
import type { Sql } from "./integrations.repository.js";

const EXPORT_VERSION = "revflow-export-v1" as const;

type ExportRecord = ExportPayload["records"][number];

function actorLabel() {
  const actor = getRequiredAuthenticatedActor();
  return actor.displayName ?? actor.externalUserId ?? actor.membershipId;
}

function providerForRequest(input: CreateExportRequest) {
  return (
    input.provider ?? integrationsRepository.providerForFormat(input.format)
  );
}

function generatedKey(input: CreateExportRequest) {
  return `${providerForRequest(input)}:${input.entityType}:${input.format}:${randomUUID()}`;
}

async function recordsForEntity(sql: Sql, entityType: ExportEntityType) {
  switch (entityType) {
    case "customers":
      return integrationsRepository.listCustomersForExport(sql);
    case "invoices":
      return integrationsRepository.listInvoicesForExport(sql);
    case "payments":
      return integrationsRepository.listPaymentsForExport(sql);
    case "journal_entries":
      return integrationsRepository.listJournalEntriesForExport(sql);
    case "revenue_schedules":
      return integrationsRepository.listRevenueSchedulesForExport(sql);
    default:
      entityType satisfies never;
      throw new ApiError(
        400,
        "UNSUPPORTED_EXPORT_TYPE",
        "Unsupported export entity type",
      );
  }
}

async function buildPayload(
  sql: Sql,
  input: CreateExportRequest,
  idempotencyKey: string,
  exportReference: string | null,
) {
  const workspaceId = getRequiredWorkspaceId();
  const records = await recordsForEntity(sql, input.entityType);

  return exportPayloadSchema.parse({
    version: EXPORT_VERSION,
    workspaceId,
    entityType: input.entityType,
    generatedAt: new Date().toISOString(),
    idempotencyKey,
    exportReference: exportReference ?? undefined,
    actor: actorLabel(),
    format: input.format,
    recordCount: records.length,
    records,
  });
}

function recordIds(payload: ExportPayload) {
  return payload.records.map((record: ExportRecord) => record.id);
}

function csvValue(value: unknown) {
  if (value === null || value === undefined) return "";
  const text =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/[,"\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(payload: ExportPayload) {
  const records = payload.records as Array<Record<string, unknown>>;
  const headers = Array.from(
    new Set(records.flatMap((record) => Object.keys(record))),
  );
  const rows = [headers.join(",")];

  for (const record of records) {
    rows.push(headers.map((header) => csvValue(record[header])).join(","));
  }

  return `${rows.join("\n")}\n`;
}

export async function createExport(input: CreateExportRequest) {
  const sql = createSqlClient();
  const idempotencyKey = input.idempotencyKey ?? generatedKey(input);
  const provider = providerForRequest(input);

  try {
    return await sql.begin(async (tx) => {
      const existingRun = await integrationsRepository.findRunByIdempotency(
        tx,
        {
          provider,
          exportType: input.entityType,
          idempotencyKey,
        },
      );

      if (existingRun) {
        if (input.duplicateBehavior === "fail") {
          throw new ApiError(
            409,
            "EXPORT_IDEMPOTENCY_CONFLICT",
            "An export already exists for this idempotency key",
            {
              integrationRunId: existingRun.id,
              exportReference: existingRun.exportReference,
            },
          );
        }

        const payload = await buildPayload(
          tx,
          input,
          idempotencyKey,
          existingRun.exportReference,
        );
        return { run: existingRun, payload, duplicate: true };
      }

      const run = await integrationsRepository.createRun(tx, {
        provider,
        exportType: input.entityType,
        actor: actorLabel(),
        idempotencyKey,
        format: input.format,
      });
      const payload = await buildPayload(
        tx,
        input,
        idempotencyKey,
        run.exportReference,
      );
      await integrationsRepository.insertRunItems(tx, {
        runId: run.id,
        entityType: input.entityType,
        entityIds: recordIds(payload),
      });
      const completedRun = await integrationsRepository.completeRun(tx, {
        runId: run.id,
        recordCount: payload.recordCount,
        format: input.format,
        version: payload.version,
      });

      return { run: completedRun, payload, duplicate: false };
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export function fileNameFor(
  entityType: ExportEntityType,
  format: ExportFormat,
) {
  return `revflow-${entityType.replace(/_/g, "-")}-export.${format}`;
}
