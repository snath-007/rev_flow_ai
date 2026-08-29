# ADR 0003 - Hosted Demo Topology

Status: accepted  
Date: 2026-08-29

## Context

RevFlow contains a Next.js web app, an Express API, PostgreSQL access, an optional BullMQ worker and Redis, and Gemini API inference. The hosted proof of concept needs a low-cost, reproducible deployment without presenting free-tier infrastructure as a production SLA.

The implemented demo workflows can run synchronously through the API. The optional BullMQ consumer still requires a persistent worker runtime and is not compatible with a request-scoped function lifecycle.

## Decision

Use two Vercel projects from the same monorepo, with external managed services:

| Concern                         | Decision                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| Public site and web application | Vercel Next.js project rooted at `apps/web`                                                    |
| API                             | Vercel Express Function project rooted at `apps/api`                                           |
| Database                        | Neon PostgreSQL; pooled runtime connection and direct migration connection                     |
| Identity                        | Clerk production instance                                                                      |
| AI                              | Gemini through the provider-neutral API boundary; deterministic mock remains available offline |
| Worker and Redis                | Omit from the first hosted demo                                                                |
| Files                           | No object storage until upload or OCR enters scope                                             |

The API exports its Express application from `src/index.ts`; local development continues to use `src/server.ts`. The function duration is explicitly longer than the Gemini client timeout so provider failures can be returned by the application instead of being cut off by the platform first.

## Runtime Flow

- Browser requests public and authenticated pages from the Vercel web project.
- Next.js server routes call the separately deployed API URL.
- Authenticated API calls carry a Clerk session token to Express.
- Express verifies identity, resolves the RevFlow workspace and membership, then accesses Neon using its pooled connection.
- Gemini calls remain server-side and all extracted fields require human review before they can create draft records.
- Billing, revenue, payment, reporting, and export workflows use their synchronous paths for the hosted demo.
- The browser never receives database credentials, Clerk secrets, or AI provider secrets.

## Environment Profiles

Local development:

- Local or Neon PostgreSQL
- Gemini by default with deterministic mock available
- Clerk development keys or explicit local authentication mode
- Redis and worker available when required

Hosted demo:

- Separate Vercel web and API projects
- Neon PostgreSQL
- Clerk production keys
- Gemini with a bounded timeout and provider quota
- Worker and Redis omitted

Production-forward direction:

- Independent API and worker scaling when workload requires it
- Managed queue or Redis with durable retry and dead-letter behavior
- Database backups, restore testing, retention, alerting, and outbox patterns
- Object storage and OCR for document ingestion
- Real payment and ERP connectors

## Deployment Constraints

- Database migrations run as an explicit release task, never from a web request or application startup.
- Preview and production environments use separate database and identity resources.
- CORS permits only configured web origins.
- Health checks distinguish process liveness from database readiness.
- Seed commands refuse production unless a separate explicit safeguard is enabled.
- Secrets are configured independently in each Vercel project and never committed.
- The optional BullMQ worker is not deployed to Vercel Functions.
- Provider free tiers are replaceable cost choices, not domain architecture.

## Consequences

Benefits:

- Web and API deployments remain isolated while sharing one repository.
- Express and its route structure remain intact.
- The hosted demo avoids a third application host and omits idle worker costs.
- Runtime database access uses Neon's pooled endpoint.

Costs:

- Cross-origin authentication and CORS require coordinated URLs.
- Two Vercel projects require separate environment-variable management.
- Function execution limits constrain long-running AI requests and unsuitable background work.
- A future asynchronous worker still needs another runtime.

## Rejected Alternatives

- One Vercel project for both apps: weakens independent environment, domain, and deployment control.
- Deploy the BullMQ worker as a Vercel Function: request-scoped functions cannot act as a continuously running queue consumer.
- One large virtual machine: simpler initially, but weaker isolation, repeatability, and free-tier fit.
- Sanity as the backend: unsuitable for authoritative relational finance state.
- Convex beside Postgres: adds a second application backend without a demonstrated need.

## References

- [Vercel Express guide](https://vercel.com/docs/frameworks/backend/express)
- [Vercel monorepo projects](https://vercel.com/docs/monorepos)
- [Vercel function duration](https://vercel.com/docs/functions/configuring-functions/duration)
