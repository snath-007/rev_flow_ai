# Local Development

## Prerequisites

- Node.js 20+
- npm
- Docker Desktop or compatible Docker runtime

## Setup

```bash
npm install
cp .env.example .env
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

Run the worker in a separate terminal when testing background aggregation:

```bash
npm run dev -w @revflow/worker
```

## Services

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- API health: `http://localhost:4000/health`
- API DB health: `http://localhost:4000/health/db`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

## Notes

Run migrations after starting Postgres and before using database-backed API routes. Run the seed script when you want demo-ready customers, catalog records, contracts, usage events, and audit events.

Usage aggregation can happen through the worker or manually:

```txt
POST /usage/aggregates/run
```

Root scripts:

```bash
npm run db:migrate
npm run db:seed
npm run dev
npm run typecheck
npm run test
```

Package-level checks:

```bash
npm run typecheck -w @revflow/api
npm run test -w @revflow/api
npm run typecheck -w @revflow/web
npm run typecheck -w @revflow/shared
npm run typecheck -w @revflow/db
npm run typecheck -w @revflow/queues
npm run typecheck -w @revflow/worker
```
