# Invoicing Module

## Purpose

Generate explainable invoices from contracts, pricing rules, and usage aggregates.

## Current Implementation

Phase 3 refactored invoice generation to use the pricing engine and persisted usage aggregates.

Current behavior:

- Draft invoice generation validates the contract is active.
- Duplicate draft/approved/issued/paid invoices for the same contract and period are rejected.
- Billable contract line items are converted into pricing engine inputs.
- Metered lines prefer `usage_aggregates` for the invoice period.
- If no aggregate exists yet, invoice generation falls back to raw usage events for demo reliability.
- Flat lines do not require usage aggregates.
- Invoice line items store pricing and usage-source snapshots.

## Invoice Lifecycle

```txt
draft -> approved -> issued -> paid
      -> void
      -> credited
```

Currently implemented:

- `draft`
- `approved`

## Explainability Requirements

Each invoice line item can answer:

- Which contract line item created this charge?
- Which pricing rule was applied?
- Which pricing strategy was used?
- Which usage source was used: aggregate, raw-event fallback, or none?
- Which usage aggregate was used, when available?
- How was the amount calculated?

## Current Shortcuts

- Invoice issue/payment/void/credit flows are later phases.
- Taxes and manual adjustments are placeholders.
- Raw-event fallback remains until worker-backed aggregation is mandatory.
