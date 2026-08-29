create type invoice_status as enum ('draft', 'approved', 'issued', 'paid', 'void', 'credited');

create table invoices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete restrict,
  contract_id uuid not null references contracts (id) on delete restrict,
  status invoice_status not null default 'draft',
  period_start date not null,
  period_end date not null,
  currency char(3) not null default 'USD',
  subtotal numeric(14, 4) not null default 0,
  total numeric(14, 4) not null default 0,
  calculation_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_valid_period check (period_end >= period_start),
  constraint invoices_subtotal_non_negative check (subtotal >= 0),
  constraint invoices_total_non_negative check (total >= 0)
);

create index invoices_customer_id_idx on invoices (customer_id);
create index invoices_contract_id_idx on invoices (contract_id);
create index invoices_status_idx on invoices (status);

create table invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices (id) on delete cascade,
  contract_line_item_id uuid references contract_line_items (id) on delete restrict,
  price_rule_id uuid not null references price_rules (id) on delete restrict,
  description text not null,
  quantity numeric(14, 4) not null,
  unit_price numeric(12, 4) not null,
  amount numeric(14, 4) not null,
  currency char(3) not null default 'USD',
  calculation_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint invoice_line_items_quantity_non_negative check (quantity >= 0),
  constraint invoice_line_items_unit_price_non_negative check (unit_price >= 0),
  constraint invoice_line_items_amount_non_negative check (amount >= 0)
);

create index invoice_line_items_invoice_id_idx on invoice_line_items (invoice_id);
