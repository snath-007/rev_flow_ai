# Phase 4 Execution Checklist - Revenue Recognition

## Objective

Phase 4 adds ASC 606-lite revenue recognition on top of the completed billing foundation.

The goal is to show that RevFlow understands the most important finance-domain distinction: invoices represent billing/cash timing, while revenue schedules represent when value is earned. Phase 4 should generate deterministic schedules and journal entries without collapsing those concepts into invoice generation.

## Working Rules

- Keep invoice generation and revenue recognition separate.
- Do not mutate issued/approved invoice line items while generating revenue schedules.
- Keep recognition logic deterministic and testable; no LLM calls for revenue math or journal entries.
- Start with ASC 606-lite behavior, not a full compliance engine.
- Prefer one clear schedule per invoice line item before adding complex allocation behavior.
- Keep current Phase 1-3 demo flow working.
- Write audit events for schedule generation and posting-state changes.

## Phase 4 Scope

In scope:

- Performance obligation model
- Revenue schedule table
- Journal entry table
- Immediate recognition
- Straight-line recognition
- Usage-based recognition
- Schedule generation from invoice line items
- Earned vs deferred summary
- Revenue schedule API and UI
- Focused tests for recognition math and period boundaries

Out of scope:

- AI extraction and review
- Full ASC 606 compliance claims
- Complex contract combination rules
- Advanced standalone selling price allocation
- Contract amendments and proration
- ERP/GL real integration
- Payment reconciliation and dunning
- Multi-currency FX accounting

## Milestone 0 - Baseline Verification

Status: pending

Goal: confirm the Phase 3 branch is healthy before touching revenue recognition code.

Commands:

```bash
npm run typecheck -w @revflow/db
npm run typecheck -w @revflow/shared
npm run typecheck -w @revflow/api
npm run typecheck -w @revflow/web
npm run typecheck -w @revflow/worker
npm run test -w @revflow/api
```

Acceptance criteria:

- All package checks pass.
- API tests pass.
- Any pre-existing failure is documented before Phase 4 work starts.

## Milestone 1 - Revenue Recognition Data Model

Status: pending

Goal: add the schema foundation for revenue recognition.

Likely files:

- `packages/db/src/migrations/006_create_revenue_recognition.sql`
- `packages/shared/src/schemas/revrec.ts`
- `packages/shared/src/index.ts`

Entities:

- `performance_obligations`
- `revenue_schedules`
- `journal_entries`

Suggested fields:

Performance obligations:

- `id`
- `contract_id`
- `contract_line_item_id`
- `invoice_line_item_id`
- `name`
- `recognition_method`: `immediate | straight_line | usage_based`
- `allocated_amount`
- `currency`
- `service_start`
- `service_end`
- `status`: `active | satisfied | cancelled`
- timestamps

Revenue schedules:

- `id`
- `performance_obligation_id`
- `invoice_id`
- `invoice_line_item_id`
- `period_start`
- `period_end`
- `recognition_date`
- `recognized_amount`
- `deferred_amount`
- `status`: `planned | posted | reversed`
- timestamps

Journal entries:

- `id`
- `revenue_schedule_id`
- `entry_date`
- `account_code`
- `debit_credit`: `debit | credit`
- `amount`
- `currency`
- `memo`
- timestamps

Acceptance criteria:

- Migration applies from scratch.
- Shared schemas/types export cleanly.
- Tables preserve invoice-vs-revenue separation.

## Milestone 2 - Recognition Engine Skeleton

Status: pending

Goal: create pure recognition logic before wiring repositories or HTTP routes.

Likely files:

- `apps/api/src/modules/revrec/revrec.types.ts`
- `apps/api/src/modules/revrec/revrec-engine.ts`
- `apps/api/src/modules/revrec/strategies/immediate.strategy.ts`
- `apps/api/src/modules/revrec/strategies/straight-line.strategy.ts`
- `apps/api/src/modules/revrec/strategies/usage-based.strategy.ts`
- `apps/api/src/modules/revrec/revrec-engine.test.ts`

Tasks:

- Define recognition input/output types.
- Add money allocation helper with deterministic rounding.
- Implement immediate recognition strategy.
- Implement straight-line monthly allocation strategy.
- Add placeholder or narrow implementation for usage-based recognition.

Acceptance criteria:

- Immediate recognition test passes.
- Straight-line schedule allocation test passes.
- Rounding residuals are handled deterministically.
- Engine has no HTTP/database dependency.

## Milestone 3 - Straight-Line And Immediate Recognition Tests

Status: pending

Goal: harden the two most important MVP recognition methods before persistence.

Tests to cover:

- Immediate recognition recognizes full amount on invoice/service start date.
- Straight-line recognition spreads amount across monthly service periods.
- Short periods and partial month simplification are documented.
- Rounding residual lands in the final period.
- Zero amount is deterministic.
- Invalid service period is rejected.

Acceptance criteria:

- Tests clearly explain the simplified ASC 606-lite behavior.
- No database setup is needed for these tests.

## Milestone 4 - Revenue Recognition Repository And Service

Status: pending

Goal: generate persisted obligations and schedules from invoice line items.

Likely files:

- `apps/api/src/modules/revrec/revrec.repository.ts`
- `apps/api/src/modules/revrec/revrec.service.ts`

Tasks:

- Fetch invoice, invoice line items, contract context, and period data.
- Create one performance obligation per invoice line item for MVP.
- Pick recognition method from line snapshot/config where available; otherwise default:
  - flat lines: straight-line over invoice period
  - usage/per-unit/tiered lines: usage-based or immediate for MVP, document choice
- Persist generated revenue schedules idempotently.
- Prevent duplicate schedule generation for the same invoice unless explicitly regenerated.
- Write audit event for schedule generation.

Acceptance criteria:

- Existing invoices can generate revenue schedules.
- Re-running generation does not duplicate schedules.
- Billing records remain unchanged.

## Milestone 5 - Journal Entry Generation

Status: pending

Goal: add simple deterministic journal entries from planned schedules.

Tasks:

- Generate balanced debit/credit entries for each schedule row.
- Use simple account codes for POC:
  - `deferred_revenue`
  - `revenue`
- Store entries linked to revenue schedule rows.
- Add tests for balanced entries.

Acceptance criteria:

- Every schedule can produce balanced journal entries.
- No LLM is involved.
- Entries are explainable and linked to source schedules.

## Milestone 6 - Revenue Recognition API

Status: pending

Goal: expose revenue recognition workflows through the API.

Likely routes:

```txt
GET  /revenue/schedules
POST /revenue/schedules/generate
GET  /revenue/schedules/:id
GET  /revenue/journal-entries
```

Tasks:

- Add `revrec.routes.ts`.
- Mount router under `/revenue`.
- Validate request bodies with shared schemas.
- Return schedules with invoice/customer context where useful.
- Standardize errors for duplicate generation, missing invoice, and invalid invoice state.

Acceptance criteria:

- API routes are thin.
- Service layer owns business rules.
- API typecheck passes.

## Milestone 7 - Revenue Recognition UI

Status: pending

Goal: add a simple operator view for generated schedules and journal entries.

Likely files:

- `apps/web/app/revenue/page.tsx`
- `apps/web/app/revenue/revenue-forms.tsx`
- `apps/web/lib/api-client.ts`

UI surfaces:

- Generate schedules for an approved invoice.
- List revenue schedules.
- Show recognized vs deferred amounts.
- List journal entries.
- Link back to invoice where practical.

Acceptance criteria:

- `/revenue` page loads from real API data.
- Empty states are clear.
- Generated schedules are inspectable without opening the database.

## Milestone 8 - Audit And Ops Integration

Status: pending

Goal: make revenue recognition explainable in existing audit/ops surfaces.

Tasks:

- Audit schedule generation.
- Audit journal entry generation/posting if implemented as separate command.
- Optionally add revenue job runs if generation becomes async later.
- Ensure invoice detail or revenue page shows source invoice context.

Acceptance criteria:

- Finance-impacting rev-rec actions are visible in `/audit`.
- Remaining sync/async shortcuts are documented.
- Note: Phase 4 keeps revenue schedule and journal-entry generation synchronous for POC clarity; async revenue jobs remain a production/Phase 6 hardening path.

## Milestone 9 - Documentation And Demo Refresh

Status: pending

Goal: update docs so Phase 4 behavior is understandable and demoable.

Files:

- `README.md`
- `docs/modules/revrec.md`
- `docs/local-development.md`
- `docs/phase-2-demo-script.md` or renamed demo script
- `docs/implementation-roadmap.md`

Tasks:

- Mark Phase 4 status accurately.
- Document recognition methods and simplifications.
- Document invoice-vs-revenue separation.
- Update demo flow to include revenue schedule generation and journal entries.
- Note what remains for Phase 5 AI and Phase 6 reporting/polish.

Acceptance criteria:

- Docs do not overclaim ASC 606 compliance.
- Demo instructions work with seeded data after migrations.
- Remaining shortcuts are explicit.

## Final Phase 4 Acceptance

Phase 4 is complete when:

- Revenue recognition tables exist.
- Recognition engine supports immediate and straight-line recognition.
- Usage-based recognition is explicitly deferred with rationale: usage-priced invoice lines default to immediate recognition for the Phase 4 MVP while the pure engine keeps `usage_based` as an explicit placeholder.
- Approved invoices can generate revenue schedules.
- Revenue schedules and journal entries are persisted and inspectable.
- Billing and revenue records remain separate.
- Audit logs capture rev-rec generation.
- `/revenue` UI shows schedules and journal entries.
- Core checks pass:

```bash
npm run typecheck -w @revflow/db
npm run typecheck -w @revflow/shared
npm run typecheck -w @revflow/api
npm run typecheck -w @revflow/web
npm run test -w @revflow/api
```

## Suggested Execution Order

1. Milestone 0
2. Milestone 1
3. Milestone 2
4. Milestone 3
5. Milestone 4
6. Milestone 5
7. Milestone 6
8. Milestone 7
9. Milestone 8
10. Milestone 9
