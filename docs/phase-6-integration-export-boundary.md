# Integration And Export Boundary

RevFlow's Phase 6 integration work is intentionally an export boundary, not a real ERP, GL, CRM, payment, or tax synchronization layer. PostgreSQL remains the authoritative financial system of record. Export DTOs, integration runs, and mock connector adapters demonstrate the production shape without introducing a second persistence system.

## Current Boundary

- `POST /integrations/exports` is the only export command surface.
- `integration_runs` records every export attempt with workspace, provider, entity type, actor, idempotency key, timestamps, status, export reference, and error summary.
- `integration_run_items` records per-entity export status, external references, and item-level errors.
- Versioned DTOs in `@revflow/shared` define the exported contract for customers, invoices, payments, journal entries, and revenue schedules.
- CSV/JSON exports are file-format adapters. `mock_erp` and `mock_gl` are connector adapters, kept outside domain repositories and services.

## Production Direction

Production connectors should move from synchronous request/response export work toward a transactional outbox pattern:

1. A user or scheduled workflow creates an `integration_run` in the same database transaction as the export intent.
2. The API writes an outbox event such as `integration.export.requested` with workspace id, integration run id, provider, export type, idempotency key, and actor context.
3. A worker claims outbox events with retry/visibility controls, builds the versioned DTO payload from Postgres, and calls the provider adapter.
4. The adapter writes provider batch ids and per-record external references back to `integration_run_items`.
5. Provider failures update `integration_runs.status`, `error_summary`, and item-level errors rather than disappearing into logs.
6. Provider webhooks, if supported, are received by a dedicated webhook route, verified, and written as outbox events before mutating run or item status.

This keeps provider IO outside domain mutations and prevents the unreliable gap where database state changes succeed but a connector call or queue publish fails.

## Webhook Direction

Webhook handlers should be thin and provider-specific:

- Verify provider signatures before parsing business payloads.
- Resolve workspace and integration run through stored external batch/reference ids.
- Store the raw webhook envelope with a bounded retention policy for audit/debugging.
- Convert the webhook into an internal event such as `integration.export.acknowledged` or `integration.export.failed`.
- Apply status changes through the same integration-run repository path used by worker results.

No webhook should directly rewrite invoices, revenue schedules, journal entries, or payments. Provider acknowledgements are evidence about export delivery, not the source of financial truth.

## Source Of Truth Rule

Do not introduce Sanity, Convex, or another application backend for finance persistence in this boundary. Those tools may be considered later for editorial content, realtime presentation, or non-authoritative collaboration features, but not for authoritative billing, revenue, payment, audit, or export state.

The durable source of truth remains:

- Postgres domain tables for customers, contracts, usage, invoices, payments, revenue schedules, journal entries, and audit logs.
- Postgres integration tables for export attempts, item references, connector status, and failure summaries.
- Shared DTO schemas as the versioned contract between API, worker, and future connector packages.

## Current Demo Limitations

- Mock adapters are deterministic and local to the API process.
- No real provider credentials, network calls, OAuth, webhook verification, or retry scheduler are implemented.
- CSV/JSON exports are synchronous because they are local file representations.
- Mock connector failures are intentionally simulated with `simulateFailure` so the audit trail can be demonstrated without a real provider.
