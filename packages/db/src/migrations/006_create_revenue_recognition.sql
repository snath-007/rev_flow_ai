create type revenue_recognition_method as enum ('immediate', 'straight_line', 'usage_based');
create type revenue_schedule_status as enum ('draft', 'generated', 'posted', 'void');
create type journal_entry_status as enum ('draft', 'posted', 'void');

create table performance_obligations (
  id uuid primary key default gen_random_uuid(),
  contract_line_item_id uuid not null references contract_line_items (id) on delete restrict,
  name text not null,
  recognition_method revenue_recognition_method not null,
  service_start_date date,
  service_end_date date,
  allocation_amount numeric(14, 4) not null default 0,
  currency char(3) not null default 'USD',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint performance_obligations_valid_service_period check (
    service_start_date is null
    or service_end_date is null
    or service_end_date >= service_start_date
  ),
  constraint performance_obligations_allocation_non_negative check (allocation_amount >= 0)
);

create index performance_obligations_contract_line_item_id_idx
  on performance_obligations (contract_line_item_id);

create index performance_obligations_recognition_method_idx
  on performance_obligations (recognition_method);

create table revenue_schedules (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices (id) on delete restrict,
  invoice_line_item_id uuid not null references invoice_line_items (id) on delete restrict,
  performance_obligation_id uuid references performance_obligations (id) on delete restrict,
  recognition_method revenue_recognition_method not null,
  status revenue_schedule_status not null default 'generated',
  period_start date not null,
  period_end date not null,
  recognition_date date not null,
  recognized_amount numeric(14, 4) not null,
  deferred_amount numeric(14, 4) not null default 0,
  currency char(3) not null default 'USD',
  calculation_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint revenue_schedules_valid_period check (period_end >= period_start),
  constraint revenue_schedules_recognized_amount_non_negative check (recognized_amount >= 0),
  constraint revenue_schedules_deferred_amount_non_negative check (deferred_amount >= 0)
);

create index revenue_schedules_invoice_id_idx
  on revenue_schedules (invoice_id);

create index revenue_schedules_invoice_line_item_id_idx
  on revenue_schedules (invoice_line_item_id);

create index revenue_schedules_performance_obligation_id_idx
  on revenue_schedules (performance_obligation_id);

create index revenue_schedules_status_idx
  on revenue_schedules (status);

create index revenue_schedules_recognition_date_idx
  on revenue_schedules (recognition_date);

create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  revenue_schedule_id uuid not null references revenue_schedules (id) on delete restrict,
  invoice_id uuid not null references invoices (id) on delete restrict,
  status journal_entry_status not null default 'draft',
  entry_date date not null,
  debit_account text not null,
  credit_account text not null,
  amount numeric(14, 4) not null,
  currency char(3) not null default 'USD',
  memo text,
  metadata jsonb not null default '{}'::jsonb,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint journal_entries_amount_non_negative check (amount >= 0),
  constraint journal_entries_posted_at_matches_status check (
    (status = 'posted' and posted_at is not null)
    or (status <> 'posted')
  )
);

create index journal_entries_revenue_schedule_id_idx
  on journal_entries (revenue_schedule_id);

create index journal_entries_invoice_id_idx
  on journal_entries (invoice_id);

create index journal_entries_status_idx
  on journal_entries (status);

create index journal_entries_entry_date_idx
  on journal_entries (entry_date);