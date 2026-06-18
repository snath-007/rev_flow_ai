# Implementation Roadmap

## Phase 1 - Foundation

Goal: create the runnable skeleton.

- Initialize monorepo
- Add workspace package manager config
- Add TypeScript config
- Add Express API app
- Add Next.js web app
- Add worker app
- Add shared package
- Add db package
- Add queues package
- Add Docker Compose for Postgres and Redis
- Add health checks

## Phase 2 - Database And Domain Core

Goal: establish the first end-to-end revenue workflow.

- Create migrations and DB client
- Add customer CRUD
- Add product, meter, plan, and price rule models
- Add contract draft and approval models
- Add usage ingestion and aggregation
- Add invoice draft generation and approval
- Add audit log helper and viewer
- Add seed data for local demos
- Add basic UI pages for the core workflow

Detailed plan: [Phase 2 Execution Plan](./phase-2-execution-plan.md)
Demo script: [Phase 2 Demo Script](./phase-2-demo-script.md)
Module notes: [Phase 2 Module Notes](./phase-2-module-notes.md)

## Phase 3 - Pricing Engine And Async Billing

Goal: move the working Phase 2 billing loop behind explicit pricing strategies, persisted usage aggregates, and worker-backed processing where useful.

- Implement pricing engine interface
- Add flat rate strategy
- Add seat-based strategy
- Add usage-based strategy
- Add tiered usage strategy
- Add minimum commitment support
- Keep usage ingestion idempotent
- Add persisted usage aggregates
- Add usage aggregation worker
- Add tests for pricing math

Detailed Phase 3 plan: [Phase 3 Plan](./phase-3-plan.md)

## Phase 4 - Invoice Lifecycle And Collections

Goal: move from draft invoice generation to a fuller invoice lifecycle.

- Add invoice issue endpoint
- Add void and credit note flows
- Add payment status tracking
- Add invoice PDF/export option
- Add invoice lifecycle tests

## Phase 5 - AI Extraction

Goal: convert contract text into reviewable draft configuration.

- Add contract extraction run model
- Add prompt and structured output schema
- Add mocked AI provider first
- Add optional real provider integration later
- Add extraction review UI
- Add apply-to-contract workflow

## Phase 6 - Revenue Recognition

Goal: generate simple revenue schedules.

- Add performance obligation model
- Add immediate recognition
- Add straight-line recognition
- Add usage-based recognition
- Add journal entry generation
- Add revenue schedule UI

## Phase 7 - Portfolio Polish

Goal: make the project easy to understand and demo.

- Add screenshots
- Add architecture diagrams
- Add HLD write-up
- Add LLD write-up for pricing engine
- Add LLD write-up for invoice lifecycle
- Add tradeoff notes
- Add final README demo section
