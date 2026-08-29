create type workspace_status as enum ('active', 'suspended');
create type workspace_membership_status as enum ('active', 'disabled');
create type workspace_role as enum ('workspace_admin', 'finance_operator', 'reviewer', 'auditor');

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  status workspace_status not null default 'active',
  external_provider text not null,
  external_organization_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspaces_name_not_blank check (length(trim(name)) > 0),
  constraint workspaces_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint workspaces_external_provider_supported check (external_provider in ('clerk', 'local'))
);

create unique index workspaces_slug_unique on workspaces (lower(slug));
create unique index workspaces_external_org_unique
  on workspaces (external_provider, external_organization_id);

create table workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete restrict,
  external_user_id text not null,
  role workspace_role not null,
  status workspace_membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_memberships_external_user_not_blank check (length(trim(external_user_id)) > 0)
);

create unique index workspace_memberships_workspace_user_unique
  on workspace_memberships (workspace_id, external_user_id);

create index workspace_memberships_external_user_idx
  on workspace_memberships (external_user_id, status);

insert into workspaces (
  id,
  name,
  slug,
  status,
  external_provider,
  external_organization_id
)
values (
  '00000000-0000-4000-8000-000000000001',
  'RevFlow Demo',
  'revflow-demo',
  'active',
  'local',
  'local-org'
);

insert into workspace_memberships (
  workspace_id,
  external_user_id,
  role,
  status
)
values (
  '00000000-0000-4000-8000-000000000001',
  'local-user',
  'workspace_admin',
  'active'
);
