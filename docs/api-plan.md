# API Plan

## API Principles

- Routes should be thin.
- Zod schemas should validate request and response shapes.
- Business logic belongs in domain services.
- Financial state transitions should use explicit commands.
- Mutations that affect billing should write audit logs.

## Endpoint Groups

### Contract Extraction

```txt
POST /contracts/extractions
GET  /contracts/extractions/:id
POST /contracts/extractions/:id/apply
```

### Contracts

```txt
GET  /contracts
POST /contracts
GET  /contracts/:id
POST /contracts/:id/approve
POST /contracts/:id/amend
```

### Catalog

```txt
GET  /catalog/products
POST /catalog/products
GET  /catalog/plans
POST /catalog/plans
GET  /catalog/price-rules
POST /catalog/price-rules
```

### Meters

```txt
GET  /meters
POST /meters
GET  /meters/:id
```

### Usage

```txt
POST /events
GET  /usage/events
GET  /usage/aggregates
```

### Invoices

```txt
POST /invoices/generate
GET  /invoices
GET  /invoices/:id
POST /invoices/:id/approve
POST /invoices/:id/issue
POST /invoices/:id/void
```

### Revenue Recognition

```txt
POST /revenue/schedules/generate
GET  /revenue/schedules
GET  /revenue/journal-entries
```

### Audit And Ops

```txt
GET /audit
GET /ops/jobs
GET /ops/jobs/:id
```

## Error Shape

Planned standard error response:

```ts
type ApiError = {
  code: string;
  message: string;
  details?: unknown;
  requestId: string;
};
```

## Validation Approach

- Shared Zod schemas live in `packages/shared`.
- API validates all inputs at route boundaries.
- Service layer validates domain invariants.
- Frontend reuses schemas where useful for forms.

## Open API Questions

- Should API responses use DTOs separate from DB rows?
- Should invoice generation be synchronous for demo data or always job-based?
- Should bulk usage ingestion accept arrays in MVP?
- Should audit log filtering be generic or entity-specific first?

