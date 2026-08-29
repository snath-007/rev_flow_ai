# Phase 2 Execution Plan - Database And Domain Core

## Goal

Phase 2 turns RevFlow from a runnable scaffold into the first real product slice.

By the end of Phase 2, the app should have:

- A real Postgres schema
- A migration runner
- Database-backed API routes
- Shared validation schemas
- Basic domain services
- A few working dashboard pages
- Seed data for local demos
- Audit logging for important mutations

The goal is to create a demoable revenue workflow: catalog configuration, approved customer contracts, usage ingestion, invoice draft generation, and auditability. Advanced pricing, AI extraction, and revenue recognition remain later phases.

## Time Budget

Expected effort: **15-20 focused hours**

Suggested schedule:

| Session | Time | Focus |
| --- | ---: | --- |
| Weekday 1 | 2-3 hours | Migration runner, DB health, schema skeleton |
| Weekday 2 | 2-3 hours | Customers API and customers page |
| Weekday 3 | 2-3 hours | Products and meters |
| Weekend 1 | 5-6 hours | Plans, price rules, contract drafts |
| Weekend 2 | 4-6 hours | Contract approval basics, audit helper, seed data, cleanup |

## Scope

### In Scope

- Migration runner
- Initial SQL schema
- DB health endpoint
- Repository/service structure for core modules
- Customers
- Products
- Meters
- Plans
- Price rules
- Contract drafts
- Contract versions
- Contract line items
- Basic contract approval
- Audit log helper
- Seed script
- Basic UI pages for core data

### Out Of Scope

- Usage event ingestion
- Pricing calculations
- Invoice generation
- Revenue schedules
- AI contract extraction
- Authentication
- Role-based access control
- Production-grade multi-tenancy
- Full contract amendment behavior

## Data Model To Implement

### Customers

Purpose: represent billable accounts.

Fields:

- `id`
- `name`
- `email`
- `billing_address`
- `created_at`
- `updated_at`

### Products

Purpose: represent what the SaaS company sells.

Fields:

- `id`
- `name`
- `description`
- `status`
- `created_at`
- `updated_at`

### Meters

Purpose: define measurable usage dimensions.

Fields:

- `id`
- `product_id`
- `name`
- `event_name`
- `aggregation_type`
- `unit`
- `created_at`
- `updated_at`

Aggregation types for Phase 2:

- `sum`
- `count`

### Plans

Purpose: reusable commercial packages for products.

Fields:

- `id`
- `product_id`
- `name`
- `billing_interval`
- `status`
- `created_at`
- `updated_at`

Billing intervals for Phase 2:

- `monthly`
- `annual`

### Price Rules

Purpose: define how a plan charges.

Fields:

- `id`
- `plan_id`
- `meter_id`
- `pricing_model`
- `unit_price`
- `currency`
- `config`
- `created_at`
- `updated_at`

Pricing models for Phase 2:

- `flat`
- `per_unit`
- `tiered`

Phase 2 supports flat and per-unit invoice calculation. Full tiered pricing behavior is deferred.

### Contracts

Purpose: customer-specific commercial agreements.

Fields:

- `id`
- `customer_id`
- `status`
- `start_date`
- `end_date`
- `created_at`
- `updated_at`

Statuses for Phase 2:

- `draft`
- `active`

### Contract Versions

Purpose: immutable-ish snapshot of approved commercial terms.

Fields:

- `id`
- `contract_id`
- `version_number`
- `effective_from`
- `effective_to`
- `terms_snapshot`
- `created_at`

### Contract Line Items

Purpose: connect a contract version to price rules and overrides.

Fields:

- `id`
- `contract_version_id`
- `price_rule_id`
- `name`
- `override_config`
- `created_at`

### Audit Logs

Purpose: track finance-impacting mutations.

Fields:

- `id`
- `entity_type`
- `entity_id`
- `action`
- `before_state`
- `after_state`
- `actor`
- `created_at`

For Phase 2, `actor` can default to `system`.

## API Work

### Health

```txt
GET /health
GET /health/db
```

### Customers

```txt
GET  /customers
POST /customers
GET  /customers/:id
```

### Catalog

```txt
GET  /catalog/products
POST /catalog/products
GET  /catalog/products/:id

GET  /catalog/meters
POST /catalog/meters

GET  /catalog/plans
POST /catalog/plans

GET  /catalog/price-rules
POST /catalog/price-rules
```

### Contracts

```txt
GET  /contracts
POST /contracts
GET  /contracts/:id
POST /contracts/:id/line-items
POST /contracts/:id/approve
```

### Audit

```txt
GET /audit
```

## Backend Structure

Use module folders inside `apps/api/src/modules`.

```txt
modules/
  customers/
    customers.routes.ts
    customers.service.ts
    customers.repository.ts
    customers.schemas.ts
  catalog/
    catalog.routes.ts
    catalog.service.ts
    catalog.repository.ts
    catalog.schemas.ts
  contracts/
    contracts.routes.ts
    contracts.service.ts
    contracts.repository.ts
    contracts.schemas.ts
  audit/
    audit.service.ts
    audit.repository.ts
    audit.routes.ts
```

Keep routes thin:

```txt
route -> validate input -> service -> repository -> db
```

## Shared Package Work

Add Zod schemas and types for:

- customer
- product
- meter
- plan
- price rule
- contract
- audit log

Shared schemas should be used by:

- API request validation
- API response typing
- frontend form validation where useful

## Web Work

Phase 2 UI should stay simple but real.

### App Shell

- Sidebar navigation
- Pages for Customers, Catalog, Contracts, Audit
- Basic loading and error states

### Customers Page

- List customers
- Create customer form
- Empty state

### Catalog Page

- Product list
- Meter list
- Plan list
- Price rule list
- Simple create forms

### Contracts Page

- Contract list
- Create draft contract
- Add line items
- Approve contract
- Show status badge

### Audit Page

- Audit event table
- Filter by entity type if time allows

## Seed Data

Add a seed script with:

- 2 customers
- 2 products
- 3 meters
- 2 plans
- 4 price rules
- 1 draft contract
- 1 active contract
- Sample audit events

The seed data should support demos without manual setup.

## Testing And Verification

Minimum checks:

```bash
npm run typecheck
npm run build
```

Database checks:

```bash
docker compose up -d
npm run db:migrate
```

Manual checks:

- `GET /health` returns OK
- `GET /health/db` confirms DB connectivity
- Customers can be created and listed
- Products/meters/plans/price rules can be created and listed
- Contract draft can be created
- Contract can be approved
- Audit log records important mutations
- Web pages load and show real API data

Optional tests:

- Repository tests for core CRUD
- Service tests for contract approval
- API tests for route validation

## Acceptance Criteria

Phase 2 is complete when:

- Docker Postgres starts locally
- Migration runner creates the schema from scratch
- Seed script creates demo data
- API uses Postgres for core entities
- Web app reads real API data
- Customer/catalog/contract/audit pages exist
- Contract approval creates a version snapshot
- Audit logs are written for creates and approval
- `npm run typecheck` passes
- `npm run build` passes

## What Phase 2 Unlocks

After Phase 2, RevFlow will have the stable domain base needed for the real engine work.

Phase 3 can then focus on:

- Pricing engine implementation
- Usage event ingestion
- Idempotency handling
- Usage aggregation worker
- Tests for billing calculations

Phase 2 also gives us material for interviews:

- Schema design discussion
- API boundary discussion
- Repository/service layering
- Contract versioning tradeoffs
- Auditability in finance systems
- Enterprise configuration UI choices

## Risks And Tradeoffs

### Risk: Scope Creep

Catalog and contracts can become large quickly.

Decision: keep Phase 2 to flat and per-unit calculations. Tiered pricing, minimum commitments, amendments, and advanced commercial cases move to Phase 3.

### Risk: Overbuilding UI

It is tempting to make the UI too polished too early.

Decision: build clean, usable pages with real data. Save polish for later.

### Risk: Contract Versioning Complexity

Real amendments are complicated.

Decision: Phase 2 supports initial approval snapshot only. Full amendments come later.

### Risk: Premature Multi-Tenancy

Multi-tenant data modeling affects every table.

Decision: document it as a future enhancement. Do not implement in Phase 2.

## Current Completion Status

Phase 2 has expanded from domain-core setup into a working end-to-end revenue loop.

Completed:

- Docker-backed Postgres and Redis setup
- Migration runner
- Environment auto-loading from root `.env`
- Customers module
- Catalog module for products, meters, plans, and price rules
- Contract draft, line item, and approval workflow
- Usage event ingestion with idempotency
- Usage aggregation by contract and meter
- Invoice draft generation from approved contracts and usage
- Invoice approval
- Invoice detail page with line item calculation visibility
- Audit events for major finance-impacting mutations
- Audit API and viewer page
- Seed script for local demos
- Focused invoice calculation tests
- Demo script and module documentation

Deferred beyond Phase 2:

- Authentication and RBAC
- Multi-tenancy
- Contract amendments and renewals
- Full tiered pricing math
- Invoice issuing, payment, voiding, and credit notes
- Revenue recognition schedules
- AI contract extraction

Phase 2 is considered complete when typecheck, build, migration, seed, and the demo flow pass locally.
