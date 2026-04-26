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
npm run dev
```

## Services

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- API health: `http://localhost:4000/health`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

## Notes

The repo is currently scaffolded. Most domain endpoints are intentionally planned but not implemented yet.

