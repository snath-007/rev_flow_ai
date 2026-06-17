import { createSqlClient } from "@revflow/db";
import type { IngestUsageEventInput } from "@revflow/shared";

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

type UsageAggregateRow = {
  contract_id: string;
  customer_name: string | null;
  meter_id: string;
  meter_name: string;
  aggregation_type: "sum" | "count";
  unit: string;
  event_count: string | number;
  total_quantity: string;
  billable_quantity: string;
  first_occurred_at: Date | null;
  last_occurred_at: Date | null;
};

type ContractMeterRow = {
  contract_status: "draft" | "active";
  meter_is_configured: boolean;
};

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
    contractId: row.contract_id,
    customerName: row.customer_name,
    meterId: row.meter_id,
    meterName: row.meter_name,
    aggregationType: row.aggregation_type,
    unit: row.unit,
    eventCount: Number(row.event_count),
    totalQuantity: Number(row.total_quantity),
    billableQuantity: Number(row.billable_quantity),
    firstOccurredAt: row.first_occurred_at ? row.first_occurred_at.toISOString() : null,
    lastOccurredAt: row.last_occurred_at ? row.last_occurred_at.toISOString() : null
  };
}

export async function listUsageEvents() {
  const sql = createSqlClient();

  try {
    const rows = await sql<UsageEventRow[]>`
      select id, idempotency_key, contract_id, meter_id, quantity, occurred_at, properties, created_at
      from usage_events
      order by occurred_at desc, created_at desc
      limit 100
    `;

    return rows.map(toUsageEvent);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function ingestUsageEvent(input: IngestUsageEventInput) {
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
        where c.id = ${input.contractId}
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

      const rows = await tx<UsageEventRow[]>`
        insert into usage_events (idempotency_key, contract_id, meter_id, quantity, occurred_at, properties)
        values (
          ${input.idempotencyKey},
          ${input.contractId},
          ${input.meterId},
          ${input.quantity},
          ${input.occurredAt},
          ${tx.json((input.properties ?? {}) as never)}
        )
        on conflict (idempotency_key) do update
        set idempotency_key = excluded.idempotency_key
        returning id, idempotency_key, contract_id, meter_id, quantity, occurred_at, properties, created_at
      `;
      const row = rows[0];

      if (!row) {
        throw new Error("Usage event insert did not return a row");
      }

      return toUsageEvent(row);
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function listUsageAggregates() {
  const sql = createSqlClient();

  try {
    const rows = await sql<UsageAggregateRow[]>`
      select
        ue.contract_id,
        cst.name as customer_name,
        ue.meter_id,
        m.name as meter_name,
        m.aggregation_type,
        m.unit,
        count(ue.id) as event_count,
        sum(ue.quantity) as total_quantity,
        case
          when m.aggregation_type = 'count' then count(ue.id)::numeric
          else sum(ue.quantity)
        end as billable_quantity,
        min(ue.occurred_at) as first_occurred_at,
        max(ue.occurred_at) as last_occurred_at
      from usage_events ue
      join meters m on m.id = ue.meter_id
      join contracts c on c.id = ue.contract_id
      join customers cst on cst.id = c.customer_id
      group by ue.contract_id, cst.name, ue.meter_id, m.name, m.aggregation_type, m.unit
      order by last_occurred_at desc
    `;

    return rows.map(toUsageAggregate);
  } finally {
    await sql.end({ timeout: 5 });
  }
}
