# Phase 6 Milestone 0 - Baseline And Inventory

Baseline date: 2026-06-22  
Branch: `feature/phase_6_implementation`  
Result: complete with one non-blocking visual-capture exception.

## Verification Evidence

### Infrastructure

- PostgreSQL container: healthy on port `5432`
- Redis container: healthy on port `6379`
- Migration runner completed successfully
- Migrations `001` through `007` are applied
- `007_create_ai_extraction_runs.sql` was correctly detected and skipped as already applied

### Regression

```txt
npm run typecheck
Tasks: 9 successful / 9 total
Workspaces: api, db, queues, shared, web, worker

npm run test -w @revflow/api
Test files: 10 passed / 10 total
Tests: 56 passed / 56 total
```

No pre-existing type or API test failure blocks Phase 6.

## Application Surface Inventory

### Web Pages

| Route            | Current purpose                             | Phase 6 classification     | Initial capability             |
| ---------------- | ------------------------------------------- | -------------------------- | ------------------------------ |
| `/`              | Scaffold/dashboard and quick links          | Protected workspace home   | authenticated                  |
| `/customers`     | Customer list and create                    | Operator mutation          | `customers.read/write`         |
| `/catalog`       | Products, meters, plans, price rules        | Configuration              | `catalog.read/write`           |
| `/contracts`     | Contract list, create, line items, approval | Configuration and approval | `contracts.read/write/approve` |
| `/usage`         | Usage events and ingestion                  | Operator mutation          | `usage.read/write`             |
| `/invoices`      | Invoice list and generation                 | Finance operation          | `invoices.read/generate`       |
| `/invoices/[id]` | Invoice detail and approval                 | Finance approval           | `invoices.read/approve`        |
| `/revenue`       | Schedules, journal entries, generation      | Finance operation/review   | `revenue.read/generate`        |
| `/ai`            | Extraction intake, review, apply            | AI operation and approval  | `ai.read/extract/review/apply` |
| `/audit`         | Audit inspection                            | Read-only control          | `audit.read`                   |
| `/ops`           | Background job inspection                   | Read-only operations       | `ops.read`                     |

There are 15 Next.js proxy mutation routes. They currently forward application requests without a shared authenticated actor or workspace context.

### API Endpoints

Public:

| Endpoint         | Capability                  |
| ---------------- | --------------------------- |
| `GET /health`    | public                      |
| `GET /health/db` | public deployment readiness |

Tenant-protected groups:

| Group     | Endpoints | Initial capabilities             |
| --------- | --------: | -------------------------------- |
| Customers |         3 | `customers.read/write`           |
| Catalog   |         9 | `catalog.read/write`             |
| Contracts |         5 | `contracts.read/write/approve`   |
| Usage     |         4 | `usage.read/write`               |
| Invoices  |         4 | `invoices.read/generate/approve` |
| Revenue   |         3 | `revenue.read/generate`          |
| AI        |         5 | `ai.read/extract/review/apply`   |
| Audit     |         1 | `audit.read`                     |
| Ops       |         1 | `ops.read`                       |

Total: 35 domain endpoints plus 2 health endpoints.

All domain endpoints are currently unauthenticated. CORS uses the broad default configuration, and JSON requests are limited to 1 MB.

## Module And Repository Inventory

Data-access modules:

- Customers
- Catalog
- Contracts
- Usage
- Invoices
- Revenue recognition
- AI extraction
- Ops/job runs
- Audit service

There are eight explicit repository files; audit data access currently lives behind the audit service rather than a dedicated repository.

Phase 6 repository rule:

- Every tenant-owned repository entry point must accept trusted workspace context.
- Detail, list, mutation, and uniqueness queries must scope by workspace.
- Services must receive normalized actor/workspace context rather than identity-provider objects.
- Cross-workspace record IDs must not be sufficient to read or mutate a record.

## Database Ownership Inventory

The schema currently contains 19 tenant-owned domain tables, excluding `schema_migrations`.

### Configuration And Contracting

- `customers`
- `products`
- `meters`
- `plans`
- `price_rules`
- `contracts`
- `contract_versions`
- `contract_line_items`

### Usage And Billing

- `usage_events`
- `usage_aggregates`
- `invoices`
- `invoice_line_items`

### Revenue

- `performance_obligations`
- `revenue_schedules`
- `journal_entries`

### Operations And AI

- `audit_logs`
- `job_runs`
- `ai_extraction_runs`
- `ai_extraction_reviews`

Current ownership gaps:

- No table has `workspace_id`.
- Customer email uniqueness is global.
- Product name uniqueness is global.
- Child-table ownership is inferred only through foreign keys.
- Audit and job-run records have no workspace boundary.
- AI extraction source/review records have no workspace boundary.
- Existing actor values are not derived from authenticated sessions.

## Tenant Migration Order

No Phase 6 tenant migration should skip this sequence:

1. Finalize identity/workspace ADRs and the default local workspace identifier.
2. Create workspace/membership application records only if required beyond the identity provider.
3. Add nullable `workspace_id` columns to tenant-owned root/read-model tables.
4. Backfill current records into the deterministic default workspace.
5. Propagate/verify child ownership through parent relationships.
6. Update global uniqueness and common indexes to become workspace-aware.
7. Update repositories, services, queues, seeds, and audit writes to require trusted workspace context.
8. Add cross-workspace isolation tests.
9. Verify no null or mismatched ownership remains.
10. Apply non-null/foreign-key constraints in a follow-up additive migration.

This staged approach avoids making the existing Phase 5 data unreadable during deployment.

## Queue And Worker Inventory

Defined jobs:

- `usage.aggregate` - active
- `invoice.generate` - contract defined, worker not active
- `revenue.recognize` - contract defined, worker not active

Current `UsageAggregationJob` contains:

- Contract ID
- Meter ID
- Period start
- Period end

Baseline gaps:

- No workspace ID is carried in queue payloads.
- Job IDs are not workspace-qualified.
- Worker SQL scopes only by contract/meter IDs.
- Job-run rows have no workspace or authenticated initiating actor.
- Failed/succeeded job logs cannot currently be filtered by tenant.

Milestone 3 must propagate trusted workspace context into payloads, idempotency keys, worker queries, and job-run persistence.

## Environment And Deployment Inventory

Current keys:

- `NODE_ENV`
- `DATABASE_URL`
- `REDIS_URL`
- `API_PORT`
- `WEB_PORT`
- `NEXT_PUBLIC_API_URL`
- `AI_PROVIDER`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `GEMINI_TIMEOUT_MS`

Findings:

- API development explicitly loads the root `.env`.
- Database and worker packages contain their own root-env discovery helpers.
- Next.js consumes `NEXT_PUBLIC_API_URL`.
- `WEB_PORT` is documented but the web dev script currently hardcodes port `3000`.
- No environment schema validates required production values at startup.
- No identity-provider, trusted-origin, hosted-AI, rate-limit, or observability keys exist yet.
- Docker Compose currently supplies local Postgres and Redis.
- Gemini requires server-side secret handling, quotas, and contract-data approval.

## Seed And Demo Ownership

The seed currently creates:

- Two customers
- Two products
- Two meters
- Two plans
- Price rules
- One active and one draft contract
- Contract versions and line items
- Two usage events
- One audit event

Baseline gaps:

- No workspace/default membership is created.
- Customer/product/meter/plan upserts are partially idempotent.
- Price rules, contracts, versions, and line items are inserted again on repeated seed runs.
- Seed audit actor is `system`, with no workspace context.
- Seed idempotency and production-safety behavior are not explicit.

Phase 6 seed requirements:

- Create a deterministic demo workspace and memberships.
- Scope every record to that workspace.
- Make repeated local seeding predictable.
- Refuse destructive/demo seeding in production unless explicitly enabled.

## Audit And Actor Findings

- No authenticated actor middleware exists.
- Most non-AI audit events use generic/system attribution.
- AI review accepts a reviewer name as workflow input rather than deriving identity from a verified session.
- Audit logs are written separately from many domain mutations.
- Audit entries have no workspace ID.

Milestones 2-4 must make server-derived actor/workspace context authoritative. Client-provided display names may be retained only as non-authoritative notes.

## Source-Level UI Baseline

Concrete findings from the current source:

- Root layout renders only `{children}`; there is no shared application shell.
- Navigation is a hardcoded quick-link collection on the home page.
- The home page still uses a large scaffold-style hero rather than an operational dashboard.
- There is no workspace switcher, user menu, role-aware navigation, environment indicator, or breadcrumb system.
- Page navigation uses ordinary anchors rather than a centralized navigation model.
- Forms, tables, panels, statuses, and buttons rely on broad global CSS selectors.
- Loading, error, unauthorized, and empty-state behavior is not centralized.
- No shared permission policy controls page actions.
- Mobile behavior has not been validated across every dense table/form surface.
- The stylesheet is already accumulating workflow-specific rules, making token/component extraction preferable before further page polish.

These are baseline observations, not Phase 5 regressions.

## Visual Evidence Exception

Automated desktop/mobile screenshots were not captured because the required in-app browser controller was unavailable in this session. The mandated browser skill explicitly prohibits substituting an unrelated standalone browser runner.

This does not block identity/tenancy planning. Screenshot capture is carried forward as the first task of Milestone 5, before any shell/style change, so before/after evidence can still be preserved.

## Baseline Risks Entering Phase 6

Priority order:

1. No authentication or API authorization
2. No tenant ownership in schema or repositories
3. Client-originated/reconstructed actor identity
4. Queue and worker jobs without workspace context
5. Global uniqueness rules incompatible with tenant isolation
6. Partially idempotent seed behavior
7. No shared application shell or centralized permission-aware navigation
8. No deterministic metric definitions yet
9. No production environment validation, CORS policy, rate limits, or structured request logging
10. Visual baseline capture tooling unavailable in this session

## Milestone 0 Conclusion

The Phase 5 implementation is healthy and provides a suitable baseline for Phase 6.

Milestone 1 must complete identity, tenancy, deployment, AI-hosting, role-capability, and metric ADRs before schema or UI rewiring begins. The visual capture exception is documented and moved to the start of Milestone 5; all other Milestone 0 inventory and acceptance requirements are complete.
