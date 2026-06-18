create type job_run_status as enum ('running', 'succeeded', 'failed');

create table job_runs (
  id uuid primary key default gen_random_uuid(),
  queue_name text not null,
  job_name text not null,
  job_id text,
  status job_run_status not null,
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index job_runs_queue_status_created_idx on job_runs (queue_name, status, created_at desc);
create index job_runs_created_at_idx on job_runs (created_at desc);
create index job_runs_job_id_idx on job_runs (job_id);
