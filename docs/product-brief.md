# Product Brief

## Product Summary

RevFlow is an AI-assisted revenue automation workbench for B2B SaaS companies with complex commercial contracts.

It helps finance and operations teams convert contract terms into billing configuration, ingest usage, generate invoices, and create simplified revenue recognition schedules.

## Problem

Modern SaaS pricing is increasingly flexible:

- Usage-based billing
- Seat-based pricing
- Hybrid subscription plus usage models
- Minimum commitments
- Prepaid credits
- Discounts, free units, and overages
- Bespoke enterprise contracts
- Mid-term amendments

Traditional billing tools often struggle with these models. In-house systems can be flexible, but they create engineering dependency and operational risk.

RevFlow explores the product and engineering challenge of turning messy revenue agreements into correct, auditable workflows.

## Target Users

- Finance operators who manage billing and revenue schedules
- RevOps teams who operationalize customer contracts
- Product teams experimenting with pricing models
- Engineers who integrate usage events and maintain platform reliability

## MVP User Journey

```txt
Paste contract terms
  -> AI extracts draft billing config
  -> Finance user reviews and approves
  -> Contract becomes active
  -> Usage events are ingested
  -> Worker aggregates usage
  -> Draft invoice is generated
  -> User reviews and issues invoice
  -> Revenue schedule is generated
  -> Audit trail explains all changes
```

## MVP Scope

### In Scope

- Customers
- Products, plans, meters, and price rules
- Contracts and contract versions
- AI contract extraction into draft config
- Human review and approval
- Usage event ingestion
- Usage aggregation
- Pricing engine
- Draft invoice generation
- Invoice approval and issue states
- ASC 606-lite revenue schedules
- Audit logs
- Operational job visibility

### Out Of Scope For MVP

- Real payment collection
- Real tax calculation
- Real ERP sync
- Multi-currency accounting
- Multi-tenant production isolation
- Full ASC 606 compliance
- Advanced permissions

## Product Principles

- The user should always know why an invoice amount exists.
- AI should assist, not silently activate financial configuration.
- Finance-impacting changes should be auditable.
- Complex configuration should feel controlled, not magical.
- The system should be credible enough for HLD and LLD interviews.

