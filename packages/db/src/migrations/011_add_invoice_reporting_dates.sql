alter table invoices
  add column issued_at timestamptz,
  add column due_at timestamptz;

update invoices
set
  issued_at = coalesce(issued_at, updated_at, created_at),
  due_at = coalesce(due_at, updated_at, created_at) + interval '30 days'
where status in ('approved', 'issued', 'paid');

alter table invoices
  add constraint invoices_due_after_issue check (issued_at is null or due_at is null or due_at >= issued_at);

create index invoices_workspace_due_idx
  on invoices (workspace_id, due_at)
  where due_at is not null;

create index invoices_workspace_issued_idx
  on invoices (workspace_id, issued_at)
  where issued_at is not null;