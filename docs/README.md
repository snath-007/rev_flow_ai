# RevFlow Documentation

This folder contains the planning and design documents for RevFlow.

The project now has a working Phase 1 through Phase 5 implementation. These documents are living planning artifacts: some describe implemented behavior, while later-phase documents describe the intended direction.

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
| [Phase 6 Execution Checklist](./phase-6-execution-checklist.md) | Product experience, identity, tenancy, RBAC, reporting, and deployment plan |
| [Phase 6 Baseline Inventory](./phase-6-baseline-inventory.md) | Milestone 0 verification, permission surfaces, tenant ownership, and baseline risks |
| [ADR 0001 - Identity And Session Boundary](./adr/0001-identity-and-session-boundary.md) | Clerk identity, application-authoritative membership, and normalized actor decision |
| [ADR 0002 - Workspace Tenancy And Ownership](./adr/0002-workspace-tenancy-and-ownership.md) | Shared-schema workspace isolation, ownership, and migration decision |
| [ADR 0003 - Hosted Demo Topology](./adr/0003-hosted-demo-topology.md) | Split Vercel web, container API, managed Postgres, and optional worker topology |
| [ADR 0004 - AI Hosting And Provider Policy](./adr/0004-ai-hosting-and-provider-policy.md) | Mock-first hosted AI with local Ollama and provider-neutral expansion |
| [Phase 6 RBAC And Actor Contract](./phase-6-rbac-and-actor-contract.md) | Fixed-role capability matrix, route policy, and audit actor contract |
| [Phase 6 Metric Definitions](./phase-6-metric-definitions.md) | Deterministic MRR, ARR, revenue waterfall, AR aging, DSO, and NRR boundaries |
| [Phase 6 Product Experience Blueprint](./phase-6-product-experience-blueprint.md) | Public/product boundary, navigation, role journeys, visual direction, and UX rules |
| [Zenskar UI/UX Reference](./zenskar-ui-ux-reference.md) | Public product research translated into RevFlow navigation, onboarding, RBAC, and workflow guidance |
| [Demo Script](./phase-2-demo-script.md) | End-to-end walkthrough through AI review, billing, revenue, audit, and ops |
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
| [AI Extraction](./modules/ai-extraction.md) | Contract text extraction, confidence, human review, and apply-to-draft controls |
| [Audit And Ops](./modules/audit-ops.md) | Audit logs, job runs, operational debugging views |


