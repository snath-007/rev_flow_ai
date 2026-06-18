import { createSqlClient } from "@revflow/db";
import type { JobRun } from "@revflow/shared";

type JobRunRow = {
  id: string;
  queue_name: string;
  job_name: string;
  job_id: string | null;
  status: "running" | "succeeded" | "failed";
  payload: unknown;
  result: unknown | null;
  error_message: string | null;
  started_at: Date;
  finished_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function toJobRun(row: JobRunRow): JobRun {
  return {
    id: row.id,
    queueName: row.queue_name,
    jobName: row.job_name,
    jobId: row.job_id,
    status: row.status,
    payload: row.payload,
    result: row.result,
    errorMessage: row.error_message,
    startedAt: row.started_at.toISOString(),
    finishedAt: row.finished_at ? row.finished_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

export async function listJobRuns() {
  const sql = createSqlClient();

  try {
    const rows = await sql<JobRunRow[]>`
      select id, queue_name, job_name, job_id, status, payload, result, error_message, started_at, finished_at, created_at, updated_at
      from job_runs
      order by created_at desc
      limit 100
    `;

    return rows.map(toJobRun);
  } finally {
    await sql.end({ timeout: 5 });
  }
}
