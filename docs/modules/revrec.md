# Revenue Recognition Module

## Purpose

Generate ASC 606-lite revenue schedules and deterministic journal entries while keeping revenue recognition separate from invoice generation.

Invoices represent billing and cash timing. Revenue schedules represent when value is earned. Phase 4 implements that separation as a working POC slice.

## Implemented Responsibilities

- Create one performance obligation per invoice line item for the MVP
- Generate revenue schedules from approved invoice line items
- Split scheduled amounts into recognized and deferred revenue
- Generate one draft journal entry per revenue schedule
- Link schedules and journal entries back to source invoices
- Expose schedule and journal-entry lists through the API and `/revenue` UI
- Write audit events for revenue schedule generation

## Implemented Entities

- `performance_obligations`
- `revenue_schedules`
- `journal_entries`

## Recognition Methods

Implemented:

- Immediate recognition
- Straight-line monthly recognition

Deferred/hardened later:

- Full usage-based recognition
- Milestone-based recognition
- Advanced allocation and amendment behavior

For the Phase 4 MVP, flat invoice lines default to straight-line recognition and usage-priced lines default to immediate recognition. The pure engine still keeps `usage_based` explicit as a placeholder so the production path is visible without overclaiming scope.

## Journal Entries

Each generated schedule creates a deterministic draft journal entry:

- Debit: `deferred_revenue`
- Credit: `revenue`

Journal entries are simple, balanced POC records linked to source schedules and invoices. They are not posted to an external ERP or GL.

## API And UI

API routes:

```txt
GET  /revenue/schedules
POST /revenue/schedules/generate
GET  /revenue/journal-entries
```

UI:

- `/revenue` generates schedules for approved invoices
- `/revenue` lists schedules, recognized/deferred amounts, journal entries, and source invoice/customer context
- `/audit` shows revenue schedule generation events

## MVP Simplifications

- No full ASC 606 compliance claim
- No ERP or GL integration
- No complex contract combination rules
- No advanced standalone selling price allocation
- No contract amendments, proration, or revenue reallocation
- No FX accounting
- Schedule and journal-entry generation are synchronous for POC clarity