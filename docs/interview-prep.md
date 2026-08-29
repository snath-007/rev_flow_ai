# Interview Prep Notes

## Core Story

RevFlow is a full-stack revenue automation POC for complex SaaS billing.

The key story:

> I built a system that converts messy contract terms into approved billing configuration, ingests usage events, calculates invoices, and generates revenue schedules with auditability.

## HLD Talking Points

- Why separate web, API, worker, database, and queue?
- Why use asynchronous workers for usage aggregation and invoice generation?
- Where is strong consistency needed?
- Where is eventual consistency acceptable?
- How does idempotency prevent double billing?
- How would the system scale with high usage volume?
- How would failed jobs be retried and inspected?
- How would auditability work in a finance system?

## LLD Talking Points

- Pricing engine strategy pattern
- Invoice lifecycle state machine
- Contract versioning and amendments
- Usage aggregation by meter and billing period
- Revenue schedule generation
- Validation at API and domain layers
- Error modeling and explainability

## DSA/Fundamentals Practice Areas

- Tiered pricing calculation
- Volume pricing calculation
- Interval overlap for billing periods
- Deduplication with idempotency keys
- Batch aggregation
- State transition validation
- Queue retry and exponential backoff reasoning
- SQL indexing and query planning

## Product Engineering Talking Points

- AI output requires human approval before activation.
- Finance users need explainability, not just automation.
- Invoice preview reduces operational risk.
- Audit logs are a product feature, not only backend plumbing.
- Complex configuration UIs should guide the user through safe choices.
- A confusing workflow and a slow query are both product bugs.

## Likely Interview Questions

### High-Level Design

- Design a usage-based billing system.
- Design an invoice generation pipeline.
- Design a revenue recognition scheduler.
- Design a contract ingestion system using AI.
- Design a scalable event metering service.

### Low-Level Design

- Implement a tiered pricing engine.
- Design an invoice state machine.
- Model contract amendments.
- Design idempotent usage ingestion.
- Design audit logging for financial changes.

### Full-Stack

- How would you build a pricing rule builder UI?
- How would you show AI confidence and review states?
- How would you debug a customer invoice mismatch?
- How would you make invoice generation explainable?

## Demo Script Draft

1. Create a customer.
2. Paste contract terms.
3. Run AI extraction.
4. Review and approve extracted billing terms.
5. Ingest sample usage events.
6. Show usage aggregates.
7. Generate draft invoice.
8. Inspect calculation details.
9. Approve and issue invoice.
10. Generate revenue schedule.
11. Show audit trail.

