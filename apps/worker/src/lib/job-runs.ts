import { createSqlClient } from "@revflow/db";

type CreateJobRunInput = {
  workspaceId: string;
  initiatedByExternalUserId: string;
  queueName: string;
  jobName: string;
  jobId: string | null;
  payload: unknown;
};

export async function createJobRun(input: CreateJobRunInput) {
  const sql = createSqlClient();

  try {
    const rows = await sql<{ id: string }[]>`
      insert into job_runs (workspace_id, queue_name, job_name, job_id, status, payload, started_at, initiated_by_external_user_id)
      values (${input.workspaceId}, ${input.queueName}, ${input.jobName}, ${input.jobId}, 'running', ${sql.json(input.payload as never)}, now(), ${input.initiatedByExternalUserId})
      returning id
    `;

    const row = rows[0];

    if (!row) {
      throw new Error("Job run insert did not return a row");
    }

    return row.id;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function markJobRunSucceeded(workspaceId: string, id: string, result: unknown) {
  const sql = createSqlClient();

  try {
    await sql`
      update job_runs
      set status = 'succeeded',
          result = ${sql.json(result as never)},
          finished_at = now(),
          updated_at = now()
      where workspace_id = ${workspaceId}
        and id = ${id}
    `;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function markJobRunFailed(workspaceId: string, id: string, error: unknown) {
  const sql = createSqlClient();
  const message = error instanceof Error ? error.message : String(error);

  try {
    await sql`
      update job_runs
      set status = 'failed',
          error_message = ${message},
          finished_at = now(),
          updated_at = now()
      where workspace_id = ${workspaceId}
        and id = ${id}
    `;
  } finally {
    await sql.end({ timeout: 5 });
  }
}
