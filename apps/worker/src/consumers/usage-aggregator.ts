import { createSqlClient } from "@revflow/db";
import { getRedisConnectionOptions, queueNames, type UsageAggregationJob } from "@revflow/queues";
import { Worker, type Job } from "bullmq";

import { createJobRun, markJobRunFailed, markJobRunSucceeded } from "../lib/job-runs.js";

type UsageAggregateRow = {
  id: string;
  contract_id: string;
  meter_id: string;
  period_start: Date | string;
  period_end: Date | string;
  event_count: string | number;
  total_quantity: string;
  billable_quantity: string;
};

export async function aggregateUsageForPeriod(data: UsageAggregationJob) {
  const sql = createSqlClient();

  try {
    return await sql.begin(async (tx) => {
      const rows = await tx<UsageAggregateRow[]>`
        with target as (
          select c.id as contract_id, m.id as meter_id, m.aggregation_type
          from contracts c
          join meters m on m.workspace_id = ${data.workspaceId}
            and m.id = ${data.meterId}
          where c.workspace_id = ${data.workspaceId}
            and c.id = ${data.contractId}
            and c.status = 'active'
            and exists (
              select 1
              from contract_versions cv
              join contract_line_items cli on cli.contract_version_id = cv.id
              join price_rules pr on pr.id = cli.price_rule_id
              where cv.contract_id = c.id
                and pr.meter_id = m.id
            )
          limit 1
        ),
        calculated as (
          select
            target.contract_id,
            target.meter_id,
            ${data.periodStart}::date as period_start,
            ${data.periodEnd}::date as period_end,
            count(ue.id)::integer as event_count,
            coalesce(sum(ue.quantity), 0)::numeric as total_quantity,
            case
              when target.aggregation_type = 'count' then count(ue.id)::numeric
              else coalesce(sum(ue.quantity), 0)::numeric
            end as billable_quantity,
            min(ue.occurred_at) as first_occurred_at,
            max(ue.occurred_at) as last_occurred_at
          from target
          left join usage_events ue on ue.workspace_id = ${data.workspaceId}
            and ue.contract_id = target.contract_id
            and ue.meter_id = target.meter_id
            and ue.occurred_at >= ${data.periodStart}
            and ue.occurred_at < (${data.periodEnd}::date + interval '1 day')
          group by target.contract_id, target.meter_id, target.aggregation_type
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
          ${data.workspaceId},
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
        returning id, contract_id, meter_id, period_start, period_end, event_count, total_quantity, billable_quantity
      `;
      const aggregate = rows[0];

      if (!aggregate) {
        throw new Error(
          `No active contract/meter aggregate target found for contract ${data.contractId} and meter ${data.meterId}`
        );
      }

      return {
        id: aggregate.id,
        contractId: aggregate.contract_id,
        meterId: aggregate.meter_id,
        periodStart: aggregate.period_start instanceof Date ? aggregate.period_start.toISOString().slice(0, 10) : aggregate.period_start,
        periodEnd: aggregate.period_end instanceof Date ? aggregate.period_end.toISOString().slice(0, 10) : aggregate.period_end,
        eventCount: Number(aggregate.event_count),
        totalQuantity: Number(aggregate.total_quantity),
        billableQuantity: Number(aggregate.billable_quantity)
      };
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export function createUsageAggregatorWorker() {
  return new Worker<UsageAggregationJob, Awaited<ReturnType<typeof aggregateUsageForPeriod>>, "usage.aggregate">(
    queueNames.usageAggregation,
    async (job: Job<UsageAggregationJob, Awaited<ReturnType<typeof aggregateUsageForPeriod>>, "usage.aggregate">) => {
      const jobRunId = await createJobRun({
        queueName: job.queueName,
        jobName: job.name,
        jobId: job.id ?? null,
        workspaceId: job.data.workspaceId,
        initiatedByExternalUserId: job.data.initiatedByExternalUserId,
        payload: job.data
      });

      try {
        const aggregate = await aggregateUsageForPeriod(job.data);
        await markJobRunSucceeded(job.data.workspaceId, jobRunId, aggregate);
        console.log(
          `Usage aggregate ${aggregate.id} refreshed for contract ${aggregate.contractId}, meter ${aggregate.meterId}, period ${aggregate.periodStart}..${aggregate.periodEnd}`
        );
        return aggregate;
      } catch (error) {
        await markJobRunFailed(job.data.workspaceId, jobRunId, error);
        throw error;
      }
    },
    {
      connection: getRedisConnectionOptions()
    }
  );
}

