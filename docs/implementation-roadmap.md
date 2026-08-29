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

## Phase 5 - AI-Assisted Contract Extraction

Status: complete.

Goal: convert unstructured commercial text into traceable, human-reviewed draft configuration without giving AI control of financial calculations or activation.

- Persisted AI extraction runs and review history
- Shared structured extraction schemas
- Provider-neutral adapter interface
- Deterministic mock provider
- Direct Gemini API provider
- Confidence, ambiguity, missing-field, and source-snippet visibility
- `/ai` review workspace with accept, edit, and reject decisions
- Extraction approval/rejection and conservative apply workflow
- Customer match/create plus draft contract creation
- AI lifecycle audit events
- Provider/model/prompt metadata and persisted failures

Deliberately deferred:

- PDF/OCR and multi-document reconciliation
- Autonomous contract or billing activation
- Invoice anomaly detection
- Natural-language finance Q&A
- Dunning communication assistance

Checklist: [Phase 5 Execution Checklist](./phase-5-execution-checklist.md)
Module notes: [AI-Assisted Contract Extraction](./modules/ai-extraction.md)

## Phase 6 - Productization, Reporting, And Deployment

Status: in progress. Core productization is implemented; live deployment and hardening remain.

Goal: turn the functional POC into a coherent, access-controlled, deployable product demonstration.

- Unified navigation, responsive UI, and standardized interaction patterns
- Distinctive RevFlow design system for public and authenticated surfaces
- Public landing experience demonstrating the contract-to-revenue lifecycle
- Authentication and systematic customer/tenant onboarding
- Role-based access control and tenant-aware data ownership
- MRR, ARR, NRR, revenue waterfall, AR, and DSO dashboards
- Payment receipt and reconciliation simulation
- ERP/CRM export stubs
- Hosted deployment design for frontend, API, worker, Postgres, Redis, and AI
- Security, observability, backups, scaling, and production tradeoff notes
- Architecture diagrams, screenshots, and polished demo flow

Detailed checklist: [Phase 6 Execution Checklist](./phase-6-execution-checklist.md)
