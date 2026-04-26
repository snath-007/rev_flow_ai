# Invoicing Module Plan

## Purpose

Generate explainable invoices from contracts, pricing rules, and usage aggregates.

## Responsibilities

- Generate draft invoices
- Create invoice line items
- Store calculation metadata
- Support manual adjustments
- Enforce invoice lifecycle transitions
- Trigger audit logs

## Invoice Lifecycle

```txt
draft -> approved -> issued -> paid
      -> void
      -> credited
```

## Planned Entities

- `invoices`
- `invoice_line_items`
- `invoice_adjustments`
- `credit_notes`

## Explainability Requirements

Each invoice line item should be able to answer:

- Which contract line item created this charge?
- Which pricing rule was applied?
- Which usage aggregate was used?
- How was the amount calculated?
- Was any adjustment applied?

