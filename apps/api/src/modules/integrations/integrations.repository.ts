import type postgres from "postgres";
import { createSqlClient } from "@revflow/db";
import type {
  CustomerExportDto,
  ExportEntityType,
  ExportFormat,
  IntegrationProvider,
  IntegrationRun,
  IntegrationRunItem,
  IntegrationRunStatus,
  InvoiceExportDto,
  InvoiceLineExportDto,
  JournalEntryExportDto,
  PaymentExportDto,
  RevenueScheduleExportDto,
} from "@revflow/shared";

import { getRequiredWorkspaceId } from "../../lib/request-context.js";

export type Sql = postgres.Sql | postgres.TransactionSql;
type DateLike = Date | string | null;

type IntegrationRunRow = {
  id: string;
  workspace_id: string;
  provider: IntegrationProvider;
  export_type: ExportEntityType;
  status: IntegrationRunStatus;
  actor: string;
  idempotency_key: string;
  export_reference: string | null;
  started_at: DateLike;
  completed_at: DateLike;
  error_summary: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
};

type CustomerRow = {
  id: string;
  workspace_id: string;
  name: string;
  email: string | null;
  created_at: Date;
  updated_at: Date;
};

type InvoiceRow = {
  id: string;
  workspace_id: string;
  customer_id: string;
  contract_id: string | null;
  status: string;
  currency: string;
  subtotal: string | number;
  total: string | number;
  issued_at: DateLike;
  due_at: DateLike;
  created_at: Date;
};

type InvoiceLineRow = {
  id: string;
  invoice_id: string;
  product_id: string | null;
  description: string;
  quantity: string | number;
  unit_price: string | number;
  amount: string | number;
  currency: string;
};

type PaymentRow = {
  id: string;
  workspace_id: string;
  customer_id: string;
  invoice_id: string | null;
  status: string;
  allocation_status: string;
  amount: string | number;
  applied_amount: string | number | null;
  unapplied_amount: string | number | null;
  currency: string;
  received_at: DateLike;
  reference: string | null;
};

type JournalEntryRow = {
  id: string;
  workspace_id: string;
  revenue_schedule_id: string;
  invoice_id: string;
  entry_date: DateLike;
  status: string;
  debit_account: string;
  credit_account: string;
  amount: string | number;
  currency: string;
  memo: string | null;
  external_export_reference: string | null;
};

type RevenueScheduleRow = {
  id: string;
  workspace_id: string;
  invoice_id: string;
  invoice_line_item_id: string;
  performance_obligation_id: string | null;
  status: string;
  currency: string;
  recognition_date: DateLike;
  period_start: DateLike;
  period_end: DateLike;
  recognized_amount: string | number;
  deferred_amount: string | number;
  external_export_reference: string | null;
};

function toIso(value: DateLike) {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function toDateOnly(value: DateLike) {
  const iso = toIso(value);
  return iso === null ? null : iso.slice(0, 10);
}

function toRun(row: IntegrationRunRow): IntegrationRun {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    provider: row.provider,
    exportType: row.export_type,
    status: row.status,
    actor: row.actor,
    idempotencyKey: row.idempotency_key,
    exportReference: row.export_reference,
    startedAt: toIso(row.started_at),
    completedAt: toIso(row.completed_at),
    errorSummary: row.error_summary,
    metadata: row.metadata,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function exportReference(runId: string) {
  return `EXP-${runId.slice(0, 8).toUpperCase()}`;
}

export function providerForFormat(format: ExportFormat): IntegrationProvider {
  return format;
}

export async function findRunByIdempotency(
  sql: Sql,
  input: {
    provider: IntegrationProvider;
    exportType: ExportEntityType;
    idempotencyKey: string;
  },
) {
  const workspaceId = getRequiredWorkspaceId();
  const rows = await sql<IntegrationRunRow[]>`
    select id, workspace_id, provider, export_type, status, actor, idempotency_key, export_reference, started_at, completed_at, error_summary, metadata, created_at, updated_at
    from integration_runs
    where workspace_id = ${workspaceId}
      and provider = ${input.provider}
      and export_type = ${input.exportType}
      and idempotency_key = ${input.idempotencyKey}
    limit 1
  `;

  return rows[0] ? toRun(rows[0]) : null;
}

export async function createRun(
  sql: Sql,
  input: {
    provider: IntegrationProvider;
    exportType: ExportEntityType;
    actor: string;
    idempotencyKey: string;
    format: ExportFormat;
  },
) {
  const workspaceId = getRequiredWorkspaceId();
  const rows = await sql<IntegrationRunRow[]>`
    insert into integration_runs (workspace_id, provider, export_type, status, actor, idempotency_key, started_at, metadata)
    values (${workspaceId}, ${input.provider}, ${input.exportType}, 'running', ${input.actor}, ${input.idempotencyKey}, now(), ${sql.json({ format: input.format } as never)})
    returning id, workspace_id, provider, export_type, status, actor, idempotency_key, export_reference, started_at, completed_at, error_summary, metadata, created_at, updated_at
  `;
  const row = rows[0];
  if (!row) throw new Error("Integration run insert did not return a row");

  const reference = exportReference(row.id);
  const updatedRows = await sql<IntegrationRunRow[]>`
    update integration_runs
    set export_reference = ${reference}, updated_at = now()
    where workspace_id = ${workspaceId}
      and id = ${row.id}
    returning id, workspace_id, provider, export_type, status, actor, idempotency_key, export_reference, started_at, completed_at, error_summary, metadata, created_at, updated_at
  `;

  return toRun(updatedRows[0] ?? row);
}

export async function completeRun(
  sql: Sql,
  input: {
    runId: string;
    recordCount: number;
    format: ExportFormat;
    version: string;
    connectorResult?: Record<string, unknown> | null;
  },
) {
  const workspaceId = getRequiredWorkspaceId();
  const rows = await sql<IntegrationRunRow[]>`
    update integration_runs
    set status = 'succeeded',
        completed_at = now(),
        metadata = ${sql.json({ recordCount: input.recordCount, format: input.format, version: input.version, ...(input.connectorResult ? { connectorResult: input.connectorResult } : {}) } as never)},
        updated_at = now()
    where workspace_id = ${workspaceId}
      and id = ${input.runId}
    returning id, workspace_id, provider, export_type, status, actor, idempotency_key, export_reference, started_at, completed_at, error_summary, metadata, created_at, updated_at
  `;
  const row = rows[0];
  if (!row) throw new Error("Integration run update did not return a row");
  return toRun(row);
}

export async function failRun(
  sql: Sql,
  input: {
    runId: string;
    errorSummary: string;
    recordCount: number;
    format: ExportFormat;
    version: string;
    connectorError?: Record<string, unknown> | null;
  },
) {
  const workspaceId = getRequiredWorkspaceId();
  const rows = await sql<IntegrationRunRow[]>`
    update integration_runs
    set status = 'failed',
        completed_at = now(),
        error_summary = ${input.errorSummary},
        metadata = ${sql.json({ recordCount: input.recordCount, format: input.format, version: input.version, ...(input.connectorError ? { connectorError: input.connectorError } : {}) } as never)},
        updated_at = now()
    where workspace_id = ${workspaceId}
      and id = ${input.runId}
    returning id, workspace_id, provider, export_type, status, actor, idempotency_key, export_reference, started_at, completed_at, error_summary, metadata, created_at, updated_at
  `;
  const row = rows[0];
  if (!row)
    throw new Error("Integration run failure update did not return a row");
  return toRun(row);
}
export async function insertRunItems(
  sql: Sql,
  input: { runId: string; entityType: ExportEntityType; entityIds: string[] },
) {
  const workspaceId = getRequiredWorkspaceId();
  if (input.entityIds.length === 0) return [] as IntegrationRunItem[];

  const rows = await sql<
    Array<{
      id: string;
      workspace_id: string;
      integration_run_id: string;
      entity_type: ExportEntityType;
      entity_id: string;
      status: IntegrationRunStatus;
      external_reference: string | null;
      error_summary: string | null;
      metadata: Record<string, unknown>;
      created_at: Date;
      updated_at: Date;
    }>
  >`
    insert into integration_run_items (workspace_id, integration_run_id, entity_type, entity_id, status)
    select ${workspaceId}, ${input.runId}, ${input.entityType}, entity_id, 'succeeded'::integration_run_status
    from unnest(${input.entityIds}::uuid[]) as entity_id
    on conflict (workspace_id, integration_run_id, entity_type, entity_id) do update
      set status = excluded.status, updated_at = now()
    returning id, workspace_id, integration_run_id, entity_type, entity_id, status, external_reference, error_summary, metadata, created_at, updated_at
  `;

  return rows.map((row) => ({
    id: row.id,
    workspaceId: row.workspace_id,
    integrationRunId: row.integration_run_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    status: row.status,
    externalReference: row.external_reference,
    errorSummary: row.error_summary,
    metadata: row.metadata,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));
}

export async function markRunItemsFailed(
  sql: Sql,
  input: {
    runId: string;
    entityType: ExportEntityType;
    entityIds: string[];
    errorSummary: string;
  },
) {
  const workspaceId = getRequiredWorkspaceId();
  if (input.entityIds.length === 0) return;

  await sql`
    update integration_run_items
    set status = 'failed', error_summary = ${input.errorSummary}, updated_at = now()
    where workspace_id = ${workspaceId}
      and integration_run_id = ${input.runId}
      and entity_type = ${input.entityType}
      and entity_id in ${sql(input.entityIds)}
  `;
}

export async function updateRunItemReferences(
  sql: Sql,
  input: {
    runId: string;
    references: { entityId: string; externalReference: string }[];
  },
) {
  const workspaceId = getRequiredWorkspaceId();
  for (const item of input.references) {
    await sql`
      update integration_run_items
      set external_reference = ${item.externalReference}, updated_at = now()
      where workspace_id = ${workspaceId}
        and integration_run_id = ${input.runId}
        and entity_id = ${item.entityId}
    `;
  }
}
export async function listCustomersForExport(sql: Sql) {
  const workspaceId = getRequiredWorkspaceId();
  const rows = await sql<CustomerRow[]>`
    select id, workspace_id, name, email, created_at, updated_at
    from customers
    where workspace_id = ${workspaceId}
    order by name asc, created_at asc
  `;

  return rows.map(
    (row): CustomerExportDto => ({
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      billingEmail: row.email,
      taxId: null,
      status: "active",
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    }),
  );
}

export async function listInvoicesForExport(sql: Sql) {
  const workspaceId = getRequiredWorkspaceId();
  const invoiceRows = await sql<InvoiceRow[]>`
    select id, workspace_id, customer_id, contract_id, status, currency, subtotal, total, issued_at, due_at, created_at
    from invoices
    where workspace_id = ${workspaceId}
    order by created_at asc, id asc
  `;
  const lineRows = await sql<InvoiceLineRow[]>`
    select il.id, il.invoice_id, p.product_id, il.description, il.quantity, il.unit_price, il.amount, il.currency
    from invoice_line_items il
    left join price_rules pr on pr.workspace_id = il.workspace_id and pr.id = il.price_rule_id
    left join plans p on p.workspace_id = pr.workspace_id and p.id = pr.plan_id
    where il.workspace_id = ${workspaceId}
    order by il.created_at asc, il.id asc
  `;
  const linesByInvoice = new Map<string, InvoiceLineExportDto[]>();
  for (const row of lineRows) {
    const lines = linesByInvoice.get(row.invoice_id) ?? [];
    lines.push({
      id: row.id,
      productId: row.product_id,
      description: row.description,
      quantity: Number(row.quantity),
      unitAmount: Number(row.unit_price),
      amount: Number(row.amount),
      currency: row.currency,
    });
    linesByInvoice.set(row.invoice_id, lines);
  }

  return invoiceRows.map((row): InvoiceExportDto => {
    const subtotal = Number(row.subtotal);
    const total = Number(row.total);
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      customerId: row.customer_id,
      contractId: row.contract_id,
      invoiceNumber: `INV-${row.id.slice(0, 8).toUpperCase()}`,
      status: row.status,
      currency: row.currency,
      subtotal,
      tax: Math.max(total - subtotal, 0),
      total,
      issuedAt: toIso(row.issued_at),
      dueAt: toIso(row.due_at),
      lines: linesByInvoice.get(row.id) ?? [],
    };
  });
}

export async function listPaymentsForExport(sql: Sql) {
  const workspaceId = getRequiredWorkspaceId();
  const rows = await sql<PaymentRow[]>`
    select
      p.id,
      p.workspace_id,
      p.customer_id,
      p.invoice_id,
      p.status,
      p.allocation_status,
      p.amount,
      coalesce(sum(pa.amount), 0) as applied_amount,
      greatest(p.amount - coalesce(sum(pa.amount), 0), 0) as unapplied_amount,
      p.currency,
      p.received_at,
      p.reference
    from payments p
    left join payment_allocations pa on pa.workspace_id = p.workspace_id and pa.payment_id = p.id
    where p.workspace_id = ${workspaceId}
    group by p.id, p.workspace_id, p.customer_id, p.invoice_id, p.status, p.allocation_status, p.amount, p.currency, p.received_at, p.reference
    order by p.received_at asc, p.created_at asc
  `;

  return rows.map(
    (row): PaymentExportDto => ({
      id: row.id,
      workspaceId: row.workspace_id,
      customerId: row.customer_id,
      invoiceId: row.invoice_id,
      status: row.allocation_status,
      method: "manual_receipt",
      currency: row.currency,
      amount: Number(row.amount),
      appliedAmount: Number(row.applied_amount ?? 0),
      unappliedAmount: Number(row.unapplied_amount ?? 0),
      receivedAt: toIso(row.received_at) ?? "",
      reference: row.reference,
    }),
  );
}

export async function listJournalEntriesForExport(sql: Sql) {
  const workspaceId = getRequiredWorkspaceId();
  const rows = await sql<JournalEntryRow[]>`
    select id, workspace_id, revenue_schedule_id, invoice_id, entry_date, status, debit_account, credit_account, amount, currency, memo, external_export_reference
    from journal_entries
    where workspace_id = ${workspaceId}
    order by entry_date asc, created_at asc, id asc
  `;

  return rows.map((row): JournalEntryExportDto => {
    const amount = Number(row.amount);
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      revenueScheduleId: row.revenue_schedule_id,
      invoiceId: row.invoice_id,
      entryDate: toDateOnly(row.entry_date) ?? "",
      status: row.status,
      currency: row.currency,
      amount,
      externalExportReference: row.external_export_reference,
      lines: [
        {
          accountCode: row.debit_account,
          accountName: row.debit_account,
          debit: amount,
          credit: 0,
          memo: row.memo,
        },
        {
          accountCode: row.credit_account,
          accountName: row.credit_account,
          debit: 0,
          credit: amount,
          memo: row.memo,
        },
      ],
    };
  });
}

export async function listRevenueSchedulesForExport(sql: Sql) {
  const workspaceId = getRequiredWorkspaceId();
  const rows = await sql<RevenueScheduleRow[]>`
    select id, workspace_id, invoice_id, invoice_line_item_id, performance_obligation_id, status, currency, recognition_date, period_start, period_end, recognized_amount, deferred_amount, external_export_reference
    from revenue_schedules
    where workspace_id = ${workspaceId}
    order by recognition_date asc, created_at asc, id asc
  `;

  return rows.map(
    (row): RevenueScheduleExportDto => ({
      id: row.id,
      workspaceId: row.workspace_id,
      invoiceId: row.invoice_id,
      invoiceLineItemId: row.invoice_line_item_id,
      performanceObligationId: row.performance_obligation_id,
      status: row.status,
      currency: row.currency,
      recognitionDate: toDateOnly(row.recognition_date) ?? "",
      periodStart: toDateOnly(row.period_start) ?? "",
      periodEnd: toDateOnly(row.period_end) ?? "",
      recognizedAmount: Number(row.recognized_amount),
      deferredAmount: Number(row.deferred_amount),
      externalExportReference: row.external_export_reference,
    }),
  );
}
