import { enqueueUsageAggregationJob } from "@revflow/queues";
import type { AggregateUsageInput, IngestUsageEventInput } from "@revflow/shared";

import { ApiError } from "../../lib/http.js";
import { createAuditLog } from "../audit/audit.service.js";
import { getUsageAggregationPeriod } from "./usage-period.js";
import * as usageRepository from "./usage.repository.js";

export async function listUsageEvents() {
  return usageRepository.listUsageEvents();
}

export async function listUsageAggregates() {
  return usageRepository.listUsageAggregates();
}

export async function aggregateUsageForPeriod(input: AggregateUsageInput) {
  const aggregate = await usageRepository.aggregateUsageForPeriod(input);

  if (aggregate === "CONTRACT_OR_METER_NOT_FOUND") {
    throw new ApiError(404, "CONTRACT_OR_METER_NOT_FOUND", "Contract or meter not found");
  }

  if (aggregate === "CONTRACT_NOT_ACTIVE") {
    throw new ApiError(409, "CONTRACT_NOT_ACTIVE", "Usage can only be aggregated for active contracts");
  }

  if (aggregate === "METER_NOT_CONFIGURED") {
    throw new ApiError(422, "METER_NOT_CONFIGURED", "Meter is not configured on this contract");
  }

  await createAuditLog({
    entityType: "usage_aggregate",
    entityId: aggregate.id,
    action: "usage_aggregate.calculated",
    afterState: aggregate
  });

  return aggregate;
}

async function enqueueAggregationForUsageEvent(event: Awaited<ReturnType<typeof usageRepository.listUsageEvents>>[number]) {
  const period = getUsageAggregationPeriod(event.occurredAt);

  try {
    await enqueueUsageAggregationJob({
      contractId: event.contractId,
      meterId: event.meterId,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd
    });
  } catch (error) {
    console.error(
      `Failed to enqueue usage aggregation for contract ${event.contractId}, meter ${event.meterId}, period ${period.periodStart}..${period.periodEnd}`,
      error
    );
  }
}

export async function ingestUsageEvent(input: IngestUsageEventInput) {
  const result = await usageRepository.ingestUsageEvent(input);

  if (result === "CONTRACT_NOT_FOUND") {
    throw new ApiError(404, "CONTRACT_NOT_FOUND", "Contract not found");
  }

  if (result === "CONTRACT_NOT_ACTIVE") {
    throw new ApiError(409, "CONTRACT_NOT_ACTIVE", "Usage can only be ingested for active contracts");
  }

  if (result === "METER_NOT_CONFIGURED") {
    throw new ApiError(422, "METER_NOT_CONFIGURED", "Meter is not configured on this contract");
  }

  const { event, wasInserted } = result;

  if (wasInserted) {
    await createAuditLog({
      entityType: "usage_event",
      entityId: event.id,
      action: "usage_event.ingested",
      afterState: event
    });

    await enqueueAggregationForUsageEvent(event);
  }

  return event;
}
