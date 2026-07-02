# Local Development

## Prerequisites

- Node.js 20+
- npm
- Docker Desktop or compatible Docker runtime
- Optional: Ollama for local real-model contract extraction

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
- AI review UI: `http://localhost:3000/ai`
- Revenue UI: `http://localhost:3000/revenue`
- Audit UI: `http://localhost:3000/audit`
- Ops UI: `http://localhost:3000/ops`
- API: `http://localhost:4000`
- API health: `http://localhost:4000/health`
- API DB health: `http://localhost:4000/health/db`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

## Notes

Run migrations after starting Postgres and before using database-backed API routes. Run the seed script when you want demo-ready customers, catalog records, contracts, usage events, and audit events.

Migration `009_add_workspace_scope.sql` makes all existing domain records workspace-owned. The demo seed is idempotent for its deterministic workspace. Production seeding is rejected unless `ALLOW_DEMO_SEED=true` is set explicitly.

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

Tenant isolation tests use a real PostgreSQL database and are opt-in so the normal unit suite stays deterministic:

```bash
RUN_DATABASE_TESTS=true npm run test -w @revflow/api -- customers.tenant.test.ts
```

## Authentication Profiles

### Deterministic Local Profile

The default root environment uses AUTH_MODE=local. This mode is rejected in production and resolves:

- User: local-user
- Organization: local-org
- Workspace: RevFlow Demo
- Role: workspace_admin

Migration 008 creates the matching workspace and membership. The web app does not require Clerk keys in this profile. Open http://localhost:3000/onboarding to inspect the resolved workspace.

### Clerk Development Profile

1. Create a Clerk application and enable Organizations.
2. Put these values in the root .env for the Express API:

    AUTH_MODE=clerk
    CLERK_PUBLISHABLE_KEY=pk_test_...
    CLERK_SECRET_KEY=sk_test_...

3. Create apps/web/.env.local from apps/web/.env.example and set:

    NEXT_PUBLIC_API_URL=http://localhost:4000
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
    CLERK_SECRET_KEY=sk_test_...
    NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
    NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

4. Restart both API and web processes.
5. Sign up or sign in, create/select a Clerk organization, and complete /onboarding.

Clerk verifies identity and active organization. RevFlow creates its own workspace and membership, then derives role capabilities from that persisted membership. Domain requests never trust a client-provided workspace or role.

The first member of a new organization becomes workspace_admin. A later organization admin is synchronized as workspace_admin; other organization members begin as finance_operator. Persisted RevFlow membership remains authoritative after onboarding.

## Authentication Endpoints

- GET /auth/context returns onboarding_required or the normalized actor/workspace context.
- POST /auth/onboard creates or reconnects the active organization workspace membership.
- All other domain API routes require a verified identity and active RevFlow membership.
- GET /health and GET /health/db remain public.

## AI Extraction Demo Notes

The default `AI_PROVIDER=mock` is deterministic, requires no credentials, and is the recommended repeatable demo path.

For local model inference:

```bash
ollama pull qwen2.5:3b
```

Set these values in the root `.env` and restart the API:

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b
OLLAMA_TIMEOUT_MS=120000
```

The API development script loads the root `.env`. Open `/ai`, paste contract text, inspect source snippets and confidence, explicitly accept/edit/reject every field, then approve or reject the extraction. Applying an approved extraction creates or matches a customer and creates a draft contract only; normal contract approval remains the activation gate.

Run `npm run db:migrate` before using this workflow because migration `007_create_ai_extraction_runs.sql` creates the extraction and review tables. Pointing `OLLAMA_BASE_URL` at another host sends the pasted contract text to that host.

## Revenue Recognition Demo Notes

After generating and approving an invoice, open `/revenue` and generate revenue schedules for the approved invoice.

The Phase 4 revenue flow creates:

- Performance obligations
- Revenue schedules
- Draft journal entries
- Audit events for schedule generation

Generation is synchronous in the POC. Run `npm run db:migrate` before using `/revenue`, because migration `006_create_revenue_recognition.sql` creates the revenue recognition tables.