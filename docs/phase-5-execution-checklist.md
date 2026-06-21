# Phase 5 Execution Checklist - AI Agent Layer

## Objective

Phase 5 adds AI-assisted finance workflows on top of the deterministic billing and revenue foundation built in Phases 1-4.

The goal is not to let AI calculate money or activate billing. The goal is to let AI convert messy commercial text into reviewable drafts, surface ambiguity, explain extracted terms, and assist operators while deterministic services remain the source of financial truth.

## Working Rules

- AI output must never activate billing automatically.
- AI must not calculate invoice totals, pricing amounts, journal entries, or revenue schedules.
- All AI output is draft, review, explanation, or recommendation.
- Human review is required before extracted terms become contract/catalog configuration.
- Store prompts, provider metadata, structured output, confidence, and errors for auditability.
- Start with a mocked provider so the workflow is deterministic in tests and demos.
- Add a real provider only behind a narrow provider interface and environment flag.
- Keep routes thin; services own workflow state; provider adapters own model calls.
- Do not send sensitive local files to an external AI provider unless explicitly configured.

## Phase 5 Scope

In scope:

- AI extraction run data model
- Mock AI provider interface
- Contract text paste/upload-lite workflow
- Structured extraction schema
- Confidence and ambiguity markers
- Human review UI
- Apply reviewed extraction to draft customer/contract/catalog configuration where safe
- Audit events for extraction creation, review, and apply actions
- Optional anomaly-review skeleton for invoices if extraction finishes cleanly

Out of scope:

- Fully autonomous contract activation
- Full PDF/OCR pipeline
- Multi-document contract reconciliation
- Fine-tuning
- Vector database or RAG over all finance data
- Real dunning send flow
- Production-grade prompt observability platform
- Replacing deterministic pricing/revenue engines

## Milestone 0 - Baseline Verification

Status: pending

Goal: confirm Phase 4 is healthy before adding AI workflow code.

Commands:

```bash
npm run typecheck -w @revflow/db
npm run typecheck -w @revflow/shared
npm run typecheck -w @revflow/api
npm run typecheck -w @revflow/web
npm run test -w @revflow/api
```

Acceptance criteria:

- All checks pass.
- Any pre-existing failure is documented before Phase 5 starts.

## Milestone 1 - AI Extraction Data Model

Status: pending

Goal: add persistence for AI-assisted extraction runs and reviewed outputs.

Likely files:

- `packages/db/src/migrations/007_create_ai_extraction_runs.sql`
- `packages/shared/src/schemas/ai.ts`
- `packages/shared/src/index.ts`

Entities:

- `ai_extraction_runs`
- optional `ai_extraction_reviews` if review state needs a separate history table

Suggested fields:

- `id`
- `source_type`
- `source_text`
- `status`
- `provider`
- `model`
- `prompt_version`
- `structured_output`
- `confidence_summary`
- `ambiguities`
- `error_message`
- `reviewed_output`
- `reviewed_at`
- `applied_at`
- timestamps

Acceptance criteria:

- Migration is additive and rollback-safe by convention.
- Shared schemas cover extraction run status and structured output.
- DB/shared typechecks pass.

## Milestone 2 - AI Provider Interface And Mock Provider

Status: pending

Goal: create a provider boundary before any real AI provider integration.

Likely files:

- `apps/api/src/modules/ai/ai.types.ts`
- `apps/api/src/modules/ai/providers/ai-provider.ts`
- `apps/api/src/modules/ai/providers/mock-ai-provider.ts`
- `apps/api/src/modules/ai/prompts/contract-extraction.ts`

Tasks:

- Define `extractContractTerms(input)` provider interface.
- Add deterministic mock response for seeded/demo contract text.
- Add provider selection through config/env.
- Keep provider output structured and schema-validated.

Acceptance criteria:

- Mock extraction is deterministic.
- No network/API key is required for tests.
- Provider tests pass.

## Milestone 3 - Contract Extraction Service

Status: pending

Goal: create extraction runs from pasted contract text and store model output.

Likely files:

- `apps/api/src/modules/ai/ai.repository.ts`
- `apps/api/src/modules/ai/ai.service.ts`
- `apps/api/src/modules/ai/ai.service.test.ts`

Tasks:

- Create extraction run with status lifecycle.
- Call mock provider.
- Validate structured output.
- Store output, confidence, and ambiguity markers.
- Handle provider errors without losing run history.
- Write audit event for extraction creation/completion.

Acceptance criteria:

- Extraction run can be created from pasted text.
- Failed extraction is persisted with error state.
- Service tests cover success and failure.

## Milestone 4 - AI Extraction API

Status: pending

Goal: expose extraction workflow through API routes.

Likely routes:

```txt
GET  /ai/extractions
POST /ai/extractions
GET  /ai/extractions/:id
POST /ai/extractions/:id/review
POST /ai/extractions/:id/apply
```

Tasks:

- Add routes and body validation.
- Return extraction details with source/output/review state.
- Standardize errors for missing runs and invalid state transitions.

Acceptance criteria:

- API routes remain thin.
- Service owns state rules.
- API typecheck passes.

## Milestone 5 - Human Review UI

Status: pending

Goal: add an operator-facing review screen for extracted contract terms.

Likely files:

- `apps/web/app/ai/page.tsx`
- `apps/web/app/ai/ai-forms.tsx`
- `apps/web/lib/api-client.ts`

UI surfaces:

- Paste contract text.
- Trigger extraction.
- List extraction runs.
- Inspect structured extracted fields.
- Show confidence and ambiguities.
- Edit reviewed output where practical.

Acceptance criteria:

- `/ai` page works with mock provider.
- Low-confidence/ambiguous fields are visible.
- UI does not imply AI output is already active billing config.

## Milestone 6 - Apply Reviewed Extraction To Draft Config

Status: pending

Goal: turn reviewed AI output into normal draft records through existing deterministic services.

Tasks:

- Define conservative apply behavior.
- Create or match customer where safe.
- Create draft contract where safe.
- Optionally create contract line item candidates, not active terms.
- Require existing catalog/price rule references unless explicit creation is supported.
- Write audit event for apply action.

Acceptance criteria:

- Apply action creates draft/reviewable state only.
- It does not approve contracts or activate billing.
- Existing contract approval flow remains the activation gate.

## Milestone 7 - Extraction Explainability And Audit

Status: pending

Goal: make AI output traceable and defensible.

Tasks:

- Show source snippets or rationale fields where available.
- Store prompt version/provider/model metadata.
- Add audit log entries for extraction created, reviewed, and applied.
- Add `/audit` visibility for AI extraction actions.
- Document what is mocked vs real.

Acceptance criteria:

- AI actions are visible in `/audit`.
- Operator can see why a field was extracted or flagged.
- Prompt/provider metadata is inspectable.

## Milestone 8 - Optional Real Provider Adapter

Status: pending

Goal: add a narrow real-provider path only after mock workflow is stable.

Tasks:

- Add real provider adapter behind env flag.
- Keep mock provider as default for local demo.
- Validate structured output before persistence.
- Document setup and safety caveats.

Acceptance criteria:

- App works without API keys.
- Real provider is opt-in.
- Provider failures are persisted and user-visible.

## Milestone 9 - Documentation And Demo Refresh

Status: pending

Goal: update docs so Phase 5 behavior is demoable and does not overclaim autonomy.

Files:

- `README.md`
- `docs/modules/ai-extraction.md`
- `docs/local-development.md`
- `docs/phase-2-demo-script.md`
- `docs/implementation-roadmap.md`

Tasks:

- Mark Phase 5 status accurately.
- Document mocked provider behavior.
- Document human review and activation gates.
- Update demo flow to include `/ai` extraction and apply-to-draft workflow.
- Note what remains for Phase 6 reporting/polish.

Acceptance criteria:

- Docs do not imply autonomous billing activation.
- Demo instructions work without external AI credentials.
- Remaining AI limitations are explicit.

## Final Phase 5 Acceptance

Phase 5 is complete when:

- AI extraction tables exist.
- Mock provider produces deterministic structured extraction output.
- Extraction runs are persisted and inspectable.
- Human review UI exists.
- Reviewed extraction can create draft/reviewable config without activating billing.
- AI actions are audited.
- Existing billing, pricing, invoicing, and revenue flows still pass checks.
- Real provider integration is either implemented behind an env flag or explicitly deferred.
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