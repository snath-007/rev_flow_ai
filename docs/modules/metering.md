# Metering Module Plan

## Purpose

Ingest usage events, deduplicate them, aggregate them, and expose usage totals for billing.

## Responsibilities

- Accept usage events through the API
- Validate event shape
- Enforce idempotency
- Queue aggregation jobs
- Aggregate usage by contract, meter, and billing period
- Expose raw and aggregate usage views

## Event Flow

```txt
POST /events
  -> validate
  -> dedupe by idempotency key
  -> persist raw event
  -> enqueue aggregation
  -> worker updates usage aggregate
```

## Important Concerns

- Duplicate events
- Late-arriving events
- Period boundaries
- Backpressure
- High-volume ingestion
- Query performance

## Open Questions

- Should aggregation happen immediately in MVP or only through workers?
- Should late events reopen invoice drafts?
- How should events be handled after invoice issue?

