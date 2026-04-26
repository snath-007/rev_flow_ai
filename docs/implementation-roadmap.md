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

Goal: establish the core data model.

- Create initial migrations
- Add DB client
- Add customer CRUD
- Add product, meter, plan, and price rule models
- Add contract draft and approval models
- Add audit log helper

## Phase 3 - Pricing And Metering

Goal: calculate usage-based charges correctly.

- Implement pricing engine interface
- Add flat rate strategy
- Add seat-based strategy
- Add usage-based strategy
- Add tiered usage strategy
- Add minimum commitment support
- Add usage event ingestion
- Add idempotency key handling
- Add usage aggregation worker
- Add tests for pricing math

## Phase 4 - Invoicing

Goal: produce explainable draft invoices.

- Add invoice generation service
- Add invoice line item calculation metadata
- Add invoice state machine
- Add invoice approval and issue endpoints
- Add invoice preview UI
- Add invoice list and detail pages

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

- Add seed data
- Add demo script
- Add screenshots
- Add architecture diagrams
- Add HLD write-up
- Add LLD write-up for pricing engine
- Add LLD write-up for invoice lifecycle
- Add tradeoff notes
- Add final README demo section

