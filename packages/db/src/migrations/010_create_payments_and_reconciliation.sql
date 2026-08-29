create type payment_status as enum ('received', 'void');
create type payment_allocation_status as enum ('unapplied', 'partial', 'applied', 'overpayment');

create table payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete restrict,
  customer_id uuid not null,
  invoice_id uuid,
  amount numeric(14, 4) not null,
  currency char(3) not null default 'USD',
  received_at date not null,
  reference text,
  status payment_status not null default 'received',
  allocation_status payment_allocation_status not null default 'unapplied',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_amount_positive check (amount > 0),
  constraint payments_workspace_customer_fkey foreign key (workspace_id, customer_id) references customers (workspace_id, id) on delete restrict,
  constraint payments_workspace_invoice_fkey foreign key (workspace_id, invoice_id) references invoices (workspace_id, id) on delete restrict
);

create unique index payments_workspace_id_unique on payments (workspace_id, id);

create table payment_allocations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete restrict,
  payment_id uuid not null,
  invoice_id uuid not null,
  amount numeric(14, 4) not null,
  currency char(3) not null default 'USD',
  created_at timestamptz not null default now(),
  constraint payment_allocations_amount_positive check (amount > 0),
  constraint payment_allocations_workspace_payment_fkey foreign key (workspace_id, payment_id) references payments (workspace_id, id) on delete cascade,
  constraint payment_allocations_workspace_invoice_fkey foreign key (workspace_id, invoice_id) references invoices (workspace_id, id) on delete restrict
);

create unique index payment_allocations_workspace_id_unique on payment_allocations (workspace_id, id);
create index payments_workspace_received_idx on payments (workspace_id, received_at desc);
create index payments_workspace_customer_idx on payments (workspace_id, customer_id, received_at desc);
create index payments_workspace_invoice_idx on payments (workspace_id, invoice_id);
create index payment_allocations_workspace_invoice_idx on payment_allocations (workspace_id, invoice_id);
create index payment_allocations_workspace_payment_idx on payment_allocations (workspace_id, payment_id);