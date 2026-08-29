create type integration_provider as enum ('mock_erp', 'mock_gl', 'csv', 'json');
create type integration_run_status as enum ('queued', 'running', 'succeeded', 'failed', 'skipped');
create type export_entity_type as enum ('customers', 'invoices', 'payments', 'journal_entries', 'revenue_schedules');

create table integration_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  provider integration_provider not null,
  export_type export_entity_type not null,
  status integration_run_status not null default 'queued',
  actor text not null default 'system',
  idempotency_key text not null,
  export_reference text,
  started_at timestamptz,
  completed_at timestamptz,
  error_summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_runs_completed_after_started check (
    started_at is null or completed_at is null or completed_at >= started_at
  )
);

create unique index integration_runs_workspace_id_unique
  on integration_runs (workspace_id, id);

create unique index integration_runs_workspace_idempotency_unique
  on integration_runs (workspace_id, provider, export_type, idempotency_key);

create index integration_runs_workspace_created_idx
  on integration_runs (workspace_id, created_at desc);

create index integration_runs_workspace_status_idx
  on integration_runs (workspace_id, status, created_at desc);

create index integration_runs_workspace_export_reference_idx
  on integration_runs (workspace_id, export_reference)
  where export_reference is not null;

create table integration_run_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  integration_run_id uuid not null,
  entity_type export_entity_type not null,
  entity_id uuid not null,
  status integration_run_status not null default 'queued',
  external_reference text,
  error_summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_run_items_run_fkey foreign key (workspace_id, integration_run_id)
    references integration_runs (workspace_id, id) on delete cascade
);

create unique index integration_run_items_workspace_entity_unique
  on integration_run_items (workspace_id, integration_run_id, entity_type, entity_id);

create index integration_run_items_workspace_entity_idx
  on integration_run_items (workspace_id, entity_type, entity_id);

create index integration_run_items_workspace_status_idx
  on integration_run_items (workspace_id, status, created_at desc);

create index integration_run_items_workspace_external_reference_idx
  on integration_run_items (workspace_id, external_reference)
  where external_reference is not null;

alter table journal_entries
  add column external_export_reference text;

alter table revenue_schedules
  add column external_export_reference text;

create index journal_entries_workspace_external_export_idx
  on journal_entries (workspace_id, external_export_reference)
  where external_export_reference is not null;

create index revenue_schedules_workspace_external_export_idx
  on revenue_schedules (workspace_id, external_export_reference)
  where external_export_reference is not null;
