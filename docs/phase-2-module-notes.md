# Phase 2 Module Notes

## Customers

Represents billable accounts. Customers are the anchor for contracts and invoices.

API:

- `GET /customers`
- `POST /customers`
- `GET /customers/:id`

## Catalog

Represents reusable commercial configuration.

Modules:

- products
- meters
- plans
- price rules

API:

- `GET /catalog/products`
- `POST /catalog/products`
- `GET /catalog/meters`
- `POST /catalog/meters`
- `GET /catalog/plans`
- `POST /catalog/plans`
- `GET /catalog/price-rules`
- `POST /catalog/price-rules`

## Contracts

Represents customer-specific commercial terms. Draft contracts receive line items and then move to active through approval.

API:

- `GET /contracts`
- `POST /contracts`
- `GET /contracts/:id`
- `POST /contracts/:id/line-items`
- `POST /contracts/:id/approve`

## Usage

Represents raw metered activity. Ingestion enforces active contract status and validates that the meter exists on the approved contract.

API:

- `GET /usage/events`
- `POST /usage/events`
- `GET /usage/aggregates`

## Invoices

Represents draft billing output generated from approved contract line items and usage within a billing period.

API:

- `GET /invoices`
- `POST /invoices/generate`
- `GET /invoices/:id`
- `POST /invoices/:id/approve`

## Audit

Records finance-impacting mutations. Current events include customer/catalog creates, contract creation/approval, usage ingestion, and invoice generation/approval.
