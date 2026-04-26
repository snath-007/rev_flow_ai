# Data Model

## Design Goals

- Represent reusable pricing configuration and customer-specific contracts separately.
- Support usage-based billing without scanning raw usage for every invoice.
- Keep invoice and revenue records explainable.
- Support future contract amendments and versioning.
- Preserve audit history for finance-impacting changes.

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

Planned important indexes:

- `usage_events(idempotency_key)` unique
- `usage_events(meter_id, occurred_at)`
- `usage_aggregates(contract_id, meter_id, period_start, period_end)`
- `invoices(contract_id, period_start, period_end)`
- `audit_logs(entity_type, entity_id, created_at)`
- `job_runs(queue_name, status, created_at)`

## Open Data Modeling Questions

- Should price rules be copied into contract versions at approval time?
- Should invoice line items store calculation metadata as JSON for explainability?
- Should amendments create full new contract versions or patch records plus snapshots?
- How much of the AI extraction payload should be preserved after approval?

