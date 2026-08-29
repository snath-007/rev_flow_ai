import { createSqlClient } from "@revflow/db";
import type { AuditLog } from "@revflow/shared";

import { getAuthenticatedActor, getRequiredWorkspaceId } from "../../lib/request-context.js";

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
  workspaceId?: string;
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
  const workspaceId = getRequiredWorkspaceId();
  const sql = createSqlClient();

  try {
    const rows = await sql<AuditLogRow[]>`
      select id, entity_type, entity_id, action, before_state, after_state, actor, created_at
      from audit_logs
      where workspace_id = ${workspaceId}
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

    const authenticatedActor = getAuthenticatedActor();
    const actor = authenticatedActor?.displayName ?? authenticatedActor?.externalUserId ?? input.actor ?? "system";
    const workspaceId = input.workspaceId ?? authenticatedActor?.workspaceId;

    if (!workspaceId) {
      throw new Error("workspaceId is required for audit writes");
    }

    await sql`
      insert into audit_logs (
        workspace_id,
        entity_type,
        entity_id,
        action,
        before_state,
        after_state,
        actor,
        actor_type,
        actor_external_user_id,
        actor_membership_id,
        actor_role,
        auth_provider
      )
      values (
        ${workspaceId},
        ${input.entityType},
        ${input.entityId},
        ${input.action},
        ${beforeState},
        ${afterState},
        ${actor},
        ${authenticatedActor ? "user" : "system"},
        ${authenticatedActor?.externalUserId ?? null},
        ${authenticatedActor?.membershipId ?? null},
        ${authenticatedActor?.role ?? null},
        ${authenticatedActor?.authProvider ?? "system"}
      )
    `;
  } finally {
    await sql.end({ timeout: 5 });
  }
}
