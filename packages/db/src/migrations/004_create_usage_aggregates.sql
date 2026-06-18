create table usage_aggregates (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts (id) on delete restrict,
  meter_id uuid not null references meters (id) on delete restrict,
  period_start date not null,
  period_end date not null,
  event_count integer not null default 0,
  total_quantity numeric(14, 4) not null default 0,
  billable_quantity numeric(14, 4) not null default 0,
  first_occurred_at timestamptz,
  last_occurred_at timestamptz,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint usage_aggregates_valid_period check (period_end >= period_start),
  constraint usage_aggregates_event_count_non_negative check (event_count >= 0),
  constraint usage_aggregates_total_quantity_non_negative check (total_quantity >= 0),
  constraint usage_aggregates_billable_quantity_non_negative check (billable_quantity >= 0)
);

create unique index usage_aggregates_contract_meter_period_unique
  on usage_aggregates (contract_id, meter_id, period_start, period_end);

create index usage_aggregates_contract_period_idx
  on usage_aggregates (contract_id, period_start, period_end);

create index usage_aggregates_meter_period_idx
  on usage_aggregates (meter_id, period_start, period_end);

create index usage_aggregates_updated_at_idx
  on usage_aggregates (updated_at desc);
