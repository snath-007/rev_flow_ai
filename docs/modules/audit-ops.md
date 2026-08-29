# Audit And Ops Module Plan

## Purpose

Make the system explainable and debuggable for finance and engineering users.

## Responsibilities

- Track finance-impacting changes
- Track job runs
- Expose failed jobs and retry status
- Provide operational views for usage, invoices, and revenue schedules

## Audit Events

- Contract created
- Contract approved
- Contract amended
- AI extraction applied
- Price rule changed
- Invoice generated
- Invoice adjusted
- Invoice approved
- Invoice issued
- Revenue schedule generated

## Job Run Tracking

Track:

- Queue name
- Job type
- Status
- Attempts
- Error message
- Started at
- Completed at

## Open Questions

- Should audit logs store full before/after JSON or selected field changes?
- Should job retries be triggered manually from the UI?
- Should audit logs be append-only at the database level?

