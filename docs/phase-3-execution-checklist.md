# Phase 3 Execution Checklist - Pricing Engine And Async Billing

## Objective

Phase 3 replaces the Phase 2 demo shortcuts with explicit billing-engine foundations:

- Deterministic pricing strategies
- Persisted, rerunnable usage aggregates
- Worker-backed aggregation path
- Invoice generation that reads pricing results and aggregate data cleanly

The goal is not to make a production billing platform yet. The goal is to make the POC credible enough that Phase 4 revenue recognition can rely on stable contract, usage, and invoice outputs.

## Working Rules

- Keep the current demo flow working after every milestone.
- Prefer compatibility-preserving refactors over rewrites.
- Keep pricing math pure and unit tested.
- Keep raw `usage_events` immutable.
- Persist `usage_aggregates`, but retain a fallback path until worker behavior is stable.
- Do not introduce AI, revenue recognition, payments, or amendments in Phase 3.

## Milestone 0 - Baseline Verification

Status: pending

Goal: confirm the current branch is healthy before touching Phase 3 code.

Tasks:

- Run API typecheck.
- Run API tests.
- Run web typecheck.
- Run DB typecheck.
- Optionally run migrations and seed locally if Postgres is available.

Commands:

```bash
npm run typecheck -w @revflow/api
npm run test -w @revflow/api
npm run typecheck -w @revflow/web
npm run typecheck -w @revflow/db
```

Acceptance criteria:

- Typechecks pass.
- Existing invoice calculator tests pass.
- Any existing failure is documented before Phase 3 work begins.

## Milestone 1 - Pricing Module Skeleton

Status: pending

Goal: create the pricing module without changing invoice behavior yet.

Likely files:

- `apps/api/src/modules/pricing/pricing.types.ts`
- `apps/api/src/modules/pricing/money.ts`
- `apps/api/src/modules/pricing/index.ts`
- `apps/api/src/modules/pricing/strategies/flat-rate.strategy.ts`
- `apps/api/src/modules/pricing/strategies/per-unit.strategy.ts`
- `apps/api/src/modules/pricing/strategies/tiered.strategy.ts`
- `apps/api/src/modules/pricing/pricing-engine.ts`
- `apps/api/src/modules/pricing/pricing-engine.test.ts`

Tasks:

- Define `BillingPeriod`, `PricingContext`, `PricingStrategy`, and `PriceResult` types.
- Add shared money rounding helper using the current invoice rounding behavior.
- Implement `FlatRateStrategy`.
- Implement `PerUnitStrategy`.
- Add engine dispatcher by `pricingModel`.
- Add parity tests for flat and per-unit behavior.

Acceptance criteria:

- Current invoice calculator behavior can be reproduced by pricing strategies.
- Pricing tests cover zero quantity, decimal unit price, and rounding.
- No invoice repository changes yet except imports if needed.

## Milestone 2 - Tiered Pricing Strategy

Status: pending

Goal: add deterministic tiered pricing support as a standalone strategy.

Tasks:

- Define tier config shape in pricing module.
- Support graduated tier calculation.
- Optionally support volume tier calculation if time allows.
- Add validation/error handling for invalid tier configs.
- Add tests for exact threshold, below threshold, above threshold, empty tiers, and decimal rates.

Acceptance criteria:

- Tiered pricing tests are deterministic and explain calculation snapshots.
- No LLM or database dependency exists in pricing strategy code.
- Tiered strategy returns enough detail for invoice line snapshots.

## Milestone 3 - Invoice Generation Uses Pricing Engine

Status: pending

Goal: replace direct invoice calculator logic with the pricing engine while preserving current output shape.

Likely files:

- `apps/api/src/modules/invoices/invoice-calculator.ts`
- `apps/api/src/modules/invoices/invoices.repository.ts`
- `apps/api/src/modules/invoices/invoice-calculator.test.ts`
- `apps/api/src/modules/pricing/*`

Tasks:

- Map billable invoice rows into pricing engine inputs.
- Keep existing flat/per-unit invoice amounts unchanged.
- Include pricing strategy snapshots inside invoice line `calculation_snapshot`.
- Preserve `calculateInvoiceTotal` or move total calculation into pricing/money helpers.
- Expand invoice tests for mixed flat and usage-based lines.

Acceptance criteria:

- Existing invoice tests pass.
- New tests prove invoice generation uses strategy output consistently.
- API response shape stays compatible with the current web UI.

## Milestone 4 - Persisted Usage Aggregates Migration

Status: pending

Goal: add a real aggregate table that can be recomputed safely.

Likely files:

- `packages/db/src/migrations/004_create_usage_aggregates.sql`
- `packages/shared/src/schemas/usage.ts`
- `apps/api/src/modules/usage/usage.repository.ts`

Tasks:

- Create `usage_aggregates` table.
- Key aggregates by `contract_id`, `meter_id`, `period_start`, `period_end`.
- Store `event_count`, `total_quantity`, `billable_quantity`, first/last occurrence timestamps.
- Add a unique constraint for idempotent upserts.
- Add useful indexes for invoice lookup.

Acceptance criteria:

- Migration can be applied from scratch.
- Table supports recomputing the same period without duplicate rows.
- Schema matches current API aggregate response needs.

## Milestone 5 - Aggregation Repository And Service

Status: pending

Goal: make aggregation an explicit operation, not only a list query.

Likely files:

- `apps/api/src/modules/usage/usage.repository.ts`
- `apps/api/src/modules/usage/usage.service.ts`
- `apps/api/src/modules/usage/usage-aggregation.test.ts` if unit-testable without DB, otherwise integration notes only

Tasks:

- Add `aggregateUsageForPeriod(contractId, meterId, periodStart, periodEnd)` repository/service function.
- Upsert into `usage_aggregates`.
- Update `listUsageAggregates()` to read persisted aggregates.
- Keep a fallback raw-event query helper if needed during transition.
- Decide the default period derivation for events in Phase 3, likely calendar month.

Acceptance criteria:

- Aggregation is rerunnable for the same contract/meter/period.
- Listing aggregates reads the persisted table.
- Existing usage UI can still display aggregate results.

## Milestone 6 - Queue Package And Worker Consumer

Status: pending

Goal: turn the worker scaffold into a real usage aggregation consumer.

Likely files:

- `packages/queues/src/queue-names.ts`
- `packages/queues/src/jobs.ts`
- `packages/queues/src/queues.ts`
- `apps/worker/src/worker.ts`
- `apps/worker/src/consumers/usage-aggregator.ts`
- `apps/worker/package.json`

Tasks:

- Add queue factory/helpers in `packages/queues`.
- Add Redis connection config conventions.
- Implement usage aggregation worker consumer.
- Keep job names typed via `@revflow/queues`.
- Add graceful logging for job success/failure.
- Avoid making local demo depend on worker availability until verified.

Acceptance criteria:

- Worker can process a usage aggregation job.
- Failed jobs are visible in logs at minimum.
- API and worker agree on typed job payloads.

## Milestone 7 - Enqueue Aggregation On Usage Ingestion

Status: pending

Goal: connect usage ingestion to the async aggregation path.

Likely files:

- `apps/api/src/modules/usage/usage.service.ts`
- `packages/queues/src/*`
- `apps/api/package.json` if queue dependencies are needed

Tasks:

- After successful usage ingestion, enqueue aggregation for the event period.
- Derive period start/end consistently.
- Keep a synchronous aggregation fallback or explicit local-demo command.
- Avoid enqueueing on duplicate idempotency-key replay if possible.

Acceptance criteria:

- New usage events can trigger aggregate refresh.
- Duplicate usage event retries do not double-count.
- API remains responsive if queue enqueue fails in local mode, or the failure is intentionally surfaced and documented.

## Milestone 8 - Invoice Generation Reads Aggregates

Status: pending

Goal: invoices use persisted aggregate data instead of raw usage scans where possible.

Likely files:

- `apps/api/src/modules/invoices/invoices.repository.ts`
- `apps/api/src/modules/usage/usage.repository.ts`
- `apps/api/src/modules/invoices/invoice-calculator.test.ts`

Tasks:

- Update billable-line query to join/read `usage_aggregates` for the invoice period.
- Preserve raw-event fallback if aggregate is missing, or reject with a clear error asking aggregation to run first.
- Store aggregate IDs or aggregate metadata in calculation snapshots where useful.
- Add tests around zero usage and existing flat lines.

Acceptance criteria:

- Invoice generation can use persisted aggregate quantities.
- Flat charges still generate even without usage aggregates.
- Calculation snapshots explain whether aggregate or fallback data was used.

## Milestone 9 - Job Runs And Ops Visibility Optional Slice

Status: optional

Goal: add minimal operational visibility if time allows.

Tasks:

- Add `job_runs` table.
- Record usage aggregation job start/success/failure.
- Add API endpoint for recent jobs.
- Add simple web ops page or extend audit/usage page.

Acceptance criteria:

- Failed background work is inspectable from DB/API/UI.
- This does not block Phase 3 if the core pricing and aggregate path is complete.

## Milestone 10 - Documentation And Demo Refresh

Status: pending

Goal: update project docs so the implementation story matches the code.

Files:

- `README.md`
- `docs/phase-3-plan.md`
- `docs/phase-2-demo-script.md`
- `docs/local-development.md`
- `docs/modules/pricing.md`
- `docs/modules/metering.md`
- `docs/modules/invoicing.md`

Tasks:

- Update Phase 3 status.
- Document pricing strategy behavior.
- Document aggregate behavior and worker path.
- Update demo flow to include aggregation/worker expectations.
- Note any intentional POC shortcuts still remaining.

Acceptance criteria:

- README and docs do not claim future behavior is already complete.
- Demo instructions work with seeded data.
- Remaining shortcuts are explicit.

## Final Phase 3 Acceptance

Phase 3 is complete when:

- Pricing strategies exist for flat, per-unit, and tiered pricing.
- Pricing math is deterministic and unit tested.
- Invoice generation uses pricing strategy results.
- Usage aggregates are persisted and rerunnable.
- Worker can process usage aggregation jobs.
- Invoice generation can read persisted aggregate data.
- Current customer -> catalog -> contract -> usage -> invoice -> audit demo still works.
- Core checks pass:

```bash
npm run typecheck -w @revflow/api
npm run test -w @revflow/api
npm run typecheck -w @revflow/web
npm run typecheck -w @revflow/db
```

## Suggested Execution Rhythm

Work in this order:

1. Milestone 0
2. Milestone 1
3. Milestone 2
4. Milestone 3
5. Milestone 4
6. Milestone 5
7. Milestone 6
8. Milestone 7
9. Milestone 8
10. Milestone 10

Keep Milestone 9 optional unless the core path finishes quickly.











