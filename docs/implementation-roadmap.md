# Implementation Roadmap

## Phase 1 - Foundation

Status: complete.

Goal: create the runnable monorepo skeleton.

- Monorepo setup
- Shared TypeScript and Zod packages
- Express API app
- Next.js web app
- Worker app scaffold
- Database package and migration runner
- Queue package scaffold
- Docker Compose for Postgres and Redis
- Health checks

## Phase 2 - Core Billing Workflow

Status: complete.

Goal: establish the first end-to-end revenue workflow.

- Customers
- Catalog: products, meters, plans, price rules
- Contract draft, line item, and approval workflow
- Usage ingestion with idempotency
- Draft invoice generation and approval
- Audit log helper and viewer
- Seed data for local demos
- Basic UI pages for the core workflow

Detailed plan: [Phase 2 Execution Plan](./phase-2-execution-plan.md)
Demo script: [Phase 2 Demo Script](./phase-2-demo-script.md)
Module notes: [Phase 2 Module Notes](./phase-2-module-notes.md)

## Phase 3 - Pricing Engine And Async Billing

Status: complete.

Goal: move the working Phase 2 billing loop behind explicit pricing strategies, persisted usage aggregates, and worker-backed processing where useful.

- Pricing engine interface and strategy modules
- Flat, per-unit, and tiered pricing
- Persisted `usage_aggregates`
- Idempotent/rerunnable usage aggregation
- BullMQ queue factory and usage aggregation worker
- Invoice generation from pricing engine output and aggregates
- Raw-event fallback for local demo reliability
- Ops job-run visibility
- Tests for pricing math, rounding, zero usage, and tier behavior

Detailed plan: [Phase 3 Plan](./phase-3-plan.md)
Checklist: [Phase 3 Execution Checklist](./phase-3-execution-checklist.md)

## Phase 4 - Revenue Recognition

Status: complete.

Goal: add ASC 606-lite revenue recognition without collapsing it into billing.

- Revenue recognition migration
- Performance obligations
- Revenue schedules
- Immediate recognition
- Straight-line monthly recognition
- Deterministic journal entries
- Revenue API routes
- `/revenue` UI
- Source invoice/customer context
- Audit event enrichment

Simplifications kept deliberately:

- Usage-priced invoice lines default to immediate recognition for the MVP
- Schedule generation is synchronous
- No full ASC 606 compliance claim
- No ERP/GL integration
- No advanced allocation, amendment, proration, or FX accounting

Checklist: [Phase 4 Execution Checklist](./phase-4-execution-checklist.md)

## Phase 5 - AI Agent Layer

Status: planned.

Goal: add AI where it is genuinely valuable and keep deterministic finance math in code.

- Contract text/PDF extraction into draft config
- Ambiguity detection and confidence markers
- Human review before applying extracted terms
- Invoice anomaly detection
- Natural-language Q&A over billing/revenue data
- Dunning email draft generation with human review

## Phase 6 - Reporting, Integrations, And Portfolio Polish

Status: planned.

Goal: make the project easy to understand, demo, and discuss as a production architecture.

- MRR, ARR, NRR, revenue waterfall, and DSO dashboards
- Payment and reconciliation simulation
- ERP/CRM export stubs
- Architecture diagrams
- HLD write-up
- LLD write-up for pricing engine, invoice lifecycle, and revenue recognition
- Production tradeoff notes
- Screenshots and demo video