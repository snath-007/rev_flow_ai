# Phase 3 Plan - Pricing Engine And Async Billing

## Goal

Status: complete.

Phase 3 turns the Phase 2 demo loop into a more explicit billing engine.

The project should keep the current monorepo and synchronous demo path, but introduce clear seams for strategy-based pricing, persisted usage aggregates, and queue-backed background jobs. The target is still a portfolio-grade POC, not a distributed production platform.

## Current Starting Point

Completed from Phase 2:

- Database-backed customers, catalog, contracts, usage, invoices, and audit events
- Draft-to-active contract approval
- Usage ingestion with idempotency key enforcement
- Invoice draft generation and approval
- Invoice line calculation visibility
- Basic audit UI and API
- Seed script for local demos

Known remaining shortcuts:

- Invoice generation is synchronous in the API
- Invoice generation keeps raw-event fallback if persisted aggregates are missing
- Job-run visibility is intentionally lightweight
- Contract approval does not yet snapshot full pricing config

## In Scope

### Pricing Engine

- Added `apps/api/src/modules/pricing`
- Defined a `PricingStrategy` interface
- Implemented flat-rate strategy
- Implemented per-unit usage strategy
- Implemented tiered usage strategy
- Add minimum commitment support if time allows
- Keep pricing deterministic and free of HTTP/database concerns
- Expand tests around rounding, zero usage, period boundaries, and tier behavior

### Usage Aggregation

- Added `usage_aggregates` migration
- Aggregates by contract, meter, period start, and period end
- Aggregation is idempotent via upsert
- Raw usage events remain the source of truth
- Invoice generation reads aggregates where possible

### Queue And Worker Slice

- Added BullMQ queue factory in `packages/queues`
- Enqueues usage aggregation after usage ingestion
- Added a worker consumer for usage aggregation
- Records job attempts and failures in `job_runs`
- Keep synchronous fallback available for local demo reliability

### Invoice Improvements

- Refactor invoice generation to call the pricing engine
- Keep draft invoice idempotency for the same contract and period
- Preserve calculation snapshots per line item
- Add tests for invoice generation using mixed flat and usage-based rules

## Out Of Scope

- AI extraction
- Revenue recognition schedules
- Invoice issuing, payments, voids, and credits
- Authentication and RBAC
- Multi-tenant account isolation
- Full amendment/renewal workflow

## Acceptance Criteria

Phase 3 is complete when:

- Pricing engine strategies exist and are unit tested
- Current flat and per-unit invoice behavior is implemented through strategies
- Tiered pricing has deterministic tests
- Usage aggregation can be run by the worker
- Invoice generation can use persisted aggregates
- `npm run typecheck -w @revflow/api` passes
- `npm run test -w @revflow/api` passes
- Demo flow still works from seeded data

## Suggested Build Order

1. Create pricing module and move current invoice calculator behavior behind strategies.
2. Add tests for flat and per-unit parity with current behavior.
3. Add tiered pricing strategy and tests.
4. Add `usage_aggregates` table and repository functions.
5. Update usage ingestion to enqueue aggregation jobs.
6. Implement worker consumer with idempotent aggregate upsert.
7. Update invoice generation to use aggregates and retain raw-event fallback for demo safety.
8. Update demo script and module docs.

## Design Notes

The current synchronous implementation is a reasonable sanity-check shortcut for Phase 2. Phase 3 should avoid a big-bang rewrite. Prefer small compatibility-preserving moves: keep the API route shape stable, move calculation code behind explicit interfaces, and add async paths beside the working path before making them mandatory.

