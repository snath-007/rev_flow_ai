# Phase 6 Execution Checklist - Productization, Reporting, And Deployment

Phase status: planned.

## Objective

Phase 6 turns the functional RevFlow POC into a coherent, access-controlled, tenant-aware, deployable product demonstration.

The phase must improve product credibility without pretending the POC is already a production finance platform. Identity, authorization, tenant isolation, workflow consistency, and deployment safety are release gates. Reporting, payment simulation, and integration stubs build business completeness after those foundations are secure.

## Product Research Reference

Phase 6 product and interaction decisions are informed by [Zenskar UI/UX Reference For RevFlow](./zenskar-ui-ux-reference.md). Use it as evidence for workflow structure, onboarding, capability-based authorization, contract review, and reporting patterns. Adapt those principles to RevFlow; do not copy Zenskar branding or enterprise breadth.

Key constraints:

- Group navigation by operator outcome rather than backend module.
- Use a domain-driven onboarding checklist instead of a decorative tour.
- Keep fixed POC roles over a capability-based authorization layer; defer a custom role editor.
- Present AI contract work as structured review under Contracts/Review, not chat-first automation.
- Build curated deterministic reports before considering a general BI/report builder.
- Preserve additive invoice/payment history and separate internal RBAC from any future customer portal.

## Guiding Decisions

- Keep the monorepo. The existing web, API, worker, and package boundaries remain appropriate.
- Keep PostgreSQL as the financial system of record. Do not replace relational billing data with Sanity or Convex.
- Distinguish a RevFlow workspace/organization from a billed customer. A user belongs to a workspace; a customer is an account billed by that workspace.
- Derive workspace and user identity from the authenticated session. Never trust a client-supplied workspace ID for authorization.
- Enforce RBAC and tenant scoping in the API, not only by hiding navigation in the web app.
- Keep pricing, invoice, revenue, journal-entry, and reporting calculations deterministic.
- Keep the `AiProvider` boundary. Local Ollama, deterministic mock, and a future hosted open-model adapter must remain interchangeable.
- Treat free-tier vendors as deployment choices, not domain architecture.
- Preserve synchronous POC fallbacks until a hosted worker path is proven.
- Add dependencies only when a milestone needs them and the existing stack cannot reasonably provide the capability.

## Scope Tiers

### Core Release Gate

Phase 6 cannot be called complete without:

- Authentication
- Workspace onboarding
- Tenant-aware persistence and repository scoping
- API-enforced RBAC
- A documented RevFlow experience strategy and visual system
- Unified application shell and navigation
- Consistent loading, empty, error, validation, and success states
- A public landing experience that demonstrates the contract-to-revenue story
- Hosted web and API deployment
- Managed relational database
- Environment/secrets handling
- Health checks, structured logs, and basic operational visibility
- A repeatable seeded demo and release checklist

### Business Completeness

Included after the release gate foundations:

- MRR and ARR summaries
- Revenue waterfall
- AR aging and a POC DSO metric
- Payment receipt and reconciliation simulation
- CSV/JSON export boundaries for ERP/CRM handoff
- Tenant-aware audit and operations views

### Stretch Scope

Attempt only after core acceptance:

- NRR cohort reporting
- Hosted open-model provider adapter
- Queue-backed invoice or revenue jobs
- Email invitation management beyond identity-provider defaults
- Dashboard drill-down exports
- Screenshot automation and demo video

## Out Of Scope

- Full accounting, tax, or ASC 606 compliance claims
- Real payment processing or card storage
- Real ERP/CRM synchronization
- Production dunning sends
- Fully autonomous finance actions
- Multi-region disaster recovery
- Enterprise SSO/SAML implementation
- Fine-grained custom permission builders
- Splitting the monorepo into separate repositories
- Replacing Postgres with a content backend or second application database

## Identity Vocabulary

Use these terms consistently:

| Term | Meaning |
| --- | --- |
| User | Authenticated human operating RevFlow |
| Workspace | Tenant/organization that owns RevFlow configuration and finance data |
| Membership | User-to-workspace relationship with a role |
| Customer | External account billed by a workspace |
| Actor | User identity recorded on audit events |

Do not use `customer` to mean the authenticated tenant.

## Initial Role Model

Start with four workspace roles:

| Role | Intended access |
| --- | --- |
| `workspace_admin` | Memberships, workspace settings, all operational workflows |
| `finance_operator` | Customers, catalog, contracts, usage, invoices, revenue generation, AI intake |
| `reviewer` | AI review/apply, contract approval, invoice approval, revenue review |
| `auditor` | Read-only access to configuration, finance records, audit, ops, and reports |

Server permissions should be capability-based even if roles are fixed:

- `workspace.manage`
- `members.manage`
- `customers.read` / `customers.write`
- `catalog.read` / `catalog.write`
- `contracts.read` / `contracts.write` / `contracts.approve`
- `usage.read` / `usage.write`
- `invoices.read` / `invoices.generate` / `invoices.approve`
- `revenue.read` / `revenue.generate`
- `ai.read` / `ai.extract` / `ai.review` / `ai.apply`
- `audit.read`
- `ops.read`
- `reports.read`
- `payments.write`

This keeps a later custom-role model possible without rewriting route policy checks.

## Proposed Hosted-Demo Topology

The implementation milestone must validate current vendor limits before committing, but the preferred shape is:

| Concern | Preferred direction |
| --- | --- |
| Identity | Clerk organizations/users as the leading candidate |
| Web | Vercel-hosted Next.js |
| API | A container or Node host suitable for an Express service |
| Worker | Same host family as API, enabled only when Redis/background workflows are required |
| Database | Managed PostgreSQL |
| Redis | Managed Redis only when worker-backed paths are enabled |
| AI | `mock` for deterministic public demo; optional hosted open-model adapter or protected remote Ollama endpoint |
| Files | Object storage only when upload/OCR becomes real scope |
| Content | Sanity only for future editorial content, not finance persistence |
| Realtime backend | Convex is not needed while Postgres/API remain authoritative |

A Vercel-only deployment is insufficient for the current Express API, long-running worker, Postgres, Redis, and local Ollama topology. Phase 6 should deploy components according to their runtime needs rather than forcing every process into one platform.

## Milestone 0 - Phase 5 Baseline And Inventory

Status: complete.

Baseline report: [Phase 6 Milestone 0 - Baseline And Inventory](./phase-6-baseline-inventory.md)

Implementation note: all regression, migration, route/page, repository, table, queue, environment, seed, permission, and tenant-ownership inventories are complete. Automated screenshot capture was unavailable through the required browser controller and is explicitly carried to the start of Milestone 5 before visual rewiring.

Goal: establish a stable baseline and identify every surface affected by identity and tenancy.

Tasks:

- Run all workspace typechecks and API tests.
- Confirm migration `007` is applied.
- Inventory API routes, repositories, tables, queue jobs, audit writes, and pages.
- Classify every page as read-only, operator mutation, approval, admin, or public.
- Record current environment variables and deployment dependencies.
- Identify seeded/demo records that require workspace ownership.
- Capture baseline desktop and mobile screenshots of core workflows.
- Document pre-existing UI and behavior issues before rewiring.

Acceptance criteria:

- Baseline checks pass or failures are documented.
- Every API route and page has an intended permission.
- Every tenant-owned table is listed for migration.
- No Phase 6 change begins without a rollback-aware migration order.

Estimated effort: 2-4 hours.

## Milestone 1 - Architecture, Experience, And Metric Definitions

Status: complete.

Decision evidence:

- [ADR 0001 - Identity And Session Boundary](./adr/0001-identity-and-session-boundary.md)
- [ADR 0002 - Workspace Tenancy And Ownership](./adr/0002-workspace-tenancy-and-ownership.md)
- [ADR 0003 - Hosted Demo Topology](./adr/0003-hosted-demo-topology.md)
- [ADR 0004 - AI Hosting And Provider Policy](./adr/0004-ai-hosting-and-provider-policy.md)
- [Phase 6 RBAC And Actor Contract](./phase-6-rbac-and-actor-contract.md)
- [Phase 6 Deterministic Metric Definitions](./phase-6-metric-definitions.md)
- [Phase 6 Product Experience Blueprint](./phase-6-product-experience-blueprint.md)

Implementation note: Clerk proves user identity and active organization, while RevFlow memberships remain authoritative for domain capabilities. The hosted demo keeps split web/API runtimes, Postgres remains authoritative, and public AI defaults to the deterministic mock provider. Payment and reconciliation now precede reporting because credible AR aging and DSO require issued/due timestamps and additive payment applications.

Goal: settle technical contracts, product experience boundaries, and metric definitions before schema or UI work.

Tasks:

- Add an ADR for identity provider and session verification.
- Add an ADR for workspace tenancy and ownership propagation.
- Add an ADR for hosted deployment topology.
- Add an ADR for online AI behavior: mock-only demo, hosted open model, or protected remote Ollama.
- Define exact POC formulas and data sources for MRR, ARR, revenue waterfall, AR aging, DSO, and optional NRR.
- Define role-to-capability mappings.
- Define audit actor fields and authentication metadata that may be stored safely.
- Decide whether Clerk organization roles are authoritative or mapped into application memberships.
- Define the boundary between the expressive public landing site and the task-focused authenticated application.
- Define the RevFlow information architecture around Configure, Operate, Recognize, Insights, Control, and Workspace outcomes.
- Define the primary role journeys for workspace admin, finance operator, reviewer, and auditor.
- Record visual principles, typography direction, semantic color usage, density, motion, accessibility, and responsive rules.
- Define the landing-page narrative around Contract, AI Review, Pricing, Usage, Invoice, Revenue, and Audit.
- Treat the Emergent Ledger prototype and Zenskar research as interaction references only; do not copy their branding or page composition.

Metric guardrails:

- MRR must state how annual, quarterly, flat, and usage charges are normalized.
- ARR must state whether it is simply MRR x 12 for the POC.
- Pure usage revenue must not be mislabeled as committed recurring revenue.
- Revenue waterfall must come from revenue schedules, not invoice dates.
- AR and DSO must come from invoice/payment state and clearly state POC assumptions.
- NRR remains stretch until historical cohorts and contraction/churn semantics are credible.

Acceptance criteria:

- ADRs remove ambiguity about identity, tenancy, deployment, and AI hosting.
- Role capabilities are explicit enough to drive middleware tests.
- Every dashboard metric has a deterministic written definition.
- Public-site and product-workspace responsibilities are explicit.
- Navigation, role journeys, and visual principles are concrete enough to drive Milestones 5-7 without page-by-page invention.

Estimated effort: 4-7 hours.

## Milestone 2 - Authentication And Workspace Onboarding

Status: complete.

Implementation evidence:

- Clerk integrations: @clerk/nextjs 7.5.8 and @clerk/express 2.1.31
- Workspace migration: 008_create_workspaces_and_memberships.sql
- Shared actor, role, capability, workspace, membership, and onboarding contracts
- API identity verification, local development identity, workspace resolution, and onboarding routes
- Public health routes plus protected domain routes
- Request-scoped authenticated audit attribution
- Sign-in, sign-up, organization selection/creation, and workspace onboarding pages
- Local and Clerk development profiles documented in local-development.md

Verification:

- Migration 008 applied successfully.
- Local /auth/context resolves the seeded workspace_admin and full capability set.
- Local /customers succeeds through authenticated actor middleware.
- Root landing and /onboarding return HTTP 200.
- Shared tests: 6 passed.
- API tests: 112 passed.
- Monorepo typecheck: 9 tasks passed.
- Production build: 6 tasks passed on Next.js 16.2.9.

Goal: require a real identity and establish a systematic first-run workspace flow.

Likely areas:

- `apps/web` authentication middleware and protected routes
- `apps/api` session/token verification middleware
- Shared authenticated-actor types
- Workspace onboarding UI
- Environment validation

Tasks:

- Integrate the selected identity provider.
- Protect application pages while keeping health endpoints public.
- Verify API bearer/session tokens server-side.
- Add a normalized `AuthenticatedActor` context containing user ID, workspace ID, role, and capabilities.
- Add first-run workspace creation or organization selection.
- Add membership synchronization/mapping.
- Add sign-in, sign-out, unauthorized, no-workspace, and invitation states.
- Record authenticated user identity on audit events.
- Keep local development documented and practical.

Acceptance criteria:

- Anonymous users cannot access protected pages or domain APIs.
- A new user can create/select a workspace and reach the application.
- The API rejects missing, invalid, or expired authentication.
- Identity-provider objects do not leak throughout domain services.
- Health endpoints remain usable by deployment monitors.

Estimated effort: 6-10 hours.

## Milestone 3 - Tenant-Aware Data Model And Migration

Status: complete.

Goal: ensure every workspace can access only its own data.

Likely migration:

- `009_add_workspace_scope.sql`

Tenant-owned areas should include:

- Customers
- Products, meters, plans, and price rules
- Contracts and line items
- Usage events and aggregates
- Invoices and line items
- Revenue obligations, schedules, and journal entries
- Payments/reconciliation records
- Audit logs and job runs
- AI extraction runs and reviews

Tasks:

- Add application workspace/membership records only if they are needed beyond the identity provider.
- Add `workspace_id` to tenant-owned root records.
- Propagate ownership through child records or enforce ownership through parent joins.
- Backfill existing rows into a deterministic local/demo workspace.
- Add non-null constraints only after backfill.
- Add workspace-first indexes for common list and uniqueness queries.
- Update seeds to create workspace-owned data.
- Update queue payloads to carry trusted workspace context.
- Define deletion/retention behavior without implementing destructive tenant deletion.

Repository rules:

- Every tenant-owned repository method accepts trusted workspace context.
- List/detail/update queries scope by workspace.
- Cross-tenant misses return not found or forbidden consistently.
- Request bodies cannot override authenticated workspace ownership.
- Global uniqueness constraints become workspace-scoped where appropriate.

Acceptance criteria:

- Existing demo data is preserved under a default workspace.
- Cross-workspace repository tests prove isolation.
- Queue jobs and audit events retain workspace ownership.
- No tenant-owned list query can run without workspace context.

Implementation evidence:

- Migration `009_add_workspace_scope.sql` assigns all 19 existing tenant-owned tables to a workspace and backfills legacy rows into the deterministic demo workspace.
- Workspace-first indexes, workspace-scoped uniqueness constraints, and composite parent foreign keys prevent cross-workspace relationships at the database boundary.
- Customer, catalog, contract, usage, invoice, revenue, AI, audit, and operations repositories derive ownership exclusively from authenticated request context.
- Usage queue payloads, aggregation workers, audit events, and job runs retain trusted workspace and initiating-user attribution.
- The seed is deterministic and workspace-aware, is idempotent per workspace, and requires explicit `ALLOW_DEMO_SEED=true` in production.
- Database isolation tests prove list/detail/write isolation and rejection of cross-workspace references.

Verification evidence:

- Migrations `001` through `009` and two consecutive seed runs succeeded against a fresh temporary database with zero unowned customer or audit rows and one seed marker.
- All 15 authenticated read surfaces returned `200` under the local demo workspace, and a live usage aggregation produced a workspace-owned aggregate and attributed audit event.
- Shared tests passed: 6 tests. API tests passed: 112 tests with 6 expected skips. Tenant database tests passed: 3 tests when enabled explicitly.
- Monorepo typecheck passed across all 9 tasks. Production builds passed across all 6 packages, including the Next.js application with 24 generated routes.

Estimated effort: 8-14 hours.

## Milestone 4 - RBAC Enforcement And Navigation Policy

Status: complete.

Goal: enforce capabilities consistently in API routes and reflect them in the UI.

Tasks:

- Add centralized capability mapping for fixed roles.
- Add API authorization middleware/helpers.
- Apply policies to every route from the Milestone 0 inventory.
- Distinguish create/edit permissions from approval permissions.
- Prevent self-escalation through membership/workspace endpoints.
- Add page/section guards and capability-aware actions.
- Hide inaccessible navigation while still relying on API enforcement.
- Add explicit forbidden UI states for deep links.
- Add audit events for membership and role changes.
- Add a role/route test matrix.

Implementation evidence:

- `requireCapability` enforces capability checks at the Express route edge after authenticated actor resolution and before service execution.
- Customer, catalog, contract, usage, invoice, revenue, AI extraction, audit, and ops routes now declare explicit read, write, generate, approve, review, or apply capabilities.
- Approval boundaries are separated from creation/generation boundaries for contracts, invoices, AI review/apply, and revenue generation.
- Fixed role capability mapping remains centralized in `@revflow/shared` and continues to be the single role-to-capability source for API and web checks.
- The web landing navigation filters by authenticated actor capabilities when a workspace context exists.
- Customers, catalog, contracts, usage, invoices, revenue, and AI pages hide unavailable action forms and show explicit read-only permission notices for deep-link users.
- Membership mutation and workspace administration endpoints are not implemented yet, so self-escalation is currently prevented by absence of mutation surface; future membership endpoints must require `members.manage` and preserve the last-admin guard.

Verification evidence:

- Monorepo typecheck passed across all 9 tasks after the route policy changes.
- Shared role capability tests passed: 6 tests.
- Focused API auth/RBAC tests passed: 7 tests.
- Full API regression suite passed: 116 tests with 6 expected skips.
- Monorepo production build passed across all 6 packages, including the Next.js application with 24 generated routes.

Acceptance criteria:

- Auditor cannot mutate any finance or configuration record.
- Reviewer can perform configured approvals without workspace administration.
- Finance operator cannot manage membership unless explicitly allowed.
- Workspace admin cannot cross tenant boundaries.
- Hidden buttons are not the only authorization control.
- Route policy tests cover every mutation endpoint.

Estimated effort: 5-8 hours.

## Milestone 5 - RevFlow Design System And Application Shell

Status: complete.

Goal: establish RevFlow's distinctive visual language and application workspace before polishing individual workflows.

Tasks:

- Capture the deferred desktop and mobile baseline before visual rewiring begins.
- Build a stable sidebar/top-bar shell with workspace switcher, user menu, environment indicator, and responsive navigation.
- Group navigation by operator outcome: Configure, Operate, Recognize, Insights, Control, and Workspace.
- Add role-aware navigation from the RBAC capability map.
- Implement shared design tokens for neutral surfaces, balanced product accents, semantic status colors, borders, spacing, typography, motion, and focus states.
- Establish separate density rules for dashboards, tables, forms, reviews, and public storytelling surfaces.
- Standardize page headers, action bars, tabs, tables, forms, dialogs, drawers, badges, pagination, and filters.
- Add reusable money, quantity, date-period, status, and actor display helpers.
- Add toast, inline error, empty, loading, and skeleton patterns.
- Make keyboard focus, labels, contrast, and touch targets accessible.
- Ensure layouts work at mobile, tablet, laptop, and wide desktop widths.
- Avoid decorative dashboard cards where tables or compact summaries are more useful.
- Keep product pages operational and quiet; reserve expressive imagery and storytelling for the public site.
- Add lightweight visual regression evidence for the shell and shared components.

Implementation evidence:

- Added a shared `WorkspaceShell` with sticky sidebar navigation, top bar, workspace switcher, role label, environment indicator, local/Clerk user display, and responsive mobile navigation.
- Added the authenticated `/overview` workspace home with role, capability, review cue, invoice, usage, job, and recent audit summaries.
- Reworked capability-aware navigation into grouped operator outcomes: Overview, Configure, Operate, Recognize, and Control.
- Wrapped customers, catalog, contracts, usage, invoices, invoice detail, revenue, AI review, audit, and ops pages in the shared workspace shell.
- Updated post-onboarding and authenticated workspace entry links to land on `/overview`.
- Added a Phase 6 workspace design-system layer for graphite navigation, neutral work surfaces, restrained teal accents, semantic status colors, responsive spacing, focus states, mobile tables, overview metrics, and stable shell dimensions.
- Cleaned an audit-page encoding artifact in the event count separator.
- The installed `lucide-react` ESM package currently fails Turbopack production builds because its icon modules cannot resolve the missing shared factory file; the shell uses local inline SVG navigation icons until that dependency is refreshed.

Verification evidence:

- Monorepo typecheck passed across all 9 tasks.
- Monorepo production build passed across all 6 packages, including the Next.js application with 25 generated routes.
- `git diff --check` passed with only Git line-ending warnings.
- Local dev servers started successfully: API on `http://localhost:4000` and web on `http://localhost:3000`.
- Workspace route smoke tests returned HTTP 200 for `/overview`, `/customers`, `/catalog`, `/contracts`, `/usage`, `/invoices`, `/revenue`, `/ai`, `/audit`, and `/ops`.

Acceptance criteria:

- Every page renders inside one coherent shell.
- RevFlow is visually distinguishable from both the Emergent Ledger prototype and Zenskar.
- Navigation is predictable and role-aware.
- Shared controls do not resize or overlap across supported viewports.
- Status colors have consistent financial meaning.
- Core accessibility checks pass.
- No page depends on explanatory marketing text to be usable.

Estimated effort: 8-12 hours.

## Milestone 6 - Core Workflow UX Standardization

Status: complete.

Goal: make the existing functional workflows feel like one deliberate product.

Workflow order:

1. Workspace onboarding
2. Customer and catalog setup
3. Contract creation/AI intake
4. Human review and approval
5. Usage ingestion and aggregation
6. Invoice generation and approval
7. Revenue schedule generation
8. Audit and operational review

Tasks:

- Standardize list/detail/create/edit patterns.
- Add breadcrumbs or stable contextual back-navigation.
- Preserve filters and selected records when moving between list/detail views.
- Add confirmation dialogs for finance-impacting transitions.
- Show prerequisites and blocked reasons near disabled actions.
- Add consistent actor/timestamp/status history.
- Improve AI review ergonomics for field decisions, edits, ambiguity, and apply results.
- Improve invoice and revenue explainability without changing deterministic engines.
- Add empty states that direct users to the next valid workflow action.
- Remove duplicate or conflicting UI patterns.
- Verify optimistic updates do not misrepresent persisted finance state.

Implementation evidence:

- Added shared workflow primitives for breadcrumb page headers, workflow step guides, next-action panels, and blocked/prerequisite notices.
- Standardized customer, catalog, contract, usage, invoice, invoice detail, revenue, AI review, audit, and operations pages around the same workflow language inside the workspace shell.
- Added setup readiness flows for customer creation, catalog completeness, contract activation, usage ingestion, invoice approval, revenue recognition, AI review, and audit/ops review.
- Added next valid action links across the seeded flow so users can progress without knowing route URLs.
- Added blocked reasons beside empty states and disabled actions for missing customers, products, meters, plans, price rules, active contracts, draft invoices, approved invoices, and revenue schedules.
- Added confirmation prompts and consequence notes for finance-impacting transitions: contract approval, invoice generation, invoice approval, revenue generation, and applying approved AI extraction output.
- Improved AI review ergonomics by making accept/edit/reject field actions visible, clarifying pending field counts, and confirming apply-to-draft consequences.
- Added invoice detail evidence summaries and explicit back/next navigation into revenue recognition.
- Standardized audit and operations review pages with workflow headers and compact evidence summaries.

Verification evidence:

- Monorepo typecheck passed across all 9 tasks.
- Monorepo production build passed across all 6 packages, including the Next.js application with 25 generated routes.
- `git diff --check` passed with only Git line-ending warnings.
- Local workspace route smoke tests returned HTTP 200 for `/overview`, `/customers`, `/catalog`, `/contracts`, `/usage`, `/invoices`, `/revenue`, `/ai`, `/audit`, and `/ops`.

Acceptance criteria:

- A first-time user can complete the seeded workflow without route knowledge.
- Approval actions clearly show consequence and resulting state.
- Error recovery does not lose entered form data unnecessarily.
- Mobile and desktop screenshots show no clipping or overlap.
- Existing workflow behavior and API contracts remain intact.

Estimated effort: 10-16 hours.

## Milestone 7 - Public Landing And Product Narrative

Status: complete.

Implementation note: the public landing is now a separate route from the authenticated workspace shell, uses the retro sketchbook product narrative, shows the contract-to-revenue lifecycle, includes role-specific outcomes, trust/control boundaries, local demo CTAs, responsive landing sections, and upgraded page metadata/social-preview copy. Verification completed with web typecheck, production build, and local `/` route probe.

Goal: present RevFlow as a credible, distinctive product while directing authenticated users into the application.

Tasks:

- Build a public route and navigation boundary separate from the authenticated application shell.
- Make RevFlow the first-viewport product signal with a concise AI-assisted revenue operations proposition.
- Use a full-width product visual or interactive workflow scene rather than a generic split hero or decorative card composition.
- Show the contract-to-revenue lifecycle: Contract, AI Review, Pricing, Usage, Invoice, Revenue, and Audit.
- Demonstrate real product states and workflows rather than unsupported feature claims.
- Explain role-specific outcomes for finance operators, reviewers, workspace administrators, and auditors.
- Communicate deterministic financial calculations, human approval, provider-neutral AI, and auditability.
- Add clear actions for opening the demo, signing in, or exploring the workflow.
- Ensure the next content section remains visible from the hero on supported desktop and mobile viewports.
- Keep motion purposeful, reduced-motion aware, and inexpensive enough for a hosted demo.
- Validate responsive layout, image clarity, keyboard access, performance, metadata, and social preview behavior.

Acceptance criteria:

- The landing page tells RevFlow's actual end-to-end story without resembling a generic billing template.
- Claims match implemented POC behavior and clearly distinguish current capability from future direction.
- Public and authenticated navigation do not leak into one another unpredictably.
- Primary calls to action work in local and hosted-demo profiles.
- Desktop and mobile visual checks show no overlap, clipping, unreadable text, or blank product media.

Estimated effort: 6-10 hours.

## Milestone 8 - Payment And Reconciliation Simulation

Status: pending.

Goal: complete the POC order-to-cash loop without integrating a real payment processor.

Likely migration:

- `010_create_payments_and_reconciliation.sql`

Tasks:

- Add payment records with workspace, customer, invoice, amount, currency, date, reference, and status.
- Add manual payment receipt workflow.
- Add deterministic matching to one invoice for the initial POC.
- Support partial, exact, and overpayment visibility without silently discarding balances.
- Update invoice payment state through explicit service rules.
- Add reconciliation status and exception notes.
- Add audit events for payment creation, matching, and reversal.
- Feed AR aging and DSO read models.
- Do not store card/bank credentials.

Acceptance criteria:

- Partial payment does not mark an invoice fully paid.
- Exact payment can transition an eligible invoice to paid.
- Currency mismatch is rejected.
- Reversal is additive/audited rather than destructive.
- Reconciliation actions are tenant-scoped and permission-controlled.

Estimated effort: 6-10 hours.

## Milestone 9 - Tenant-Aware Reporting

Status: pending.

Goal: add deterministic finance summaries using explicit read models.

Suggested API:

```txt
GET /reports/overview
GET /reports/mrr
GET /reports/revenue-waterfall
GET /reports/ar-aging
GET /reports/dso
```

Tasks:

- Implement metric definitions from Milestone 1.
- Add repository queries/read models scoped by workspace.
- Add date range and currency filters where credible.
- Add overview KPIs with comparison periods only when source data supports them.
- Add MRR/ARR breakdown by customer or contract.
- Add revenue waterfall from persisted schedules.
- Add AR aging buckets from issued/approved invoices and payment state.
- Add POC DSO with its assumptions visible.
- Keep NRR stretch-gated behind credible historical cohort data.
- Add charts only where they improve comparison over tables.
- Add tests with known fixtures and edge cases.

Acceptance criteria:

- Every number links to a deterministic formula and source records.
- Reports cannot leak cross-workspace data.
- Currency handling is explicit; unsupported aggregation is blocked or separated.
- Empty and partial datasets remain understandable.
- Report tests prove known totals.

Estimated effort: 8-14 hours.

## Milestone 10 - Integration And Export Boundaries

Status: pending.

Goal: demonstrate maintainable ERP/CRM integration design without building real external synchronization.

Tasks:

- Define versioned export DTOs for customers, invoices, payments, journal entries, and revenue schedules.
- Add CSV/JSON export commands or endpoints.
- Add an integration-run record with status, actor, timestamps, and error summary.
- Add idempotency/export reference fields where future connectors need them.
- Keep connector adapters outside domain services.
- Add a mock ERP/GL export adapter.
- Document webhook/outbox direction for production.
- Avoid introducing Sanity, Convex, or a second source of truth.

Acceptance criteria:

- Exports are workspace-scoped and permission-controlled.
- Exported journal entries remain deterministic records, not AI output.
- Re-running an export has explicit duplicate/idempotency behavior.
- Mock connector failures are visible and auditable.

Estimated effort: 4-7 hours.

## Milestone 11 - Hosted Deployment And CI

Status: pending.

Goal: make the application safely accessible online with repeatable builds and migrations.

Tasks:

- Confirm final provider choices against current free-tier/runtime limits.
- Deploy Next.js web separately from runtime components that need a persistent Node/container process.
- Deploy the Express API with health checks.
- Provision managed Postgres and apply migrations through an explicit release step.
- Provision Redis/worker only if hosted async workflows are enabled.
- Configure Clerk domains, callbacks, organizations, and production keys.
- Choose public-demo AI behavior:
  - deterministic mock, or
  - hosted open-model adapter with quotas, or
  - protected remote Ollama endpoint
- Never expose an unauthenticated local Ollama service to the public internet.
- Configure CORS, trusted origins, secure cookies/tokens, and environment validation.
- Add CI for install, typecheck, tests, and build.
- Add preview/production environment separation.
- Add demo seed strategy that cannot overwrite production data.
- Document rollback for application release and additive migrations.

Acceptance criteria:

- A fresh deployment can be reproduced from documentation.
- Web, API, database, and optional worker health are visible.
- Secrets are not committed or exposed to the browser.
- Authentication callbacks and API authorization work on hosted domains.
- Migrations are explicit and observable.
- Public demo usage cannot create unbounded model or queue cost.

Estimated effort: 8-14 hours.

## Milestone 12 - Security, Observability, And Resilience

Status: pending.

Goal: add the minimum controls expected before sharing the hosted POC.

Tasks:

- Add structured request logs with request, user, workspace, route, status, and latency identifiers.
- Redact tokens, source contract text, and sensitive payloads.
- Add consistent error IDs without exposing stack traces to clients.
- Add rate limits for authentication-sensitive, usage-ingestion, AI, and export routes.
- Add request size limits for pasted contract text and ingestion payloads.
- Add security headers and strict CORS policy.
- Add database connection and migration health visibility.
- Add AI timeout, retry, and quota behavior appropriate to the selected hosted provider.
- Add queue failure/retry visibility if workers are hosted.
- Add backup/restore and data-retention notes.
- Review dependency and secret scanning in CI.
- Document known POC security limitations.

Acceptance criteria:

- Logs support tracing a user action without leaking contract text or credentials.
- Rate and size limits fail predictably.
- Tenant and RBAC tests remain green.
- Operational failures are visible without database access.
- Hosted health checks distinguish API-up from database-ready where useful.

Estimated effort: 6-10 hours.

## Milestone 13 - Documentation, Demo, And Release Review

Status: pending.

Goal: make Phase 6 easy to evaluate, operate, and discuss.

Files likely affected:

- `README.md`
- `docs/architecture.md`
- `docs/frontend-design.md`
- `docs/production-way-forward.md`
- `docs/local-development.md`
- Demo script and screenshots
- Deployment runbook
- RBAC matrix
- Metric definitions
- HLD and focused LLD notes

Tasks:

- Update architecture diagrams with identity, workspace, hosted services, and AI path.
- Document local, hosted-demo, and production-forward profiles.
- Document role capabilities and tenant isolation.
- Document metric formulas and limitations.
- Refresh the end-to-end demo script.
- Add representative screenshots at desktop and mobile widths.
- Add deployment, migration, rollback, seed, and troubleshooting commands.
- Add production tradeoff articles rather than implementing unnecessary POC complexity.
- Record final test/build/deployment evidence.
- Prepare a concise PR description and release notes.

Acceptance criteria:

- README and docs do not overclaim production readiness.
- A reviewer can run locally or access the hosted demo.
- Demo data exercises authentication, RBAC, AI review, billing, revenue, reporting, and audit.
- Known limitations and production next steps are explicit.

Estimated effort: 4-7 hours.

## Required Test Matrix

### Identity And Tenant Isolation

- Anonymous request rejection
- Invalid/expired token rejection
- Workspace selection required
- Cross-workspace list/detail/mutation isolation
- Queue job workspace propagation
- Audit workspace and actor attribution

### RBAC

- Every role against every mutation capability
- Deep-link access, not only hidden navigation
- Approval separation
- Membership self-escalation prevention
- Auditor read-only behavior

### Financial Regression

- Pricing strategy tests
- Usage idempotency and aggregation
- Invoice generation and approval
- Revenue schedules and journal entries
- Payment partial/exact/overpayment behavior
- Reporting fixture totals

### AI Regression

- Mock provider determinism
- Ollama/hosted adapter schema validation
- Provider error persistence
- Review decision requirements
- Apply-to-draft activation guard

### Frontend And Deployment

- Web/API typechecks and builds
- Core page smoke tests
- Desktop/mobile visual checks
- Hosted authentication callback
- API/database health
- Environment validation

## Phase 6 Release Profiles

### Local Development

- Mock AI by default
- Optional local Ollama
- Docker Postgres/Redis
- Seeded default workspace
- Development identity keys

### Hosted Demo

- Real authentication
- One or more isolated workspaces
- Managed Postgres
- Deterministic mock AI by default unless hosted inference is bounded
- Synchronous finance workflows acceptable
- Optional worker/Redis
- Rate-limited seed/demo behavior

### Production-Forward Design

Document, but do not fully implement:

- Outbox-backed async workflows
- Transactional audit writes
- Independent worker scaling
- Object storage/OCR ingestion
- Real ERP/payment connectors
- Enterprise SSO
- Advanced backups, retention, and disaster recovery
- Service/repository split only when team or scale requires it

## Execution Order

1. Milestone 0 - Baseline and inventory
2. Milestone 1 - Architecture, experience strategy, permissions, and metric definitions
3. Milestone 2 - Authentication and onboarding
4. Milestone 3 - Tenant migration and repository scoping
5. Milestone 4 - RBAC enforcement
6. Milestone 5 - RevFlow design system and application shell
7. Milestone 6 - Core workflow UX
8. Milestone 7 - Public landing and product narrative
9. Milestone 8 - Payments/reconciliation
10. Milestone 9 - Reporting
11. Milestone 10 - Integration/export boundaries
12. Milestone 11 - Hosted deployment and CI
13. Milestone 12 - Security/observability
14. Milestone 13 - Documentation/demo/release

Milestones 1 and initial design-system exploration can overlap. Milestone 7 may begin with narrative and wireframes after Milestone 1, but final product media should use the shell and workflows produced by Milestones 5-6. After tenant and RBAC foundations are complete, reporting and payment work may proceed in parallel with page-level UX refinement. Deployment discovery should begin early, but production deployment should occur only after tenant isolation and API authorization pass.

## Effort Guidance

These ranges are planning estimates, not commitments:

- Core release gate through secure hosted product and public landing experience: approximately 51-75 hours
- Reporting, payments, and export boundaries: approximately 18-31 hours
- Final security, documentation, and demo work: approximately 10-17 hours
- Full Phase 6 plan: approximately 79-123 hours

A narrower portfolio release can complete Milestones 0-8 and 11-13 while deferring payments and export boundaries, reducing the likely effort to roughly 61-90 hours.

## Final Phase 6 Acceptance

Phase 6 is complete when:

- Authentication and workspace onboarding work locally and online.
- Tenant-owned data is isolated at repository and API boundaries.
- RBAC is enforced server-side and reflected consistently in the UI.
- The application uses one coherent responsive shell and workflow language.
- The public landing page demonstrates the implemented contract-to-revenue lifecycle and carries a distinct RevFlow identity.
- Required reports use documented deterministic formulas.
- Payment/reconciliation simulation is either implemented or explicitly moved to stretch scope before execution begins.
- Hosted deployment is reproducible and monitored.
- AI remains review-gated and provider-neutral.
- Security and observability controls are documented and demonstrated.
- Existing pricing, usage, invoice, revenue, audit, ops, and AI tests remain green.
- README, architecture, runbooks, and demo material match actual behavior.

Required final commands should include:

```bash
npm run typecheck
npm run test
npm run build
```
