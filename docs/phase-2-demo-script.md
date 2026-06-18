# Demo Script

Use this walkthrough to demo the current RevFlow POC end to end.

## Setup

```bash
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

Optional worker process in a second terminal:

```bash
npm run dev -w @revflow/worker
```

Open:

- Web: `http://localhost:3000`
- API: `http://localhost:4000/health`

## Demo Flow

1. Open `/customers` and review the seeded customers or create a new one.
2. Open `/catalog` and review products, meters, plans, and price rules.
3. Open `/contracts` and inspect the seeded active and draft contracts.
4. Add a price rule as a contract line item to a draft contract.
5. Approve a draft contract.
6. Ingest usage from `/usage` against an active contract and configured meter.
7. If the worker is running, confirm the aggregate updates automatically.
8. If the worker is not running, call `POST /usage/aggregates/run` or use seeded aggregate data after running the worker.
9. Generate a draft invoice from `/invoices` for the billing period.
10. Open invoice detail and explain the calculation snapshot, including pricing strategy and usage source.
11. Approve the draft invoice.
12. Open `/audit` and show the finance-impacting mutation trail.
13. Open `/ops` and show recent usage aggregation jobs.

## What To Explain

- Catalog is reusable commercial configuration.
- Contracts are customer-specific approved terms.
- Usage is accepted only for active contracts with configured meters.
- Usage events are immutable and idempotent.
- Usage aggregates are persisted and rerunnable.
- Invoices are generated from approved terms plus usage aggregates, with raw-event fallback for demo reliability.
- Pricing math is deterministic strategy code, not AI output.
- Audit logs are written for finance-impacting mutations.
- Ops views expose background job runs.

## Current Limitations

- No authentication or tenant isolation yet.
- No amendments or contract renewals yet.
- Invoice issuing/payment is represented as future lifecycle work.
- Revenue recognition schedules are Phase 4.
- AI extraction and anomaly review are later phases.
