# Architecture

## System Overview

RevFlow uses a monorepo with three applications and shared packages:

- `apps/web`: Next.js dashboard
- `apps/api`: Express + TypeScript API
- `apps/worker`: BullMQ background worker
- `packages/db`: Postgres client and migrations
- `packages/shared`: shared types and Zod schemas
- `packages/queues`: queue definitions and job contracts

## Runtime Architecture

```txt
User
  -> Web App
  -> API Server
  -> Postgres

API Server
  -> Redis/BullMQ
  -> Worker
  -> Postgres
```

AI extraction is orchestrated by the API. The AI output is stored as a draft and reviewed by a human before activation.

## Boundary Decisions

### Web App

Owns:

- UI state
- Forms and validation display
- Workflow screens
- API calls

Does not own:

- Pricing calculations
- Revenue recognition logic
- Direct database access
- Invoice state transition rules

### API Server

Owns:

- Domain validation
- Business rules
- Financial state transitions
- Audit log writes
- AI orchestration
- Queue job creation

### Worker

Owns:

- Usage aggregation
- Invoice generation jobs
- Revenue schedule generation jobs
- Retryable background work

## Consistency Model

Strong consistency is preferred for finance-impacting state transitions:

- Contract approval
- Invoice approval
- Invoice issue
- Revenue schedule posting

Eventual consistency is acceptable for:

- Usage aggregation
- Dashboard job status
- Operational metrics

## Reliability Concerns

- Usage events must be idempotent.
- Queue jobs must be retryable.
- Invoice generation should be repeatable for the same inputs.
- State transitions should reject invalid transitions.
- Audit logs should be written with finance-impacting changes.

## Scaling Concerns

- API can scale horizontally behind a load balancer.
- Workers can scale horizontally by queue partitioning and idempotent jobs.
- Usage events should be indexed by idempotency key and meter.
- Usage aggregates should avoid scanning raw events for every invoice.
- Dashboard queries should read aggregates and summaries where possible.

## Observability Plan

MVP observability:

- Structured logs
- Job run table
- Failed job view
- Usage ingestion errors
- Audit log view

Future observability:

- Metrics
- Tracing
- Queue dashboards
- Alerting
## Accepted Phase 6 Decisions

- [Identity and session boundary](./adr/0001-identity-and-session-boundary.md)
- [Workspace tenancy and ownership](./adr/0002-workspace-tenancy-and-ownership.md)
- [Hosted demo topology](./adr/0003-hosted-demo-topology.md)
- [AI hosting and provider policy](./adr/0004-ai-hosting-and-provider-policy.md)

These ADRs refine the runtime boundaries above. Clerk verifies identity, RevFlow authorizes from application memberships, and every finance repository remains workspace-scoped in PostgreSQL.
