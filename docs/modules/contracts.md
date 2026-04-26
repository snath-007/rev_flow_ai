# Contracts Module Plan

## Purpose

Own customer-specific commercial agreements, contract versions, amendments, and approval workflow.

## Responsibilities

- Create draft contracts
- Store approved contract versions
- Support amendments
- Track contract status
- Connect contracts to customers, plans, price rules, and line items
- Trigger audit logs for finance-impacting changes

## Key Concepts

- A contract starts as a draft.
- AI extraction can produce a draft contract configuration.
- A contract becomes billable only after approval.
- Amendments should preserve historical billing context.

## Planned Entities

- `contracts`
- `contract_versions`
- `contract_line_items`
- `contract_amendments`

## Open Questions

- Should approval snapshot all resolved price rules into the contract version?
- Should amendments be effective immediately or always date-bound?
- Should contract versions be immutable once active?

