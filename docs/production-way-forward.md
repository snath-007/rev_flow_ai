# Production Way Forward

## Monorepo Decision

Keep RevFlow as a monorepo for the POC.

For the current project, a monorepo is the right default because the product is still proving domain shape, workflow quality, and end-to-end correctness. Splitting into multiple repositories now would add coordination cost without adding much architectural value.

The current app boundaries are already useful:

- `apps/web` owns the operator experience
- `apps/api` owns domain rules and state transitions
- `apps/worker` owns async processing
- `packages/shared` owns schemas and types
- `packages/db` owns migrations and database access helpers
- `packages/queues` owns queue names and job contracts

These boundaries are enough to discuss production-grade decomposition without physically splitting repositories yet.

## When To Split Repositories

A repo split starts making sense when at least two of these are true:

- Different teams deploy and own services independently
- Release cadence differs materially between web, API, worker, and integrations
- Security boundaries require separate access control
- Build/test times become painful even with caching and package-level checks
- Public SDKs or integration packages need independent versioning
- A service needs a different runtime, language, or infrastructure lifecycle

Until then, separate packages inside one repo are simpler and more maintainable.

## Production Decomposition Path

A production version could evolve in stages:

1. Modular monolith: keep one API service, but enforce module boundaries and domain ownership.
2. Async extraction: move usage aggregation, invoice jobs, revrec jobs, and AI extraction into workers.
3. Service split by volatility: extract metering or AI ingestion first if their scale profile diverges.
4. Platform split: introduce independently deployed services only when team and traffic patterns justify it.

Likely future services:

- Contract service for versions, amendments, approval, and AI extraction drafts
- Catalog/pricing service for plans, meters, and pricing rules
- Metering service for ingestion, dedupe, and aggregation
- Billing service for invoices and lifecycle state transitions
- Revenue service for schedules and journal entries
- Audit/ops service for append-only events and operational visibility

## Design Patterns To Strengthen

### Domain Boundaries

Keep routes thin and push business rules into services. Repositories should remain data-access focused. As the system grows, avoid cross-module SQL hidden inside unrelated repositories unless it is moved into an explicit read model.

### Transactional Audit

Finance-impacting writes should eventually write audit logs in the same transaction as the domain mutation. The current helper is fine for a POC, but production should pass a transaction context into audit writes or use an outbox pattern.

### Outbox And Workers

For reliable async behavior, write domain state and outbox events in one transaction. Workers can then publish queue jobs or process outbox rows with retries. This prevents the classic problem where the database write succeeds but the queue enqueue fails.

### Pricing Strategy Engine

Pricing should be deterministic, isolated, and heavily tested. Strategy implementations should accept normalized inputs and return calculation snapshots. They should not call HTTP, read environment variables, or query the database.

### Read Models

Operational screens should eventually read summaries and aggregates, not repeatedly scan transactional event tables. Usage aggregates, invoice summaries, job runs, and audit views are natural read models.

### Versioned Contracts

Approved contract terms should snapshot enough pricing configuration to explain future invoices even if catalog rules change later. Phase 3 can begin this by making invoice calculation snapshots richer; later phases can copy price-rule terms into contract versions.

## POC Article Ideas

- Building a revenue automation POC as a modular monolith
- Why billing systems need audit logs and deterministic pricing engines
- Designing usage metering with idempotency, aggregation, and late events
- From synchronous demo flow to queue-backed finance workflows
- When to split a monorepo into services, and when not to
- Contract versioning patterns for SaaS billing systems
