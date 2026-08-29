import { createSqlClient } from "@revflow/db";
import type { AggregateUsageInput, IngestUsageEventInput } from "@revflow/shared";

import { getRequiredWorkspaceId } from "../../lib/request-context.js";

type DateLike = Date | string;

type UsageEventRow = {
  id: string;
  idempotency_key: string;
  contract_id: string;
  meter_id: string;
  quantity: string;
  occurred_at: Date;
  properties: Record<string, unknown>;
  created_at: Date;
};

type UsageEventMutationRow = UsageEventRow & {
  was_inserted: boolean;
};

type UsageAggregateRow = {
  id: string;
  contract_id: string;
  customer_name: string | null;
  meter_id: string;
  meter_name: string;
  aggregation_type: "sum" | "count";
  unit: string;
  period_start: DateLike;
  period_end: DateLike;
  event_count: string | number;
  total_quantity: string;
  billable_quantity: string;
  first_occurred_at: Date | null;
  last_occurred_at: Date | null;
  calculated_at: Date;
  updated_at: Date;
};

type ContractMeterRow = {
  contract_status: "draft" | "active";
  meter_is_configured: boolean;
};

type AggregateTargetRow = {
  contract_status: "draft" | "active";
  meter_id: string;
  meter_is_configured: boolean;
};

function formatDate(value: DateLike) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function toUsageEvent(row: UsageEventRow) {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    contractId: row.contract_id,
    meterId: row.meter_id,
    quantity: Number(row.quantity),
    occurredAt: row.occurred_at.toISOString(),
    properties: row.properties,
    createdAt: row.created_at.toISOString()
  };
}

function toUsageAggregate(row: UsageAggregateRow) {
  return {
    id: row.id,
    contractId: row.contract_id,
    customerName: row.customer_name,
    meterId: row.meter_id,
    meterName: row.meter_name,
    aggregationType: row.aggregation_type,
    unit: row.unit,
    periodStart: formatDate(row.period_start),
    periodEnd: formatDate(row.period_end),
    eventCount: Number(row.event_count),
    totalQuantity: Number(row.total_quantity),
    billableQuantity: Number(row.billable_quantity),
    firstOccurredAt: row.first_occurred_at ? row.first_occurred_at.toISOString() : null,
    lastOccurredAt: row.last_occurred_at ? row.last_occurred_at.toISOString() : null,
    calculatedAt: row.calculated_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

export async function listUsageEvents() {
  const workspaceId = getRequiredWorkspaceId();
  const sql = createSqlClient();

  try {
    const rows = await sql<UsageEventRow[]>`
      select id, idempotency_key, contract_id, meter_id, quantity, occurred_at, properties, created_at
      from usage_events
      where workspace_id = ${workspaceId}
      order by occurred_at desc, created_at desc
      limit 100
    `;

    return rows.map(toUsageEvent);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function ingestUsageEvent(input: IngestUsageEventInput) {
  const workspaceId = getRequiredWorkspaceId();
  const sql = createSqlClient();

  try {
    return await sql.begin(async (tx) => {
      const contractMeterRows = await tx<ContractMeterRow[]>`
        select
          c.status as contract_status,
          exists (
            select 1
            from contract_versions cv
            join contract_line_items cli on cli.contract_version_id = cv.id
            join price_rules pr on pr.id = cli.price_rule_id
            where cv.contract_id = c.id
              and pr.meter_id = ${input.meterId}
          ) as meter_is_configured
        from contracts c
        where c.workspace_id = ${workspaceId}
          and c.id = ${input.contractId}
        limit 1
      `;
      const contractMeter = contractMeterRows[0];

      if (!contractMeter) {
        return "CONTRACT_NOT_FOUND" as const;
      }

      if (contractMeter.contract_status !== "active") {
        return "CONTRACT_NOT_ACTIVE" as const;
      }

      if (!contractMeter.meter_is_configured) {
        return "METER_NOT_CONFIGURED" as const;
      }

      const rows = await tx<UsageEventMutationRow[]>`
        insert into usage_events (workspace_id, idempotency_key, contract_id, meter_id, quantity, occurred_at, properties)
        values (
          ${workspaceId},
          ${input.idempotencyKey},
          ${input.contractId},
          ${input.meterId},
          ${input.quantity},
          ${input.occurredAt},
          ${tx.json((input.properties ?? {}) as never)}
        )
        on conflict (workspace_id, idempotency_key) do update
        set idempotency_key = excluded.idempotency_key
        returning id, idempotency_key, contract_id, meter_id, quantity, occurred_at, properties, created_at, (xmax = 0) as was_inserted
      `;
      const row = rows[0];

      if (!row) {
        throw new Error("Usage event insert did not return a row");
      }

      return {
        event: toUsageEvent(row),
        wasInserted: row.was_inserted
      };
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function listUsageAggregates() {
  const workspaceId = getRequiredWorkspaceId();
  const sql = createSqlClient();

  try {
    const rows = await sql<UsageAggregateRow[]>`
      select
        ua.id,
        ua.contract_id,
        cst.name as customer_name,
        ua.meter_id,
        m.name as meter_name,
        m.aggregation_type,
        m.unit,
        ua.period_start,
        ua.period_end,
        ua.event_count,
        ua.total_quantity,
        ua.billable_quantity,
        ua.first_occurred_at,
        ua.last_occurred_at,
        ua.calculated_at,
        ua.updated_at
      from usage_aggregates ua
      join meters m on m.id = ua.meter_id
      join contracts c on c.id = ua.contract_id
      join customers cst on cst.id = c.customer_id
      where ua.workspace_id = ${workspaceId}
      order by ua.period_end desc, ua.updated_at desc
      limit 100
    `;

    return rows.map(toUsageAggregate);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function aggregateUsageForPeriod(input: AggregateUsageInput) {
  const workspaceId = getRequiredWorkspaceId();
  const sql = createSqlClient();

  try {
    return await sql.begin(async (tx) => {
      const targetRows = await tx<AggregateTargetRow[]>`
        select
          c.status as contract_status,
          m.id as meter_id,
          exists (
            select 1
            from contract_versions cv
            join contract_line_items cli on cli.contract_version_id = cv.id
            join price_rules pr on pr.id = cli.price_rule_id
            where cv.contract_id = c.id
              and pr.meter_id = ${input.meterId}
          ) as meter_is_configured
        from contracts c
        cross join meters m
        where c.workspace_id = ${workspaceId}
          and c.id = ${input.contractId}
          and m.workspace_id = ${workspaceId}
          and m.id = ${input.meterId}
        limit 1
      `;
      const target = targetRows[0];

      if (!target) {
        return "CONTRACT_OR_METER_NOT_FOUND" as const;
      }

      if (target.contract_status !== "active") {
        return "CONTRACT_NOT_ACTIVE" as const;
      }

      if (!target.meter_is_configured) {
        return "METER_NOT_CONFIGURED" as const;
      }

      const rows = await tx<UsageAggregateRow[]>`
        with calculated as (
          select
            ${input.contractId}::uuid as contract_id,
            ${input.meterId}::uuid as meter_id,
            ${input.periodStart}::date as period_start,
            ${input.periodEnd}::date as period_end,
            count(ue.id)::integer as event_count,
            coalesce(sum(ue.quantity), 0)::numeric as total_quantity,
            case
              when m.aggregation_type = 'count' then count(ue.id)::numeric
              else coalesce(sum(ue.quantity), 0)::numeric
            end as billable_quantity,
            min(ue.occurred_at) as first_occurred_at,
            max(ue.occurred_at) as last_occurred_at
          from meters m
          left join usage_events ue on ue.workspace_id = ${workspaceId}
            and ue.contract_id = ${input.contractId}
            and ue.meter_id = ${input.meterId}
            and ue.occurred_at >= ${input.periodStart}
            and ue.occurred_at < (${input.periodEnd}::date + interval '1 day')
          where m.workspace_id = ${workspaceId}
            and m.id = ${input.meterId}
          group by m.aggregation_type
        )
        insert into usage_aggregates (
          workspace_id,
          contract_id,
          meter_id,
          period_start,
          period_end,
          event_count,
          total_quantity,
          billable_quantity,
          first_occurred_at,
          last_occurred_at,
          calculated_at,
          updated_at
        )
        select
          ${workspaceId},
          contract_id,
          meter_id,
          period_start,
          period_end,
          event_count,
          total_quantity,
          billable_quantity,
          first_occurred_at,
          last_occurred_at,
          now(),
          now()
        from calculated
        on conflict (workspace_id, contract_id, meter_id, period_start, period_end)
        do update set
          event_count = excluded.event_count,
          total_quantity = excluded.total_quantity,
          billable_quantity = excluded.billable_quantity,
          first_occurred_at = excluded.first_occurred_at,
          last_occurred_at = excluded.last_occurred_at,
          calculated_at = excluded.calculated_at,
          updated_at = now()
        returning
          id,
          contract_id,
          null::text as customer_name,
          meter_id,
          (select name from meters where workspace_id = ${workspaceId} and id = usage_aggregates.meter_id) as meter_name,
          (select aggregation_type from meters where workspace_id = ${workspaceId} and id = usage_aggregates.meter_id) as aggregation_type,
          (select unit from meters where workspace_id = ${workspaceId} and id = usage_aggregates.meter_id) as unit,
          period_start,
          period_end,
          event_count,
          total_quantity,
          billable_quantity,
          first_occurred_at,
          last_occurred_at,
          calculated_at,
          updated_at
      `;
      const row = rows[0];

      if (!row) {
        throw new Error("Usage aggregate upsert did not return a row");
      }

      return toUsageAggregate(row);
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

