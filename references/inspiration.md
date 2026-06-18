# Billing & Revenue Automation POC — Reference Guide

> **Purpose of this document:** This is a standing reference for a portfolio POC inspired by the
> "order-to-cash" / billing-and-revenue-automation category (Zenskar, Stripe Billing, Chargebee, Metronome,
> Orb, etc.). It exists so that **you** don't have to re-derive finance domain context every session, and so
> **AI coding agents (Claude Code, Codex)** working on this repo have a single grounded source of truth for
> terminology, scope, and architecture decisions — instead of guessing or hallucinating finance semantics.
>
> Treat this as a living document. As the POC evolves, update the sections that drift (especially "Current
> POC Scope" and "Data Model").

---

## 0. How to use this doc (for you and for AI agents)

- **If you're a human reading this before a work session:** skim Section 1 (problem), then jump to Section 6
  (current scope) to remember where you left off.
- **If you're an AI coding agent (Codex/Claude Code) given this file as context:** treat Sections 2, 4, 5, and
  9 as **authoritative domain constraints** — don't invent alternate billing semantics not described here.
  Section 11 has explicit "don't do this" guidance for code generation.
- This doc intentionally separates **business/domain knowledge** (stable, rarely changes) from **POC scope**
  (changes often — update Section 6 as you build).

---

## 1. The Business Problem, in Plain English

Traditional SaaS billing assumed one thing: a customer pays a flat fee every month or year. Tools like early
Stripe Billing, Chargebee, and Recurly were built around that assumption — a "plan" with a price, applied on a
schedule.

Modern B2B SaaS (and especially AI/infra companies) sell very differently:

- **Usage-based pricing** — pay per API call, per token, per GB, per seat-and-overage.
- **Hybrid pricing** — a flat platform fee _plus_ usage charges _plus_ one-time setup fees.
- **Custom enterprise contracts** — sales negotiates ramp-up discounts, minimum commitments, prepaid credit
  pools, multi-year terms with built-in price escalators, multi-entity / multi-currency billing.
- **Frequent contract amendments** — upsells, downgrades, add-ons mid-contract, which must be prorated
  correctly without breaking historical invoices or revenue schedules.

When companies try to force these deals into rigid subscription tooling, two teams suffer:

1. **Engineering** ends up hand-rolling custom billing logic, usage aggregation pipelines, and one-off
   scripts — billing becomes a permanent "side project" that never stabilizes.
2. **Finance** ends up doing manual reconciliation in spreadsheets: matching usage data to contracts, manually
   computing revenue recognition schedules for compliance (ASC 606 / IFRS 15), chasing late payments, and
   closing the books slowly because nothing is automated end-to-end.

**The product category this POC mirrors** (often called **"order-to-cash" or "quote-to-cash" automation**)
tries to solve this by building a system where:

- Contracts/pricing terms are the _source of truth_, modeled flexibly (not hard-coded plan tiers).
- Usage data flows in from anywhere and gets metered against those contract terms automatically.
- Invoices, revenue recognition schedules, and financial reports are generated automatically and stay
  consistent even when contracts change mid-cycle.
- Increasingly, **AI agents** sit on top to handle the judgment-heavy parts: extracting terms from a contract
  PDF, flagging anomalies, answering "why is this invoice $4,200" in plain English, drafting collections
  emails, etc.

This is the gap your POC should demonstrate you understand and can build a credible slice of.

---

## 2. Glossary — Finance & Billing Jargon for Developers

Grouped by theme. Skim once, then use as a lookup table. Terms marked **★** are ones you'll touch directly in
code (data model fields, business logic), not just business conversation.

### 2.1 Subscription & Growth Metrics (the "SaaS metrics" vocabulary)

| Term                                        | Meaning                                                                                                                                                                                              |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MRR** (Monthly Recurring Revenue)         | Predictable revenue normalized to a monthly figure. Usage-based revenue complicates this because it's not "recurring" in the classic sense — most tools estimate an "average" or exclude pure usage. |
| **ARR** (Annual Recurring Revenue)          | MRR × 12. The headline metric SaaS companies report.                                                                                                                                                 |
| **ACV** (Annual Contract Value)             | The annualized value of a single contract — used for deal-sizing, not total company revenue.                                                                                                         |
| **TCV** (Total Contract Value)              | Full value of a contract over its entire term (e.g., a 3-year deal's TCV = 3 × ACV, roughly).                                                                                                        |
| **ARPU** (Average Revenue Per User/Account) | Revenue ÷ number of customers.                                                                                                                                                                       |
| **Churn**                                   | Rate at which customers cancel or downgrade.                                                                                                                                                         |
| **NRR** (Net Revenue Retention)             | Revenue from existing customers this period vs. same customers last period, _including_ expansion and contraction. >100% means upsells outweigh churn.                                               |
| **GRR** (Gross Revenue Retention)           | Same as NRR but _excluding_ expansion — shows pure retention/churn, capped at 100%.                                                                                                                  |
| **DSO** (Days Sales Outstanding)            | Average number of days it takes to collect payment after invoicing. Lower is better; a core AR health metric.                                                                                        |

### 2.2 Revenue Recognition (the compliance-heavy part) ★

This is the area most developers have zero exposure to, but it's central to why this category of product
exists — billing ≠ revenue recognition, and conflating them is a common rookie mistake in a POC.

| Term                                     | Meaning                                                                                                                                                                                                                          |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ASC 606**                              | The US GAAP accounting standard (issued by FASB) governing **when and how to recognize revenue from contracts with customers**. The core idea: recognize revenue when you _deliver value_, not when you _invoice_ or _get paid_. |
| **IFRS 15**                              | The international equivalent of ASC 606 (issued by IASB) — functionally very similar 5-step model.                                                                                                                               |
| **The 5-Step Model (ASC 606 / IFRS 15)** | 1) Identify the contract 2) Identify performance obligations 3) Determine transaction price 4) Allocate price to obligations 5) Recognize revenue as each obligation is satisfied.                                               |
| **Performance Obligation**               | A distinct promise to deliver a good/service. A single contract can have multiple (e.g., "platform access" + "implementation services" = 2 obligations recognized differently).                                                  |
| **SSP** (Standalone Selling Price)       | The price you'd charge for a performance obligation if sold alone — used to allocate a bundled contract price fairly across obligations.                                                                                         |
| **Deferred Revenue**                     | Cash collected (or invoiced) for a service **not yet delivered**. A liability on the balance sheet until "earned."                                                                                                               |
| **Unbilled Revenue / Unbilled AR**       | Revenue **earned** (service delivered) but **not yet invoiced**. The opposite mismatch from deferred revenue.                                                                                                                    |
| **Revenue Waterfall**                    | A report showing how recognized revenue will flow over future periods given current contracts — used for forecasting.                                                                                                            |
| **Rev Rec Schedule**                     | The month-by-month (or day-by-day) breakdown of how much of a contract's value gets recognized as revenue over time.                                                                                                             |
| **Journal Entry**                        | A double-entry bookkeeping record (debit/credit) posted to the General Ledger — e.g., recognizing revenue creates a journal entry moving value from "deferred revenue" to "revenue."                                             |
| **GL** (General Ledger)                  | The system of record for all financial transactions (e.g., NetSuite, QuickBooks, SAP). Billing platforms _sync into_ a GL, they don't replace it.                                                                                |

### 2.3 Contract & Pricing Structures ★

| Term                     | Meaning                                                                                                                                                                                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Plan**                 | A reusable, templated pricing structure (e.g., "Pro Tier — $500/mo + $0.002/API call").                                                                                                                                                                                                                 |
| **Contract**             | A _customer-specific_ instantiation of commercial terms — may start from a Plan template but include custom overrides.                                                                                                                                                                                  |
| **Usage-Based Pricing**  | Charges driven by metered consumption (API calls, GB processed, seats active, compute-minutes).                                                                                                                                                                                                         |
| **Tiered Pricing**       | Price-per-unit changes at usage thresholds — e.g., first 10k calls at $0.01, next 90k at $0.008. Two sub-flavors: **graduated** (each tier's rate applies only to usage within that tier) vs. **volume/flat** (one rate applies retroactively to _all_ units based on which tier total usage lands in). |
| **Volume Discount**      | A discount that kicks in once a usage/spend threshold is crossed.                                                                                                                                                                                                                                       |
| **Minimum Commitment**   | A customer guarantees to pay at least $X regardless of actual usage (a usage "floor").                                                                                                                                                                                                                  |
| **Prepaid Credits**      | Customer pays upfront for a credit balance, drawn down as usage occurs.                                                                                                                                                                                                                                 |
| **Rollover Credits**     | Unused prepaid credits carried into the next billing period (vs. "use it or lose it").                                                                                                                                                                                                                  |
| **Ramp-Up Pricing**      | Price increases in steps over the contract term (common in multi-year enterprise deals to ease customers in).                                                                                                                                                                                           |
| **Overage**              | Usage beyond an included quota, billed at a (often higher) per-unit rate.                                                                                                                                                                                                                               |
| **Proration**            | Adjusting a charge for a partial period — e.g., a mid-month plan upgrade only bills for the remaining days.                                                                                                                                                                                             |
| **Multi-Entity Billing** | One company has multiple legal subsidiaries, each needing separate invoices/ledgers/currencies, but unified reporting.                                                                                                                                                                                  |
| **Contract Amendment**   | A mid-term change to a contract (upgrade, downgrade, add-on) — the hard part is handling this _without breaking_ historical invoices/revenue schedules already generated.                                                                                                                               |

### 2.4 Billing Operations ★

| Term                         | Meaning                                                                                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Invoice**                  | The bill sent to a customer — line items + totals + tax + due date.                                                                                                    |
| **Invoice Line Item**        | A single charge row on an invoice (e.g., "API usage overage — 12,000 calls @ $0.01").                                                                                  |
| **Dunning**                  | The automated process of chasing overdue payments (reminder emails, retry logic, eventual suspension).                                                                 |
| **AR** (Accounts Receivable) | Money owed _to_ you by customers.                                                                                                                                      |
| **AP** (Accounts Payable)    | Money you owe _to others_ (less relevant to a billing POC, but you'll see the term).                                                                                   |
| **Collections**              | The broader process of getting customers to actually pay outstanding invoices.                                                                                         |
| **Reconciliation**           | Matching payments received against invoices issued, flagging mismatches.                                                                                               |
| **Order-to-Cash (O2C)**      | The end-to-end process from "deal signed" → contract setup → billing → revenue recognition → collection → reporting. This is the umbrella term for the whole category. |
| **Quote-to-Cash (Q2C)**      | Same idea but starting one step earlier, from the sales quote.                                                                                                         |
| **Zero-Touch Finance**       | The aspirational end-state marketing term (used by Zenskar and peers) — finance ops run without manual intervention; humans only review exceptions.                    |

### 2.5 Org & Process Terms

| Term                                   | Meaning                                                                                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RevOps** (Revenue Operations)        | The team/function owning the systems and process connecting Sales, Finance, and Customer Success around revenue.                                                                      |
| **PLG** (Product-Led Growth)           | Self-serve signup/upgrade flows where the _product_ (not a salesperson) drives expansion — relevant because billing needs self-serve APIs, not just sales-assisted contract creation. |
| **ERP** (Enterprise Resource Planning) | The system of record for company-wide finances (NetSuite, SAP, Oracle). Billing platforms integrate _with_ an ERP, they don't replace the GL.                                         |

---

## 3. Functional System Breakdown

A complete platform in this category has these modules. For a POC, you will build a **thin, working
vertical slice** through most of these — not full depth in all of them.

```
┌──────────────────────────────────────────────────────────────────────┐
│                         ORDER-TO-CASH PLATFORM                        │
│                                                                        │
│  1. Contract & Pricing Management                                     │
│     - Plan templates, contract builder, customer-specific overrides   │
│                                                                        │
│  2. Usage Metering                                                     │
│     - Ingest events (API push / batch pull) → aggregate per metric    │
│                                                                        │
│  3. Billing / Invoicing Engine                                         │
│     - Apply contract terms + usage → compute charges → generate       │
│       invoice with line items                                         │
│                                                                        │
│  4. Revenue Recognition Engine                                         │
│     - Allocate contract value to performance obligations,             │
│       generate rev-rec schedules per ASC 606 / IFRS 15                │
│                                                                        │
│  5. AR / Collections                                                   │
│     - Track payment status, send reminders (dunning), reconcile       │
│                                                                        │
│  6. Reporting & Analytics                                              │
│     - MRR/ARR, churn, revenue waterfall, DSO dashboards                │
│                                                                        │
│  7. AI Agent Layer (cross-cutting)                                     │
│     - Contract extraction, anomaly detection, NL Q&A over financial   │
│       data, drafting collections emails                                │
│                                                                        │
│  8. Integration Layer                                                  │
│     - CRM (Hubspot/Salesforce) sync, ERP sync, payment gateway sync   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Model Sketch

This is a starting entity model — pragmatic for a POC, extensible toward the real thing. Field lists are
illustrative, not exhaustive.

```
Customer
 ├─ id, name, billing_address, currency, tax_id
 └─ has many → Contracts

Contract
 ├─ id, customer_id, start_date, end_date, status (draft/active/amended/terminated)
 ├─ billing_entity_id (for multi-entity support)
 └─ has many → ContractLineItems, has many → Amendments

ContractLineItem  (a "performance obligation" + pricing rule, combined for simplicity in POC)
 ├─ id, contract_id, product_id
 ├─ pricing_model: flat | tiered | usage | hybrid
 ├─ pricing_config: JSON (tier breakpoints, per-unit rate, minimum commitment, etc.)
 └─ billing_cadence: monthly | quarterly | annual | usage-triggered

Product / Metric
 ├─ id, name, unit_of_measure (e.g., "API call", "GB", "seat")
 └─ used by → ContractLineItems

UsageEvent
 ├─ id, customer_id, metric_id, quantity, timestamp, idempotency_key
 └─ raw ingestion record — never mutated, only aggregated from

UsageAggregate  (derived, computed per billing period)
 ├─ contract_line_item_id, period_start, period_end, total_quantity

Invoice
 ├─ id, customer_id, contract_id, period_start, period_end, status (draft/sent/paid/overdue)
 ├─ subtotal, tax, total, currency
 └─ has many → InvoiceLineItems

InvoiceLineItem
 ├─ invoice_id, contract_line_item_id, description, quantity, unit_price, amount

RevenueSchedule  (rev-rec output)
 ├─ contract_line_item_id, period, recognized_amount, deferred_balance, status

JournalEntry  (optional — only if you simulate GL sync)
 ├─ date, account, debit, credit, reference (invoice_id / revenue_schedule_id)

Payment
 ├─ id, invoice_id, amount, received_date, method, status
```

**Key relational subtlety to get right (this is the part that separates a toy from a credible POC):**
`Invoice` (cash timing) and `RevenueSchedule` (recognition timing) are **separate tables driven by the same
contract** — they will frequently disagree on _when_ money "counts." This separation is the single most
important modeling decision in the whole domain.

---

## 5. Core Workflows

### 5.1 Contract → Cash (the main end-to-end flow)

1. **Contract creation** — from a template or custom-built; defines pricing rules per line item.
2. **Usage ingestion** (if usage-based lines exist) — events pushed via API or pulled from a data source,
   stored idempotently, then aggregated per billing period.
3. **Billing run** — at period end (or on a usage trigger), the engine reads the contract's pricing rules +
   aggregated usage → computes line item amounts → generates a draft invoice.
4. **Invoice review/send** — draft can be auto-approved or held for manual review (exceptions), then sent.
5. **Revenue recognition run** — independently of invoicing, allocate the contract's transaction price across
   performance obligations and recognize revenue for the period as obligations are satisfied.
6. **Payment & reconciliation** — payment received, matched against the invoice, AR balance updated; if
   overdue, dunning sequence kicks in.
7. **Reporting** — metrics (MRR, ARR, waterfall, DSO) computed from the above as derived views.

### 5.2 Contract Amendment (the "hard mode" workflow)

1. Customer upgrades/downgrades mid-contract.
2. System must **prorate** the change for the partial period, **without rewriting** already-issued invoices
   or already-recognized revenue.
3. A new effective-dated version of the contract line item takes over going forward; historical records stay
   immutable. (This append-only, effective-dated pattern is the standard way these systems avoid corrupting
   historical financial records — worth designing in from day one even in a POC.)

---

## 6. Current POC Scope

> **Update this section as you build — this is the part of the doc that should never go stale.**

Suggested phasing (adjust to your actual plan):

**Phase 1 — Core billing slice**

- Customer + Contract + simple flat & tiered pricing (no usage yet)
- Manual invoice generation endpoint
- Basic invoice PDF/HTML rendering

**Phase 2 — Usage metering**

- Usage event ingestion API (idempotent)
- Aggregation job (Celery beat / scheduled Lambda)
- Usage-based + hybrid pricing on invoices

**Phase 3 — Revenue recognition**

- Performance obligation modeling
- Straight-line revenue recognition schedule generation
- Deferred vs. unbilled revenue reporting

**Phase 4 — AI agent layer**

- Contract term extraction agent (LangGraph/DSPy, given a PDF/DOCX contract → structured pricing config)
- Anomaly-detection agent on invoices ("this invoice is 3x the customer's historical average — flag")
- NL Q&A agent over billing data ("why did Customer X's bill jump in March?")

**Phase 5 (stretch) — Reporting & ops**

- MRR/ARR/NRR dashboards
- Dunning sequence simulation
- ERP/CRM sync stub (mock integration)

---

## 7. Mapping to Your Existing Stack

| Component                                                                     | Suggested mapping to your stack                                                                                                                |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| API layer                                                                     | **FastAPI** — REST endpoints for contracts, usage ingestion, invoices                                                                          |
| Async/background jobs                                                         | **Celery + Redis** — billing runs, usage aggregation, dunning sequences                                                                        |
| Orchestration for AI agents                                                   | **LangGraph** — contract extraction pipeline, anomaly review, multi-step Q&A                                                                   |
| Structured LLM tasks                                                          | **DSPy** — signatures for contract clause extraction, pricing config generation, ambiguity detection (you already have this pattern from Ally) |
| Relational data (contracts, invoices, line items)                             | **RDS (Postgres/MySQL)** — this domain is inherently relational (foreign keys, joins, financial integrity)                                     |
| Document/event storage                                                        | **MongoDB / S3** — raw usage event logs, generated invoice documents, contract source files                                                    |
| Compute for sandboxed agent tasks (e.g. generating a DOCX invoice via script) | **ECS Fargate** ephemeral tasks — same pattern you used for the HCP Agreement Generator                                                        |
| Frontend / dashboards                                                         | **React/Next.js** — billing dashboard, exception review UI                                                                                     |
| Document generation                                                           | **python-docx / WeasyPrint** for invoice or contract documents, consistent with your DOCX automation experience                                |

This mapping is deliberately close to your ProcLeg stack — the POC should read as a natural extension of work
you've already shipped, not a from-scratch unrelated project.

---

## 8. Where AI Agents Add Real Value (vs. where they're decorative)

Be selective — bolting an LLM onto every step makes a POC look unfocused. Prioritize agents where judgment
or unstructured-input parsing is genuinely required:

| High-value agent use case                                           | Why it's a good fit                                                                                          |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Contract term extraction** (PDF/DOCX → structured pricing config) | Genuinely hard to do with rules alone; contracts are unstructured language. Mirrors Zenskar's "Contract AI." |
| **Invoice anomaly detection**                                       | Requires contextual judgment ("is this normal for this customer"), not just a static threshold.              |
| **NL querying over billing/revenue data**                           | High perceived value, demoable, and plays to LangGraph/DSPy strengths you already have.                      |
| **Dunning email drafting with tone control**                        | Genuine language generation task with real stakes (don't want to sound robotic or threatening).              |
| **Ambiguity/exception flagging before auto-billing**                | You've already built this pattern (pre/post retrieval gates in Ally) — directly reusable.                    |

| Low-value / decorative agent use case         | Why to avoid in a POC                                                                                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Using an LLM to _compute_ tiered pricing math | Deterministic math should be deterministic code — using an LLM here is slower, costlier, and less trustworthy. Reviewers will notice this as a red flag, not a strength. |
| LLM-generated journal entries                 | These need to be exact and auditable — keep this rule-based.                                                                                                             |

---

## 9. Competitive & Inspirational Landscape

### Commercial platforms (what you're conceptually mirroring)

- **Zenskar** — zenskar.com — AI-native order-to-cash, the direct inspiration for this POC.
- **Stripe Billing** — stripe.com/billing — the most widely used baseline; good for understanding "standard" subscription billing primitives.
- **Chargebee** — chargebee.com — subscription management incumbent.
- **Metronome** — metronome.com — usage-based billing specialist, strong in AI/infra customer base.
- **Orb** — withorb.com — usage-based billing, developer-first positioning.
- **m3ter** — m3ter.com — usage metering and pricing engine.
- **Subskribe** — subskribe.com — quote-to-cash for complex B2B contracts.
- **Maxio** (formerly Chargify/SaaSOptics) — maxio.com — billing + financial operations for B2B SaaS.

### Open-source / self-hostable (useful as architecture references or even building blocks for your POC)

- **Lago** — github.com/getlago/lago — open-source usage-based billing engine, "Stripe-like" developer
  experience; good reference for API design and data model even if you don't adopt it directly.
- **Kill Bill** — killbill.io / github.com/killbill/killbill — mature, plugin-based Java billing platform;
  useful for understanding enterprise-grade billing architecture patterns (less relevant to copy code from,
  given your Python stack, but valuable for concepts).
- **OpenMeter** — openmeter.io — open-source usage metering specifically (the "metering" slice rather than
  full billing).
- **Meteroid** — meteroid.com — newer open-source billing/metering engine, good for seeing current design
  thinking in the space.

### Standards references

- **FASB ASC 606** — fasb.org (search "Revenue from Contracts with Customers") — the authoritative US GAAP
  standard.
- **IFRS 15** — ifrs.org — the international equivalent.

---

## 10. Resources & Links

**Product/docs (to study UX and data model conventions):**

- Zenskar docs — https://docs.zenskar.com
- Stripe Billing docs — https://stripe.com/docs/billing
- Stripe's usage-based billing guide — https://stripe.com/docs/billing/subscriptions/usage-based
- Chargebee docs — https://www.chargebee.com/docs/2.0/

**Open-source code to read (architecture inspiration, not necessarily to fork):**

- Lago backend — https://github.com/getlago/lago
- Kill Bill — https://github.com/killbill/killbill
- OpenMeter — https://github.com/openmeterio/openmeter

**Accounting standard primers (written for non-accountants):**

- Search "ASC 606 five-step model explained" — multiple Big 4 accounting firm explainer PDFs (Deloitte, PwC,
  KPMG all publish free plain-language ASC 606 guides) tend to be the clearest non-developer-hostile sources.

**Your own prior work to reuse conceptually:**

- The pre/post-retrieval gate pattern from Ally → reuse for "exception flagging before auto-billing."
- The LangGraph state machine + ephemeral ECS Fargate sandboxing pattern from the HCP Agreement Generator →
  reuse for sandboxed invoice/document generation.
- The DynamoDB + S3 nested file-reference pattern → reuse for storing generated invoices/contracts.

---

## 11. Guidance Notes for AI Coding Agents (Codex / Claude Code)

Paste or reference this section directly when prompting Codex/Claude Code on this repo, so generated code
stays consistent with the domain model above.

**Do:**

- Treat `Invoice` (cash/billing timing) and `RevenueSchedule` (recognition timing) as separate concerns fed
  by the same `Contract` — never collapse them into one table or one computation path.
- Model pricing rules as data (JSON config on `ContractLineItem`), not as hard-coded `if/elif` chains per
  pricing type — new pricing models should be addable without touching billing-engine code.
- Make `UsageEvent` records immutable and idempotent (use an idempotency key) — usage ingestion will be
  retried and must not double-count.
- Make contract amendments **effective-dated and additive** — never mutate or delete historical contract line
  items; supersede them with a new version that has a `valid_from` date.
- Keep deterministic financial math (tier calculations, proration, tax) in plain code — not LLM calls.
- Reserve LLM/agent calls for: unstructured input parsing (contract PDFs), judgment calls (anomaly flags),
  and natural-language interfaces (Q&A, drafting).

**Don't:**

- Don't conflate "invoiced" with "revenue recognized" anywhere in code or naming — this is the most common
  and most credibility-damaging mistake in a billing POC.
- Don't hard-code currency or tax assumptions — even a POC should carry a `currency` field through, since
  multi-currency is a recurring theme in this domain.
- Don't generate journal entries or tax calculations via LLM — these need to be deterministic and auditable.
- Don't skip the `UsageAggregate` step and bill directly off raw `UsageEvent` rows — aggregation should be a
  distinct, re-runnable step (useful for backfills/corrections).

---

## 12. Quick-Reference Glossary (alphabetical, all terms in one place)

| Term                   | One-line definition                                |
| ---------------------- | -------------------------------------------------- |
| ACV                    | Annual Contract Value                              |
| AR                     | Accounts Receivable                                |
| ARPU                   | Average Revenue Per User                           |
| ARR                    | Annual Recurring Revenue                           |
| ASC 606                | US GAAP revenue recognition standard               |
| Deferred Revenue       | Cash received for undelivered service (liability)  |
| Dunning                | Automated overdue-payment chasing                  |
| DSO                    | Days Sales Outstanding                             |
| GL                     | General Ledger                                     |
| GRR                    | Gross Revenue Retention                            |
| IFRS 15                | International revenue recognition standard         |
| MRR                    | Monthly Recurring Revenue                          |
| NRR                    | Net Revenue Retention                              |
| O2C                    | Order-to-Cash                                      |
| Performance Obligation | A distinct promise to deliver within a contract    |
| Proration              | Partial-period billing adjustment                  |
| Q2C                    | Quote-to-Cash                                      |
| Ramp-Up Pricing        | Price that increases in steps over a contract term |
| Reconciliation         | Matching payments to invoices                      |
| Rev Rec                | Revenue Recognition                                |
| RevOps                 | Revenue Operations                                 |
| SSP                    | Standalone Selling Price                           |
| TCV                    | Total Contract Value                               |
| Unbilled Revenue       | Revenue earned but not yet invoiced                |
| Zero-Touch Finance     | Marketing term for fully automated finance ops     |

---

_Last updated: June 2026. Update Section 6 ("Current POC Scope") as the project progresses — everything else
should stay relatively stable as domain reference material._
