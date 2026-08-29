import { randomUUID } from "node:crypto";

import { createSqlClient } from "@revflow/db";
import type { AuthenticatedActor } from "@revflow/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { loadEnv } from "../../config/env.js";
import { runWithAuthenticatedActor } from "../../lib/request-context.js";
import * as customersRepository from "./customers.repository.js";

loadEnv();

const runDatabaseTests = process.env.RUN_DATABASE_TESTS === "true";
const databaseSuite = runDatabaseTests ? describe : describe.skip;

databaseSuite("customer repository tenant isolation", () => {
  const sql = createSqlClient();
  const foreignWorkspaceId = randomUUID();
  const foreignMembershipId = randomUUID();
  const foreignCustomerId = randomUUID();
  const createdDemoCustomerIds: string[] = [];

  const demoActor: AuthenticatedActor = {
    userId: null,
    externalUserId: "local-user",
    workspaceId: "00000000-0000-4000-8000-000000000001",
    externalOrganizationId: "local-org",
    membershipId: "00000000-0000-4000-8000-000000000099",
    role: "workspace_admin",
    capabilities: ["workspace.read", "customers.read", "customers.write"],
    displayName: "Isolation Test",
    sessionId: "tenant-test",
    authProvider: "local_test"
  };

  beforeAll(async () => {
    await sql`
      insert into workspaces (id, name, slug, status, external_provider, external_organization_id)
      values (
        ${foreignWorkspaceId},
        'Isolation Workspace',
        ${"isolation-" + foreignWorkspaceId.slice(0, 8)},
        'active',
        'local',
        ${"isolation-org-" + foreignWorkspaceId}
      )
    `;
    await sql`
      insert into workspace_memberships (id, workspace_id, external_user_id, role, status)
      values (${foreignMembershipId}, ${foreignWorkspaceId}, 'isolation-user', 'workspace_admin', 'active')
    `;
    await sql`
      insert into customers (id, workspace_id, name, email)
      values (${foreignCustomerId}, ${foreignWorkspaceId}, 'Foreign Customer', ${"foreign-" + foreignWorkspaceId + "@example.test"})
    `;
  });

  afterAll(async () => {
    for (const customerId of createdDemoCustomerIds) {
      await sql`delete from customers where id = ${customerId}`;
    }
    await sql`delete from customers where workspace_id = ${foreignWorkspaceId}`;
    await sql`delete from workspace_memberships where workspace_id = ${foreignWorkspaceId}`;
    await sql`delete from workspaces where id = ${foreignWorkspaceId}`;
    await sql.end({ timeout: 5 });
  });

  it("excludes another workspace from list and detail reads", async () => {
    const customers = await runWithAuthenticatedActor(demoActor, () => customersRepository.listCustomers());
    const foreign = await runWithAuthenticatedActor(demoActor, () =>
      customersRepository.getCustomerById(foreignCustomerId)
    );

    expect(customers.some((customer) => customer.id === foreignCustomerId)).toBe(false);
    expect(foreign).toBeNull();
  });

  it("assigns new records to the authenticated workspace", async () => {
    const customer = await runWithAuthenticatedActor(demoActor, () =>
      customersRepository.createCustomer({
        name: "Tenant Write Test",
        email: `tenant-write-${randomUUID()}@example.test`
      })
    );
    createdDemoCustomerIds.push(customer.id);

    const rows = await sql<{ workspace_id: string }[]>`
      select workspace_id
      from customers
      where id = ${customer.id}
    `;

    expect(rows[0]?.workspace_id).toBe(demoActor.workspaceId);
  });

  it("rejects a cross-workspace parent reference", async () => {
    await expect(
      sql`
        insert into contracts (workspace_id, customer_id, status, start_date)
        values (${demoActor.workspaceId}, ${foreignCustomerId}, 'draft', '2026-01-01')
      `
    ).rejects.toMatchObject({ code: "23503" });
  });
});
