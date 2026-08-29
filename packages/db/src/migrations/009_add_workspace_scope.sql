alter table customers add column workspace_id uuid;
alter table products add column workspace_id uuid;
alter table meters add column workspace_id uuid;
alter table plans add column workspace_id uuid;
alter table price_rules add column workspace_id uuid;
alter table contracts add column workspace_id uuid;
alter table contract_versions add column workspace_id uuid;
alter table contract_line_items add column workspace_id uuid;
alter table usage_events add column workspace_id uuid;
alter table usage_aggregates add column workspace_id uuid;
alter table invoices add column workspace_id uuid;
alter table invoice_line_items add column workspace_id uuid;
alter table performance_obligations add column workspace_id uuid;
alter table revenue_schedules add column workspace_id uuid;
alter table journal_entries add column workspace_id uuid;
alter table audit_logs add column workspace_id uuid;
alter table job_runs add column workspace_id uuid;
alter table ai_extraction_runs add column workspace_id uuid;
alter table ai_extraction_reviews add column workspace_id uuid;

alter table audit_logs
  add column actor_type text not null default 'system',
  add column actor_external_user_id text,
  add column actor_membership_id uuid,
  add column actor_role workspace_role,
  add column auth_provider text,
  add column request_id text,
  add constraint audit_logs_actor_type_supported check (actor_type in ('user', 'system')),
  add constraint audit_logs_auth_provider_supported check (
    auth_provider is null or auth_provider in ('clerk', 'local_test', 'system')
  );

alter table job_runs
  add column initiated_by_external_user_id text;

do $$
declare
  target_table text;
  demo_workspace constant uuid := '00000000-0000-4000-8000-000000000001';
begin
  foreach target_table in array array[
    'customers',
    'products',
    'meters',
    'plans',
    'price_rules',
    'contracts',
    'contract_versions',
    'contract_line_items',
    'usage_events',
    'usage_aggregates',
    'invoices',
    'invoice_line_items',
    'performance_obligations',
    'revenue_schedules',
    'journal_entries',
    'audit_logs',
    'job_runs',
    'ai_extraction_runs',
    'ai_extraction_reviews'
  ]
  loop
    execute format('update %I set workspace_id = $1 where workspace_id is null', target_table)
      using demo_workspace;
    execute format('alter table %I alter column workspace_id set not null', target_table);
    execute format(
      'alter table %I add constraint %I foreign key (workspace_id) references workspaces (id) on delete restrict',
      target_table,
      target_table || '_workspace_id_fkey'
    );
  end loop;
end
$$;

update audit_logs
set actor_type = case when actor = 'system' then 'system' else 'user' end,
    auth_provider = case when actor = 'system' then 'system' else 'local_test' end,
    actor_external_user_id = case when actor = 'system' then null else actor end;

create unique index products_workspace_id_unique on products (workspace_id, id);
create unique index meters_workspace_id_unique on meters (workspace_id, id);
create unique index plans_workspace_id_unique on plans (workspace_id, id);
create unique index price_rules_workspace_id_unique on price_rules (workspace_id, id);
create unique index customers_workspace_id_unique on customers (workspace_id, id);
create unique index contracts_workspace_id_unique on contracts (workspace_id, id);
create unique index contract_versions_workspace_id_unique on contract_versions (workspace_id, id);
create unique index contract_line_items_workspace_id_unique on contract_line_items (workspace_id, id);
create unique index invoices_workspace_id_unique on invoices (workspace_id, id);
create unique index invoice_line_items_workspace_id_unique on invoice_line_items (workspace_id, id);
create unique index performance_obligations_workspace_id_unique on performance_obligations (workspace_id, id);
create unique index revenue_schedules_workspace_id_unique on revenue_schedules (workspace_id, id);
create unique index ai_extraction_runs_workspace_id_unique on ai_extraction_runs (workspace_id, id);

alter table meters add constraint meters_workspace_product_fkey
  foreign key (workspace_id, product_id) references products (workspace_id, id) on delete cascade;
alter table plans add constraint plans_workspace_product_fkey
  foreign key (workspace_id, product_id) references products (workspace_id, id) on delete cascade;
alter table price_rules add constraint price_rules_workspace_plan_fkey
  foreign key (workspace_id, plan_id) references plans (workspace_id, id) on delete cascade;
alter table price_rules add constraint price_rules_workspace_meter_fkey
  foreign key (workspace_id, meter_id) references meters (workspace_id, id) on delete restrict;
alter table contracts add constraint contracts_workspace_customer_fkey
  foreign key (workspace_id, customer_id) references customers (workspace_id, id) on delete restrict;
alter table contract_versions add constraint contract_versions_workspace_contract_fkey
  foreign key (workspace_id, contract_id) references contracts (workspace_id, id) on delete cascade;
alter table contract_line_items add constraint contract_line_items_workspace_version_fkey
  foreign key (workspace_id, contract_version_id) references contract_versions (workspace_id, id) on delete cascade;
alter table contract_line_items add constraint contract_line_items_workspace_price_rule_fkey
  foreign key (workspace_id, price_rule_id) references price_rules (workspace_id, id) on delete restrict;
alter table usage_events add constraint usage_events_workspace_contract_fkey
  foreign key (workspace_id, contract_id) references contracts (workspace_id, id) on delete restrict;
alter table usage_events add constraint usage_events_workspace_meter_fkey
  foreign key (workspace_id, meter_id) references meters (workspace_id, id) on delete restrict;
alter table usage_aggregates add constraint usage_aggregates_workspace_contract_fkey
  foreign key (workspace_id, contract_id) references contracts (workspace_id, id) on delete restrict;
alter table usage_aggregates add constraint usage_aggregates_workspace_meter_fkey
  foreign key (workspace_id, meter_id) references meters (workspace_id, id) on delete restrict;
alter table invoices add constraint invoices_workspace_customer_fkey
  foreign key (workspace_id, customer_id) references customers (workspace_id, id) on delete restrict;
alter table invoices add constraint invoices_workspace_contract_fkey
  foreign key (workspace_id, contract_id) references contracts (workspace_id, id) on delete restrict;
alter table invoice_line_items add constraint invoice_line_items_workspace_invoice_fkey
  foreign key (workspace_id, invoice_id) references invoices (workspace_id, id) on delete cascade;
alter table invoice_line_items add constraint invoice_line_items_workspace_contract_line_fkey
  foreign key (workspace_id, contract_line_item_id) references contract_line_items (workspace_id, id) on delete restrict;
alter table invoice_line_items add constraint invoice_line_items_workspace_price_rule_fkey
  foreign key (workspace_id, price_rule_id) references price_rules (workspace_id, id) on delete restrict;
alter table performance_obligations add constraint performance_obligations_workspace_contract_line_fkey
  foreign key (workspace_id, contract_line_item_id) references contract_line_items (workspace_id, id) on delete restrict;
alter table revenue_schedules add constraint revenue_schedules_workspace_invoice_fkey
  foreign key (workspace_id, invoice_id) references invoices (workspace_id, id) on delete restrict;
alter table revenue_schedules add constraint revenue_schedules_workspace_invoice_line_fkey
  foreign key (workspace_id, invoice_line_item_id) references invoice_line_items (workspace_id, id) on delete restrict;
alter table revenue_schedules add constraint revenue_schedules_workspace_obligation_fkey
  foreign key (workspace_id, performance_obligation_id) references performance_obligations (workspace_id, id) on delete restrict;
alter table journal_entries add constraint journal_entries_workspace_schedule_fkey
  foreign key (workspace_id, revenue_schedule_id) references revenue_schedules (workspace_id, id) on delete restrict;
alter table journal_entries add constraint journal_entries_workspace_invoice_fkey
  foreign key (workspace_id, invoice_id) references invoices (workspace_id, id) on delete restrict;
alter table ai_extraction_runs add constraint ai_extraction_runs_workspace_contract_fkey
  foreign key (workspace_id, applied_contract_id) references contracts (workspace_id, id) on delete restrict;
alter table ai_extraction_reviews add constraint ai_extraction_reviews_workspace_run_fkey
  foreign key (workspace_id, extraction_run_id) references ai_extraction_runs (workspace_id, id) on delete cascade;

drop index customers_email_unique;
create unique index customers_workspace_email_unique
  on customers (workspace_id, lower(email));

drop index products_name_unique;
create unique index products_workspace_name_unique
  on products (workspace_id, lower(name));

drop index meters_product_event_unique;
create unique index meters_workspace_product_event_unique
  on meters (workspace_id, product_id, event_name);

drop index plans_product_name_interval_unique;
create unique index plans_workspace_product_name_interval_unique
  on plans (workspace_id, product_id, lower(name), billing_interval);

drop index contract_versions_contract_version_unique;
create unique index contract_versions_workspace_contract_version_unique
  on contract_versions (workspace_id, contract_id, version_number);

alter table usage_events drop constraint usage_events_idempotency_key_key;
create unique index usage_events_workspace_idempotency_unique
  on usage_events (workspace_id, idempotency_key);

drop index usage_aggregates_contract_meter_period_unique;
create unique index usage_aggregates_workspace_contract_meter_period_unique
  on usage_aggregates (workspace_id, contract_id, meter_id, period_start, period_end);

create index customers_workspace_created_idx on customers (workspace_id, created_at desc);
create index products_workspace_created_idx on products (workspace_id, created_at desc);
create index meters_workspace_created_idx on meters (workspace_id, created_at desc);
create index plans_workspace_created_idx on plans (workspace_id, created_at desc);
create index price_rules_workspace_created_idx on price_rules (workspace_id, created_at desc);
create index contracts_workspace_status_created_idx on contracts (workspace_id, status, created_at desc);
create index contract_versions_workspace_created_idx on contract_versions (workspace_id, created_at desc);
create index contract_line_items_workspace_created_idx on contract_line_items (workspace_id, created_at desc);
create index usage_events_workspace_occurred_idx on usage_events (workspace_id, occurred_at desc);
create index usage_aggregates_workspace_period_idx on usage_aggregates (workspace_id, period_start, period_end);
create index invoices_workspace_status_created_idx on invoices (workspace_id, status, created_at desc);
create index invoice_line_items_workspace_created_idx on invoice_line_items (workspace_id, created_at desc);
create index performance_obligations_workspace_created_idx on performance_obligations (workspace_id, created_at desc);
create index revenue_schedules_workspace_recognition_idx on revenue_schedules (workspace_id, recognition_date);
create index journal_entries_workspace_entry_idx on journal_entries (workspace_id, entry_date);
create index audit_logs_workspace_created_idx on audit_logs (workspace_id, created_at desc);
create index job_runs_workspace_created_idx on job_runs (workspace_id, created_at desc);
create index ai_extraction_runs_workspace_created_idx on ai_extraction_runs (workspace_id, created_at desc);
create index ai_extraction_reviews_workspace_created_idx on ai_extraction_reviews (workspace_id, created_at desc);
