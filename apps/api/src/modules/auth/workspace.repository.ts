import { createSqlClient } from "@revflow/db";
import { roleCapabilities, type OnboardWorkspaceInput, type WorkspaceRole } from "@revflow/shared";

import type { VerifiedIdentity, WorkspaceContext } from "./auth.types.js";

type WorkspaceContextRow = {
  workspace_id: string;
  workspace_name: string;
  workspace_slug: string;
  workspace_status: "active" | "suspended";
  external_provider: "clerk" | "local";
  external_organization_id: string;
  workspace_created_at: Date;
  workspace_updated_at: Date;
  membership_id: string;
  external_user_id: string;
  membership_role: WorkspaceRole;
};

function databaseProvider(identity: VerifiedIdentity) {
  return identity.authProvider === "clerk" ? ("clerk" as const) : ("local" as const);
}

function toWorkspaceContext(row: WorkspaceContextRow, identity: VerifiedIdentity): WorkspaceContext {
  return {
    workspace: {
      id: row.workspace_id,
      name: row.workspace_name,
      slug: row.workspace_slug,
      status: row.workspace_status,
      externalProvider: row.external_provider,
      externalOrganizationId: row.external_organization_id,
      createdAt: row.workspace_created_at.toISOString(),
      updatedAt: row.workspace_updated_at.toISOString()
    },
    actor: {
      userId: null,
      externalUserId: row.external_user_id,
      workspaceId: row.workspace_id,
      externalOrganizationId: row.external_organization_id,
      membershipId: row.membership_id,
      role: row.membership_role,
      capabilities: [...roleCapabilities[row.membership_role]],
      displayName: identity.displayName,
      sessionId: identity.sessionId,
      authProvider: identity.authProvider
    }
  };
}

export async function findWorkspaceContext(identity: VerifiedIdentity) {
  const sql = createSqlClient();

  try {
    const provider = databaseProvider(identity);
    const rows = await sql<WorkspaceContextRow[]>`
      select
        w.id as workspace_id,
        w.name as workspace_name,
        w.slug as workspace_slug,
        w.status as workspace_status,
        w.external_provider,
        w.external_organization_id,
        w.created_at as workspace_created_at,
        w.updated_at as workspace_updated_at,
        wm.id as membership_id,
        wm.external_user_id,
        wm.role as membership_role
      from workspaces w
      join workspace_memberships wm on wm.workspace_id = w.id
      where w.external_provider = ${provider}
        and w.external_organization_id = ${identity.externalOrganizationId}
        and w.status = 'active'
        and wm.external_user_id = ${identity.externalUserId}
        and wm.status = 'active'
      limit 1
    `;

    return rows[0] ? toWorkspaceContext(rows[0], identity) : null;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function roleForNewMembership(identity: VerifiedIdentity, workspaceCreated: boolean): WorkspaceRole {
  if (workspaceCreated || identity.organizationRole?.toLowerCase().includes("admin")) {
    return "workspace_admin";
  }

  return "finance_operator";
}

export async function onboardWorkspace(identity: VerifiedIdentity, input: OnboardWorkspaceInput) {
  const sql = createSqlClient();

  try {
    await sql.begin(async (tx) => {
      const provider = databaseProvider(identity);
      const existing = await tx<{ id: string }[]>`
        select id
        from workspaces
        where external_provider = ${provider}
          and external_organization_id = ${identity.externalOrganizationId}
        limit 1
      `;

      let workspaceId = existing[0]?.id;
      const workspaceCreated = !workspaceId;

      if (!workspaceId) {
        const inserted = await tx<{ id: string }[]>`
          insert into workspaces (name, slug, status, external_provider, external_organization_id)
          values (${input.name}, ${input.slug}, 'active', ${provider}, ${identity.externalOrganizationId})
          returning id
        `;
        workspaceId = inserted[0]?.id;
      }

      if (!workspaceId) {
        throw new Error("Workspace insert did not return an ID");
      }

      const role = roleForNewMembership(identity, workspaceCreated);
      await tx`
        insert into workspace_memberships (workspace_id, external_user_id, role, status)
        values (${workspaceId}, ${identity.externalUserId}, ${role}, 'active')
        on conflict (workspace_id, external_user_id)
        do update set status = 'active', updated_at = now()
      `;
    });
  } finally {
    await sql.end({ timeout: 5 });
  }

  return findWorkspaceContext(identity);
}

export function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error &&
    (error as { code?: unknown }).code === "23505";
}
