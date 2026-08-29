create table usage_events (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  contract_id uuid not null references contracts (id) on delete restrict,
  meter_id uuid not null references meters (id) on delete restrict,
  quantity numeric(14, 4) not null,
  occurred_at timestamptz not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint usage_events_quantity_positive check (quantity > 0)
);

create index usage_events_contract_meter_occurred_idx on usage_events (contract_id, meter_id, occurred_at desc);
create index usage_events_occurred_at_idx on usage_events (occurred_at desc);
