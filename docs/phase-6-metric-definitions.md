# Phase 6 Deterministic Metric Definitions

Status: accepted for Milestones 8-9  
Date: 2026-06-24

## Principles

- PostgreSQL records and deterministic read models are the source of every displayed value.
- Metrics are scoped by workspace and grouped by currency. RevFlow performs no foreign-exchange conversion in the POC.
- Reports expose an as-of date, data scope, formula summary, and drill-down records.
- Generated or forecast values are labeled differently from posted or realized values.
- Unsupported source data produces unavailable, not zero.
- Monetary calculations use database numeric values and the existing money-rounding rules, not binary floating-point aggregation in the browser.

## Required Data Changes

The existing schema cannot credibly calculate AR aging or DSO because invoices have no issued_at or due_at timestamps and there are no additive payment applications.

Milestone 8 payment and reconciliation must introduce or confirm:

- Invoice issued_at and due_at
- Payment and payment-application records
- Payment effective date and reversal status
- Additive application amounts by invoice and currency
- Explicit payment-state derivation

For that reason, payment/reconciliation executes before tenant-aware reporting.

## MRR

Name: Committed Monthly Recurring Revenue

As-of population:

- Active contracts where start_date is on or before the as-of date
- Contract end_date is null or on or after the as-of date
- Current effective contract version as of the date
- Active plan and price-rule configuration referenced by each line item
- Flat recurring charges only in the current schema

Normalization:

| Billing interval | Monthly value |
| --- | --- |
| monthly | committed charge |
| quarterly, if later supported | committed charge divided by 3 |
| annual | committed charge divided by 12 |

Formula by currency:

    MRR = sum(normalized committed recurring charge)

Current flat price rules use unit_price as the committed charge for the plan billing interval, after supported contract overrides.

Per-unit and tiered usage charges are excluded unless a future explicit minimum-commitment field exists. Historical usage, invoice totals, and forecasts are not substituted for committed revenue. One-time charges are excluded.

Required breakdowns:

- Workspace and currency
- Customer
- Contract
- Product or plan
- Included versus excluded line items with reason

## ARR

Name: Committed Annual Recurring Revenue

For the POC:

    ARR = MRR * 12

ARR uses the same as-of population, exclusions, currency grouping, and snapshots as MRR. It is not the sum of the next twelve months of forecast usage.

The UI must label this as annualized committed recurring revenue.

## Scheduled Revenue Waterfall

The default Phase 6 report is a scheduled revenue waterfall because current schedules can be generated without being posted.

Population:

- Revenue schedules owned by the workspace
- Status generated or posted
- Status draft and void excluded
- Grouped by recognition month and currency

Per period:

    opening deferred
    + schedule additions
    - scheduled recognized revenue
    = closing deferred

Definitions:

- Opening deferred: closing deferred from the preceding period.
- Schedule additions: original allocated amount for invoice line schedules whose first recognition date falls in the period.
- Scheduled recognized revenue: sum of recognized_amount whose recognition_date falls in the period.
- Closing deferred: opening deferred plus additions minus scheduled recognized revenue.

The original allocated amount comes from the persisted calculation snapshot and must reconcile to the sum of schedule allocations. If a snapshot is incomplete or inconsistent, the affected schedule is marked as a report exception.

The report separates generated and posted amounts. It does not label generated schedules as accounting actuals.

Drill-down reaches revenue schedule, invoice line, invoice, contract, and customer.

## AR Aging

Name: Accounts Receivable Aging

Population as of a selected date:

- Issued invoices owned by the workspace
- Exclude draft, approved-but-not-issued, void, and credited invoices
- Paid invoices remain available for history but have zero outstanding balance when applications fully offset them
- Group by currency

Outstanding amount:

    outstanding = invoice total
                  - sum(active payment applications effective on or before as-of date)

Outstanding is never silently clamped. Negative balances are reported as credits or overpayments, not included as positive receivables.

Age:

    days past due = as-of date - due_at date

Buckets:

| Bucket | Rule |
| --- | --- |
| Current | due date is after the as-of date |
| 1-30 | 1 through 30 days past due |
| 31-60 | 31 through 60 days past due |
| 61-90 | 61 through 90 days past due |
| 90+ | More than 90 days past due |

Invoices missing due_at are report exceptions and excluded from aging totals until corrected. created_at is not used as a substitute.

## POC DSO

Name: POC Days Sales Outstanding

The default window is the 90 calendar days ending on the as-of date.

By currency:

    average AR = (opening AR + closing AR) / 2
    credit sales = sum(invoice totals issued during the window)
    DSO = average AR / credit sales * days in window

Opening and closing AR use the same outstanding-balance rules as AR aging at the start and end of the window.

If credit sales are zero, DSO is unavailable. It is not reported as zero.

Limitations displayed with the metric:

- Uses a two-point average rather than a daily average.
- Treats all issued POC invoices as credit sales.
- Excludes tax, credit-note allocation, write-offs, and FX conversion until those records exist.
- Depends on complete issued_at, due_at, payment effective dates, applications, and reversals.

## NRR

NRR remains stretch scope.

Future formula:

    NRR = (beginning recurring revenue
           + expansion
           - contraction
           - churn)
          / beginning recurring revenue

RevFlow does not yet persist trustworthy amendment, contraction, churn, and historical recurring-revenue snapshots. NRR must remain unavailable rather than inferred from invoice totals.

## API Read-Model Requirements

Planned endpoints:

- GET /reports/overview
- GET /reports/mrr
- GET /reports/revenue-waterfall
- GET /reports/ar-aging
- GET /reports/dso

Every endpoint requires reports.read and trusted workspace context.

Common response metadata:

- workspaceId
- asOf or period
- currency
- definitionVersion
- generatedAt
- dataCompleteness
- assumptions
- exceptions

Definition version starts at phase6-v1 so later formula changes are visible and test fixtures remain meaningful.

## Test Fixtures

Tests must cover:

- Monthly and annual flat commitments
- Exclusion of variable usage without a minimum
- Contract effective and end-date boundaries
- Currency separation
- Straight-line allocation and rounding reconciliation
- Generated versus posted schedule separation
- Partial, exact, and reversed payment applications
- Current and each overdue aging bucket
- Missing due date exception
- DSO with zero credit sales
- Cross-workspace exclusion
