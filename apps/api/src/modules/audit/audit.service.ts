import { createSqlClient } from "@revflow/db";
import type { AuditLog } from "@revflow/shared";

type AuditLogRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  before_state: unknown | null;
  after_state: unknown | null;
  actor: string;
  created_at: Date;
};

export type AuditLogInput = {
  entityType: string;
  entityId: string;
  action: string;
  beforeState?: unknown;
  afterState?: unknown;
  actor?: string;
};

function toAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    beforeState: row.before_state,
    afterState: row.after_state,
    actor: row.actor,
    createdAt: row.created_at.toISOString()
  };
}

export async function listAuditLogs() {
  const sql = createSqlClient();

  try {
    const rows = await sql<AuditLogRow[]>`
      select id, entity_type, entity_id, action, before_state, after_state, actor, created_at
      from audit_logs
      order by created_at desc
      limit 100
    `;

    return rows.map(toAuditLog);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function createAuditLog(input: AuditLogInput) {
  const sql = createSqlClient();

  try {
    const beforeState = input.beforeState === undefined ? null : sql.json(input.beforeState as never);
    const afterState = input.afterState === undefined ? null : sql.json(input.afterState as never);

    await sql`
      insert into audit_logs (
        entity_type,
        entity_id,
        action,
        before_state,
        after_state,
        actor
      )
      values (
        ${input.entityType},
        ${input.entityId},
        ${input.action},
        ${beforeState},
        ${afterState},
        ${input.actor ?? "system"}
      )
    `;
  } finally {
    await sql.end({ timeout: 5 });
  }
}
