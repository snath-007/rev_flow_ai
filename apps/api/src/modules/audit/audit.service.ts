import { createSqlClient } from "@revflow/db";

export type AuditLogInput = {
  entityType: string;
  entityId: string;
  action: string;
  beforeState?: unknown;
  afterState?: unknown;
  actor?: string;
};

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
