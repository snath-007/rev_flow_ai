# Metering Module

## Purpose

Ingest usage events, deduplicate them, aggregate them, and expose usage totals for billing.

## Current Implementation

Phase 3 implemented persisted usage aggregates and a worker-backed aggregation path.

Current flow:

```txt
POST /usage/events
  -> validate
  -> dedupe by idempotency key
  -> persist raw immutable event
  -> enqueue usage.aggregate job for the event month
  -> worker upserts usage_aggregates
  -> invoices read usage_aggregates with raw-event fallback
```

Manual fallback:

```txt
POST /usage/aggregates/run
```

This recomputes an aggregate for a contract, meter, and period. It is useful for demos, backfills, and local development when Redis or the worker is not running.

## Responsibilities

- Accept usage events through the API
- Validate event shape
- Enforce idempotency
- Queue aggregation jobs only for newly inserted events
- Aggregate usage by contract, meter, and billing period
- Upsert aggregates idempotently
- Expose raw and aggregate usage views

## Important Concerns

- Duplicate events
- Late-arriving events
- Period boundaries
- Backpressure
- High-volume ingestion
- Query performance
- Re-runnable backfills and corrections

## Current Shortcuts

- Aggregation period is calendar month in UTC.
- Queue enqueue failures are logged but do not fail ingestion.
- Invoice generation still has raw-event fallback until the worker path is fully relied on.
