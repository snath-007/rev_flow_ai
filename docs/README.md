# RevFlow Documentation

This folder contains the planning and design documents for RevFlow.

The project now has a working Phase 1 through Phase 4 implementation. These documents are living planning artifacts: some describe implemented behavior, while later-phase documents describe the intended direction.

## Document Map

| Document | Purpose |
| --- | --- |
| [Product Brief](./product-brief.md) | Product problem, target users, core workflows, and MVP scope |
| [Architecture](./architecture.md) | System design, service boundaries, data flow, and scaling concerns |
| [Data Model](./data-model.md) | Planned entities, relationships, and schema design notes |
| [API Plan](./api-plan.md) | Planned API resources, endpoint groups, and validation approach |
| [Frontend Design](./frontend-design.md) | UI stack, design-system choices, and planned frontend surfaces |
| [Implementation Roadmap](./implementation-roadmap.md) | Phased build plan from scaffold to polished demo |
| [Phase 2 Execution Plan](./phase-2-execution-plan.md) | Detailed scope, schedule, deliverables, and acceptance criteria for Phase 2 |
| [Phase 3 Plan](./phase-3-plan.md) | Pricing engine, usage aggregation, and worker-backed billing plan |
| [Phase 3 Execution Checklist](./phase-3-execution-checklist.md) | Task-by-task implementation checklist for Phase 3 |
| [Phase 4 Execution Checklist](./phase-4-execution-checklist.md) | Task-by-task implementation checklist for revenue recognition |
| [Phase 5 Execution Checklist](./phase-5-execution-checklist.md) | Task-by-task implementation checklist for AI-assisted extraction and review |
| [Production Way Forward](./production-way-forward.md) | Monorepo decision, production decomposition, and scalability notes |
| [Local Development](./local-development.md) | Setup commands, ports, and local service notes |
| [Interview Prep](./interview-prep.md) | HLD, LLD, DSA, and product-engineering talking points |

## Module Plans

| Module | Purpose |
| --- | --- |
| [Contracts](./modules/contracts.md) | Contract intake, versions, amendments, approval workflow |
| [Catalog](./modules/catalog.md) | Products, plans, meters, and reusable commercial configuration |
| [Pricing](./modules/pricing.md) | Pricing strategies and calculation contracts |
| [Metering](./modules/metering.md) | Usage ingestion, idempotency, aggregation, and event visibility |
| [Invoicing](./modules/invoicing.md) | Draft invoices, lifecycle states, line items, adjustments |
| [Revenue Recognition](./modules/revrec.md) | ASC 606-lite schedules, earned/deferred revenue, journal entries |
| [AI Extraction](./modules/ai-extraction.md) | Contract text extraction, confidence, review, and activation |
| [Audit And Ops](./modules/audit-ops.md) | Audit logs, job runs, operational debugging views |


