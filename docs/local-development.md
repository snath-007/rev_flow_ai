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
npm run dev
```

## Services

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- API health: `http://localhost:4000/health`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

## Notes

Run migrations after starting Postgres and before using database-backed API routes.

The repo is currently in Phase 2. Core schema and DB health are being implemented; most domain endpoints are still planned.

## Database

Start local infrastructure:

```bash
docker compose up -d
```

Apply migrations:

```bash
npm run db:migrate
```

Check API database connectivity after starting the API:

```txt
http://localhost:4000/health/db
```

