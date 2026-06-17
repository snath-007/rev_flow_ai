import type { IngestUsageEventInput } from "@revflow/shared";

import { ApiError } from "../../lib/http.js";
import { createAuditLog } from "../audit/audit.service.js";
import * as usageRepository from "./usage.repository.js";

export async function listUsageEvents() {
  return usageRepository.listUsageEvents();
}

export async function listUsageAggregates() {
  return usageRepository.listUsageAggregates();
}

export async function ingestUsageEvent(input: IngestUsageEventInput) {
  const event = await usageRepository.ingestUsageEvent(input);

  if (event === "CONTRACT_NOT_FOUND") {
    throw new ApiError(404, "CONTRACT_NOT_FOUND", "Contract not found");
  }

  if (event === "CONTRACT_NOT_ACTIVE") {
    throw new ApiError(409, "CONTRACT_NOT_ACTIVE", "Usage can only be ingested for active contracts");
  }

  if (event === "METER_NOT_CONFIGURED") {
    throw new ApiError(422, "METER_NOT_CONFIGURED", "Meter is not configured on this contract");
  }

  await createAuditLog({
    entityType: "usage_event",
    entityId: event.id,
    action: "usage_event.ingested",
    afterState: event
  });

  return event;
}
