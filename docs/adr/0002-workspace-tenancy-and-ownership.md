# ADR 0002 - Workspace Tenancy And Ownership

Status: accepted  
Date: 2026-06-24

## Context

The current schema contains finance and configuration records without a tenant key. Global uniqueness constraints and repository methods can access records across the entire database. Phase 6 must create a trustworthy workspace boundary while preserving the existing demo data.

A workspace is the organization operating RevFlow. A customer is an external account billed by that workspace. These concepts must never share the same identifier or authorization meaning.

## Decision

Use shared-schema, row-level application tenancy backed by a RevFlow workspace UUID.

Create application workspaces and memberships. A workspace stores the external identity-provider organization identifier as a unique mapping, but all domain ownership uses the RevFlow workspace UUID.

Every tenant-owned repository entry point receives trusted workspace context from AuthenticatedActor. Request payloads cannot select or override ownership.

## Ownership Rules

Add workspace_id to tenant-owned root and operational records, including:

- Customers
- Products, meters, plans, and price rules
- Contracts and contract versions
- Usage events and aggregates
- Invoices
- Performance obligations, revenue schedules, and journal entries
- Payments and reconciliation records
- Audit logs and job runs
- AI extraction runs and reviews

Child tables may derive access through a required parent join when that keeps ownership canonical. High-volume or independently queried children may also store workspace_id for indexing and defense in depth. Any duplicated ownership value must be validated against its parent.

All list, detail, create, update, transition, and uniqueness queries scope by workspace. A record ID alone is never sufficient authority.

## Workspace And Membership Shape

Minimum application records:

- workspaces: id, external_provider, external_organization_id, name, slug, status, created_at, updated_at
- memberships: id, workspace_id, external_user_id, role, status, created_at, updated_at

A user can belong to multiple workspaces. The active Clerk organization selects one workspace for a request. Membership status must be active.

The deterministic local/demo workspace uses:

- ID: 00000000-0000-4000-8000-000000000001
- Slug: revflow-demo
- External provider: local

## Migration Strategy

1. Create workspaces and memberships.
2. Insert the deterministic demo workspace.
3. Add nullable workspace ownership columns.
4. Backfill existing records into the demo workspace.
5. Update uniqueness constraints and indexes to begin with workspace_id.
6. Update repositories, services, queues, seeds, and audit writes.
7. Add cross-workspace isolation tests.
8. Verify ownership consistency and null counts.
9. Add non-null and foreign-key constraints in an additive follow-up migration.

## Queue And Audit Rules

- Queue payloads carry workspaceId from a trusted server context.
- Worker queries scope every read and write by workspaceId.
- Job identifiers and idempotency keys include workspace context where collision is possible.
- Audit and job-run records always carry workspaceId.
- System jobs use a system actor associated with the workspace, not a global unscoped actor.

## Cross-Tenant Behavior

Return not found for an otherwise valid resource ID outside the active workspace unless an explicit administrative endpoint requires forbidden semantics. This avoids confirming another tenant's identifiers.

No cross-workspace reporting or support impersonation is included in the POC.

## Consequences

Benefits:

- The monorepo and relational model remain intact.
- Tenant isolation is explicit at repository and API boundaries.
- Existing data can be preserved through a deterministic backfill.
- The model supports multiple workspaces per user.

Costs:

- Every repository and job contract changes.
- Indexes and uniqueness rules require migration.
- Application-level scoping must be comprehensively tested.

## Rejected Alternatives

- Database per tenant: too operationally expensive for the POC.
- Schema per tenant: unnecessary migration and connection complexity.
- Clerk organization ID as every foreign key: couples finance data to an identity vendor.
- Sanity or Convex as tenant persistence: duplicates the Postgres system of record without solving the core boundary.
