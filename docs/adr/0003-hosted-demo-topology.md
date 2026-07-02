# ADR 0003 - Hosted Demo Topology

Status: accepted  
Date: 2026-06-24

## Context

RevFlow contains a Next.js web app, a persistent Express API, PostgreSQL access, an optional BullMQ worker and Redis, and optional Ollama inference. These components do not share identical runtime requirements.

The hosted POC should remain inexpensive and reproducible without forcing every process into one vendor or presenting the design as production scale.

## Decision

Use a split-runtime hosted-demo topology:

| Concern | Decision |
| --- | --- |
| Public site and web application | Vercel-hosted Next.js |
| API | Container-capable Node host with an always-addressable HTTPS service |
| Database | Managed PostgreSQL |
| Identity | Clerk |
| Worker and Redis | Omit initially; enable only when a hosted asynchronous path is required |
| AI | Deterministic mock by default; bounded hosted adapter is optional |
| Files | No object storage until upload or OCR enters scope |

Vercel is selected for the Next.js surface, not as a requirement to convert the existing Express API and worker into functions. The exact container and managed-Postgres vendors are deployment configuration choices finalized in Milestone 11 after checking current free-tier limits.

## Runtime Flow

- Browser requests public and authenticated pages from Vercel.
- Authenticated API calls carry a Clerk session token to Express.
- Express verifies identity, resolves the RevFlow workspace and membership, then accesses managed PostgreSQL.
- Synchronous POC paths remain available for usage aggregation, invoice generation, and revenue generation.
- Redis and the worker are deployed only after a hosted queue use case is proven.
- The browser never receives database credentials, identity secrets, or AI provider secrets.

## Environment Profiles

Local development:

- Docker PostgreSQL and Redis
- Mock AI by default
- Optional local Ollama
- Clerk development keys
- Worker available

Hosted demo:

- Vercel web
- Container-hosted API
- Managed PostgreSQL
- Mock AI by default
- Worker and Redis optional
- Rate-limited seeded workspaces

Production-forward documentation:

- Independent API and worker scaling
- Managed queue or Redis
- Backups, restore testing, retention, alerting, and outbox patterns
- Object storage and OCR
- Real payment and ERP connectors

## Deployment Constraints

- Database migrations run as an explicit release task, never implicitly from a web request.
- Preview and production environments use separate databases and identity keys.
- CORS permits only configured web origins.
- Health checks distinguish process liveness from database readiness.
- Seed commands refuse production unless a separate explicit safeguard is enabled.
- Provider free tiers are treated as replaceable cost choices, not architecture.

## Consequences

Benefits:

- Each component runs in an environment suited to its lifecycle.
- The existing monorepo and Express boundary remain valid.
- The hosted POC can omit Redis and worker costs until needed.
- Vendor replacement remains practical.

Costs:

- Deployment spans more than one vendor.
- Cross-origin authentication and CORS require careful configuration.
- The API host may sleep or throttle on a free tier.

## Rejected Alternatives

- Vercel only: does not naturally match the current persistent API, worker, Redis, and local-model topology.
- One large virtual machine: simpler at first, but weaker isolation, repeatability, and free-tier fit.
- Sanity as the backend: unsuitable for authoritative relational finance state.
- Convex beside Postgres: adds a second application backend without a demonstrated need.

## References

- Vercel function limits: https://vercel.com/docs/functions/limitations
