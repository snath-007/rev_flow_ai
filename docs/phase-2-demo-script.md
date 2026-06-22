# Demo Script

Use this walkthrough to demo the current RevFlow POC end to end through Phase 5.

## Setup

```bash
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

Optional worker process in a second terminal:

```bash
npm run dev -w @revflow/worker
```

The default `AI_PROVIDER=mock` is deterministic and requires no credentials. For a local-model demo, install Ollama, run `ollama pull qwen2.5:3b`, set `AI_PROVIDER=ollama`, and restart the API.

Open:

- Web: `http://localhost:3000`
- API health: `http://localhost:4000/health`

## Demo Flow

1. Open `/ai` and paste representative contract text with customer, dates, billing, pricing, and revenue-recognition terms.
2. Create the extraction and show its provider, model, prompt version, confidence, ambiguities, missing fields, and source snippets.
3. Accept correct fields, edit an intentionally imperfect field, and reject any unsupported field.
4. Approve the reviewed extraction. Explain that every field requires an explicit human decision.
5. Apply the approved extraction and show that RevFlow matches or creates the customer and creates a draft contract only.
6. Open `/audit` and show extraction creation, completion, review, and apply events.
7. Open `/customers` and confirm the matched or newly created customer.
8. Open `/catalog` and review products, meters, plans, and price rules.
9. Open `/contracts`, inspect the AI-created draft, add a trusted price rule as a line item, and approve the contract through the normal workflow.
10. Ingest usage from `/usage` against an active contract and configured meter.
11. If the worker is running, confirm the aggregate updates automatically. Otherwise call `POST /usage/aggregates/run`.
12. Generate a draft invoice from `/invoices` for the billing period.
13. Open invoice detail and explain the calculation snapshot, pricing strategy, and aggregate/raw-event source.
14. Approve the draft invoice.
15. Open `/revenue` and generate revenue schedules for the approved invoice.
16. Explain the recognized/deferred schedule rows and generated journal entries.
17. Return to `/audit` for the complete finance-impacting mutation trail.
18. Open `/ops` and show recent usage aggregation jobs.

## What To Explain

- AI converts unstructured text into a reviewable draft; it does not calculate money or activate billing.
- Provider adapters are interchangeable: mock keeps demos repeatable, while Ollama provides local real-model inference.
- Structured output is schema-validated before persistence.
- Source evidence, ambiguities, prompt/provider metadata, failures, and reviewer decisions remain inspectable.
- Applying an approved extraction creates draft configuration; normal contract approval is still the activation gate.
- Catalog records are trusted reusable configuration and are not invented automatically by the model.
- Usage events are immutable and idempotent; aggregates are persisted and rerunnable.
- Pricing math is deterministic strategy code, not AI output.
- Revenue recognition is separate from billing and creates schedules plus journal entries.
- Audit logs capture AI and deterministic finance workflow actions.
- Ops views expose background usage aggregation job runs.

## Current Limitations

- No authentication, tenant isolation, or RBAC yet.
- Contract intake is pasted text; file upload, PDF parsing, and OCR are deferred.
- Small local models may report optimistic confidence, so review remains mandatory.
- Applying extraction does not create catalog or price-rule links.
- No conversational reviewer assistant, invoice anomaly review, finance Q&A, or dunning assistant yet.
- No amendments or contract renewals yet.
- Invoice issuing/payment is represented as future lifecycle work.
- Revenue recognition is ASC 606-lite only and not a compliance engine.
- Usage-based revenue recognition is deferred beyond the MVP; usage-priced lines currently recognize immediately.
- Revenue schedule generation remains synchronous for POC clarity.
