create type ai_extraction_source_type as enum ('text', 'document');
create type ai_extraction_status as enum (
  'created',
  'extracting',
  'extracted',
  'reviewing',
  'approved',
  'rejected',
  'applied',
  'failed'
);
create type ai_extraction_review_status as enum ('in_progress', 'approved', 'rejected');

create table ai_extraction_runs (
  id uuid primary key default gen_random_uuid(),
  source_type ai_extraction_source_type not null default 'text',
  source_name text,
  source_text text not null,
  status ai_extraction_status not null default 'created',
  provider text not null default 'mock',
  model text,
  prompt_version text not null,
  structured_output jsonb,
  confidence_summary jsonb,
  ambiguities jsonb not null default '[]'::jsonb,
  error_message text,
  reviewed_output jsonb,
  reviewed_by text,
  reviewed_at timestamptz,
  applied_contract_id uuid references contracts (id) on delete restrict,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_extraction_runs_source_text_not_blank check (length(trim(source_text)) > 0),
  constraint ai_extraction_runs_ambiguities_array check (jsonb_typeof(ambiguities) = 'array'),
  constraint ai_extraction_runs_applied_state check (
    status <> 'applied'
    or applied_at is not null
  )
);

create index ai_extraction_runs_status_idx
  on ai_extraction_runs (status, created_at desc);

create index ai_extraction_runs_provider_idx
  on ai_extraction_runs (provider, created_at desc);

create index ai_extraction_runs_applied_contract_id_idx
  on ai_extraction_runs (applied_contract_id)
  where applied_contract_id is not null;

create table ai_extraction_reviews (
  id uuid primary key default gen_random_uuid(),
  extraction_run_id uuid not null references ai_extraction_runs (id) on delete cascade,
  status ai_extraction_review_status not null default 'in_progress',
  reviewer text not null,
  field_decisions jsonb not null default '[]'::jsonb,
  reviewed_output jsonb not null default '{}'::jsonb,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_extraction_reviews_field_decisions_array check (jsonb_typeof(field_decisions) = 'array'),
  constraint ai_extraction_reviews_completed_state check (
    status = 'in_progress'
    or completed_at is not null
  )
);

create index ai_extraction_reviews_run_id_idx
  on ai_extraction_reviews (extraction_run_id, created_at desc);

create index ai_extraction_reviews_status_idx
  on ai_extraction_reviews (status, created_at desc);