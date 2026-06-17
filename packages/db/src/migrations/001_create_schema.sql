create extension if not exists pgcrypto;

create type record_status as enum ('active', 'archived');
create type aggregation_type as enum ('sum', 'count');
create type billing_interval as enum ('monthly', 'annual');
create type pricing_model as enum ('flat', 'per_unit', 'tiered');
create type contract_status as enum ('draft', 'active');

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  billing_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index customers_email_unique on customers (lower(email));

create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index products_name_unique on products (lower(name));

create table meters (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  name text not null,
  event_name text not null,
  aggregation_type aggregation_type not null,
  unit text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index meters_product_event_unique on meters (product_id, event_name);

create table plans (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  name text not null,
  billing_interval billing_interval not null,
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index plans_product_name_interval_unique on plans (product_id, lower(name), billing_interval);

create table price_rules (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans (id) on delete cascade,
  meter_id uuid references meters (id) on delete restrict,
  pricing_model pricing_model not null,
  unit_price numeric(12, 4) not null default 0,
  currency char(3) not null default 'USD',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint price_rules_unit_price_non_negative check (unit_price >= 0)
);

create index price_rules_plan_id_idx on price_rules (plan_id);
create index price_rules_meter_id_idx on price_rules (meter_id);

create table contracts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete restrict,
  status contract_status not null default 'draft',
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contracts_valid_dates check (end_date is null or end_date >= start_date)
);

create index contracts_customer_id_idx on contracts (customer_id);
create index contracts_status_idx on contracts (status);

create table contract_versions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts (id) on delete cascade,
  version_number integer not null,
  effective_from date not null,
  effective_to date,
  terms_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint contract_versions_valid_dates check (effective_to is null or effective_to >= effective_from),
  constraint contract_versions_number_positive check (version_number > 0)
);

create unique index contract_versions_contract_version_unique on contract_versions (contract_id, version_number);

create table contract_line_items (
  id uuid primary key default gen_random_uuid(),
  contract_version_id uuid not null references contract_versions (id) on delete cascade,
  price_rule_id uuid not null references price_rules (id) on delete restrict,
  name text not null,
  override_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index contract_line_items_contract_version_id_idx on contract_line_items (contract_version_id);
create index contract_line_items_price_rule_id_idx on contract_line_items (price_rule_id);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  before_state jsonb,
  after_state jsonb,
  actor text not null default 'system',
  created_at timestamptz not null default now()
);

create index audit_logs_entity_idx on audit_logs (entity_type, entity_id, created_at desc);
create index audit_logs_created_at_idx on audit_logs (created_at desc);

