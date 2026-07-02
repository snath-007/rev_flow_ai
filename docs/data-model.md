# Data Model

## Design Goals

- Represent reusable pricing configuration and customer-specific contracts separately.
- Support usage-based billing without scanning raw usage for every invoice.
- Keep invoice and revenue records explainable.
- Support future contract amendments and versioning.
- Preserve audit history for finance-impacting changes.
- Enforce workspace isolation at both repository and database boundaries.

## Workspace Ownership

- `workspaces` and `workspace_memberships` map identity-provider organizations and users into RevFlow tenancy and roles.
- Every tenant-owned domain table carries a non-null `workspace_id`; existing demo data belongs to the deterministic local workspace.
- Repositories derive workspace ownership from authenticated request context. Request payloads cannot select or override it.
- Workspace-scoped unique constraints allow separate customers and configurations to reuse natural identifiers safely.
- Composite workspace-parent foreign keys reject cross-workspace references even if application validation is bypassed.
- Queue jobs, audit events, AI reviews, and operational job runs preserve workspace and initiating-user attribution.

## Entity Groups

### Commercial Configuration

- `customers`
- `products`
- `meters`
- `plans`
- `price_rules`

### Contracting

- `contracts`
- `contract_versions`
- `contract_line_items`
- `contract_amendments`

### Usage

- `usage_events`
- `usage_aggregates`

### Billing

- `invoices`
- `invoice_line_items`
- `invoice_adjustments`
- `credit_notes`

### Revenue Recognition

- `performance_obligations`
- `revenue_schedules`
- `journal_entries`

### Operations

- `ai_extraction_runs`
- `audit_logs`
- `job_runs`

## Important Relationships

```txt
Customer -> Contracts -> Contract Versions
Product -> Plans -> Price Rules
Product -> Meters
Contract -> Contract Line Items -> Price Rules
Meter -> Usage Events -> Usage Aggregates
Contract -> Invoices -> Invoice Line Items
Invoice -> Revenue Schedules -> Journal Entries
Entities -> Audit Logs
```

## State Fields

### Contract Status

- `draft`
- `pending_review`
- `active`
- `expired`
- `terminated`

### Invoice Status

- `draft`
- `approved`
- `issued`
- `paid`
- `void`
- `credited`

### Revenue Schedule Status

- `planned`
- `posted`
- `reversed`

## Indexing Notes

Important workspace-first indexes:

- `usage_events(workspace_id, idempotency_key)` unique
- `usage_events(workspace_id, meter_id, occurred_at)`
- `usage_aggregates(workspace_id, contract_id, meter_id, period_start, period_end)` unique
- `invoices(workspace_id, contract_id, period_start, period_end)`
- `audit_logs(workspace_id, entity_type, entity_id, created_at)`
- `job_runs(workspace_id, queue_name, status, created_at)`

## Open Data Modeling Questions

- Should price rules be copied into contract versions at approval time?
- Should invoice line items store calculation metadata as JSON for explainability?
- Should amendments create full new contract versions or patch records plus snapshots?
- How much of the AI extraction payload should be preserved after approval?

