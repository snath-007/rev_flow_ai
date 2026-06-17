# Phase 2 Demo Script

Use this walkthrough to demo the current RevFlow POC end to end.

## Setup

```bash
docker compose up -d
npm run db:migrate
npm run dev
```

Open:

- Web: `http://localhost:3000`
- API: `http://localhost:4000/health`

## Demo Flow

1. Create a customer from `/customers`.
2. Configure catalog data from `/catalog`:
   - product
   - meter
   - plan
   - price rule
3. Create a draft customer contract from `/contracts`.
4. Add a price rule as a contract line item.
5. Approve the contract.
6. Ingest usage from `/usage` against the active contract and configured meter.
7. Confirm the aggregate updates.
8. Generate a draft invoice from `/invoices` for the billing period.
9. Open invoice detail and explain the calculation snapshot.
10. Approve the draft invoice.

## What To Explain

- Catalog is reusable commercial configuration.
- Contracts are customer-specific approved terms.
- Usage is accepted only for active contracts with configured meters.
- Invoices are generated from approved terms plus usage aggregates.
- Audit logs are written for finance-impacting mutations.

## Current Limitations

- No authentication or tenant isolation yet.
- No amendments or contract renewals yet.
- Tiered pricing is stored but not fully calculated yet.
- Invoice issuing/payment is represented as future lifecycle work.
