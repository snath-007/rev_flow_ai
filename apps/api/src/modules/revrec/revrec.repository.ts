import { createSqlClient } from "@revflow/db";

import { calculateJournalEntry } from "./journal-entry-builder.js";
import { calculateRevenueSchedule } from "./revrec-engine.js";
import type { RecognitionInput, RevenueRecognitionMethod } from "./revrec.types.js";

type DateLike = Date | string;

type InvoiceContextRow = {
  id: string;
  status: "draft" | "approved" | "issued" | "paid" | "void" | "credited";
  period_start: DateLike;
  period_end: DateLike;
  currency: string;
};

type InvoiceLineItemContextRow = {
  id: string;
  invoice_id: string;
  contract_line_item_id: string | null;
  price_rule_id: string;
  description: string;
  amount: string;
  currency: string;
  calculation_snapshot: Record<string, unknown>;
};

type PerformanceObligationRow = {
  id: string;
  contract_line_item_id: string;
  name: string;
  recognition_method: RevenueRecognitionMethod;
  service_start_date: DateLike | null;
  service_end_date: DateLike | null;
  allocation_amount: string;
  currency: string;
  config: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
};

type RevenueScheduleRow = {
  id: string;
  invoice_id: string;
  invoice_line_item_id: string;
  performance_obligation_id: string | null;
  recognition_method: RevenueRecognitionMethod;
  status: "draft" | "generated" | "posted" | "void";
  period_start: DateLike;
  period_end: DateLike;
  recognition_date: DateLike;
  recognized_amount: string;
  deferred_amount: string;
  currency: string;
  calculation_snapshot: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  customer_name?: string | null;
  invoice_period_start?: DateLike | null;
  invoice_period_end?: DateLike | null;
};

type JournalEntryRow = {
  id: string;
  revenue_schedule_id: string;
  invoice_id: string;
  status: "draft" | "posted" | "void";
  entry_date: DateLike;
  debit_account: string;
  credit_account: string;
  amount: string;
  currency: string;
  memo: string | null;
  metadata: Record<string, unknown>;
  posted_at: Date | null;
  created_at: Date;
  updated_at: Date;
  customer_name?: string | null;
};

export type PerformanceObligationRecord = ReturnType<typeof toPerformanceObligation>;
export type RevenueScheduleRecord = ReturnType<typeof toRevenueSchedule>;
export type JournalEntryRecord = ReturnType<typeof toJournalEntry>;

export type GenerateRevenueSchedulesResult = {
  invoiceId: string;
  performanceObligations: PerformanceObligationRecord[];
  schedules: RevenueScheduleRecord[];
  journalEntries: JournalEntryRecord[];
};

function formatDate(value: DateLike) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function toPerformanceObligation(row: PerformanceObligationRow) {
  return {
    id: row.id,
    contractLineItemId: row.contract_line_item_id,
    name: row.name,
    recognitionMethod: row.recognition_method,
    serviceStartDate: row.service_start_date ? formatDate(row.service_start_date) : null,
    serviceEndDate: row.service_end_date ? formatDate(row.service_end_date) : null,
    allocationAmount: Number(row.allocation_amount),
    currency: row.currency,
    config: row.config,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function toRevenueSchedule(row: RevenueScheduleRow) {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    invoiceLineItemId: row.invoice_line_item_id,
    performanceObligationId: row.performance_obligation_id,
    recognitionMethod: row.recognition_method,
    status: row.status,
    periodStart: formatDate(row.period_start),
    periodEnd: formatDate(row.period_end),
    recognitionDate: formatDate(row.recognition_date),
    recognizedAmount: Number(row.recognized_amount),
    deferredAmount: Number(row.deferred_amount),
    currency: row.currency,
    calculationSnapshot: row.calculation_snapshot,
    customerName: row.customer_name ?? null,
    invoicePeriodStart: row.invoice_period_start ? formatDate(row.invoice_period_start) : null,
    invoicePeriodEnd: row.invoice_period_end ? formatDate(row.invoice_period_end) : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function toJournalEntry(row: JournalEntryRow) {
  return {
    id: row.id,
    revenueScheduleId: row.revenue_schedule_id,
    invoiceId: row.invoice_id,
    status: row.status,
    entryDate: formatDate(row.entry_date),
    debitAccount: row.debit_account,
    creditAccount: row.credit_account,
    amount: Number(row.amount),
    currency: row.currency,
    memo: row.memo,
    metadata: row.metadata,
    customerName: row.customer_name ?? null,
    postedAt: row.posted_at ? row.posted_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}
function getSnapshotRecord(snapshot: Record<string, unknown>, key: string) {
  const value = snapshot[key];
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function isRecognitionMethod(value: unknown): value is RevenueRecognitionMethod {
  return value === "immediate" || value === "straight_line" || value === "usage_based";
}

function selectRecognitionMethod(line: InvoiceLineItemContextRow): RevenueRecognitionMethod {
  const snapshotMethod = line.calculation_snapshot.recognitionMethod;

  if (isRecognitionMethod(snapshotMethod)) {
    return snapshotMethod;
  }

  const pricingModel = line.calculation_snapshot.pricingModel;
  if (pricingModel === "flat") {
    return "straight_line";
  }

  return "immediate";
}

function buildObligationConfig(invoice: InvoiceContextRow, line: InvoiceLineItemContextRow) {
  return {
    source: "invoice_line_item",
    invoiceId: invoice.id,
    invoiceLineItemId: line.id,
    priceRuleId: line.price_rule_id,
    invoicePeriodStart: formatDate(invoice.period_start),
    invoicePeriodEnd: formatDate(invoice.period_end),
    pricingSnapshot: getSnapshotRecord(line.calculation_snapshot, "pricing"),
    recognitionMethodSource: isRecognitionMethod(line.calculation_snapshot.recognitionMethod)
      ? "invoice_line_item_snapshot"
      : "phase_4_mvp_default"
  };
}

export async function listRevenueSchedules() {
  const sql = createSqlClient();

  try {
    const rows = await sql<RevenueScheduleRow[]>`
      select
        rs.id,
        rs.invoice_id,
        rs.invoice_line_item_id,
        rs.performance_obligation_id,
        rs.recognition_method,
        rs.status,
        rs.period_start,
        rs.period_end,
        rs.recognition_date,
        rs.recognized_amount,
        rs.deferred_amount,
        rs.currency,
        rs.calculation_snapshot,
        rs.created_at,
        rs.updated_at,
        c.name as customer_name,
        i.period_start as invoice_period_start,
        i.period_end as invoice_period_end
      from revenue_schedules rs
      join invoices i on i.id = rs.invoice_id
      join customers c on c.id = i.customer_id
      order by rs.recognition_date desc, rs.created_at desc
      limit 100
    `;

    return rows.map(toRevenueSchedule);
  } finally {
    await sql.end({ timeout: 5 });
  }
}


export async function listJournalEntries() {
  const sql = createSqlClient();

  try {
    const rows = await sql<JournalEntryRow[]>`
      select
        je.id,
        je.revenue_schedule_id,
        je.invoice_id,
        je.status,
        je.entry_date,
        je.debit_account,
        je.credit_account,
        je.amount,
        je.currency,
        je.memo,
        je.metadata,
        je.posted_at,
        je.created_at,
        je.updated_at,
        c.name as customer_name
      from journal_entries je
      join invoices i on i.id = je.invoice_id
      join customers c on c.id = i.customer_id
      order by je.entry_date desc, je.created_at desc
      limit 100
    `;

    return rows.map(toJournalEntry);
  } finally {
    await sql.end({ timeout: 5 });
  }
}
export async function generateRevenueSchedulesForInvoice(invoiceId: string) {
  const sql = createSqlClient();

  try {
    return await sql.begin(async (tx) => {
      const invoiceRows = await tx<InvoiceContextRow[]>`
        select id, status, period_start, period_end, currency
        from invoices
        where id = ${invoiceId}
        limit 1
      `;
      const invoice = invoiceRows[0];

      if (!invoice) {
        return "INVOICE_NOT_FOUND" as const;
      }

      if (invoice.status !== "approved") {
        return "INVOICE_NOT_APPROVED" as const;
      }

      const existingRows = await tx<{ id: string }[]>`
        select id
        from revenue_schedules
        where invoice_id = ${invoiceId}
          and status <> 'void'
        limit 1
      `;

      if (existingRows[0]) {
        return "REVENUE_SCHEDULES_ALREADY_EXIST" as const;
      }

      const lineRows = await tx<InvoiceLineItemContextRow[]>`
        select id, invoice_id, contract_line_item_id, price_rule_id, description, amount, currency, calculation_snapshot
        from invoice_line_items
        where invoice_id = ${invoiceId}
        order by created_at asc
      `;

      if (lineRows.length === 0) {
        return "NO_INVOICE_LINES" as const;
      }

      const performanceObligations: PerformanceObligationRecord[] = [];
      const schedules: RevenueScheduleRecord[] = [];
      const journalEntries: JournalEntryRecord[] = [];

      for (const line of lineRows) {
        if (!line.contract_line_item_id) {
          return "INVOICE_LINE_MISSING_CONTRACT_LINE" as const;
        }

        const recognitionMethod = selectRecognitionMethod(line);
        const serviceStartDate = formatDate(invoice.period_start);
        const serviceEndDate = formatDate(invoice.period_end);
        const config = buildObligationConfig(invoice, line);

        const obligationRows = await tx<PerformanceObligationRow[]>`
          insert into performance_obligations (contract_line_item_id, name, recognition_method, service_start_date, service_end_date, allocation_amount, currency, config)
          values (
            ${line.contract_line_item_id},
            ${line.description},
            ${recognitionMethod},
            ${serviceStartDate},
            ${serviceEndDate},
            ${line.amount},
            ${line.currency},
            ${tx.json(config as never)}
          )
          returning id, contract_line_item_id, name, recognition_method, service_start_date, service_end_date, allocation_amount, currency, config, created_at, updated_at
        `;
        const obligation = obligationRows[0];

        if (!obligation) {
          throw new Error("Performance obligation insert did not return a row");
        }

        performanceObligations.push(toPerformanceObligation(obligation));

        const recognitionInput: RecognitionInput = {
          invoiceId: invoice.id,
          invoiceLineItemId: line.id,
          performanceObligationId: obligation.id,
          recognitionMethod,
          amount: Number(line.amount),
          currency: line.currency,
          serviceStartDate,
          serviceEndDate
        };

        const calculatedSchedules = calculateRevenueSchedule(recognitionInput);

        for (const schedule of calculatedSchedules) {
          const scheduleRows = await tx<RevenueScheduleRow[]>`
            insert into revenue_schedules (invoice_id, invoice_line_item_id, performance_obligation_id, recognition_method, status, period_start, period_end, recognition_date, recognized_amount, deferred_amount, currency, calculation_snapshot)
            values (
              ${schedule.invoiceId},
              ${schedule.invoiceLineItemId},
              ${schedule.performanceObligationId},
              ${schedule.recognitionMethod},
              'generated',
              ${schedule.periodStart},
              ${schedule.periodEnd},
              ${schedule.recognitionDate},
              ${schedule.recognizedAmount},
              ${schedule.deferredAmount},
              ${schedule.currency},
              ${tx.json(schedule.calculationSnapshot as never)}
            )
            returning id, invoice_id, invoice_line_item_id, performance_obligation_id, recognition_method, status, period_start, period_end, recognition_date, recognized_amount, deferred_amount, currency, calculation_snapshot, created_at, updated_at
          `;
          const scheduleRow = scheduleRows[0];

          if (!scheduleRow) {
            throw new Error("Revenue schedule insert did not return a row");
          }

          const persistedSchedule = toRevenueSchedule(scheduleRow);
          schedules.push(persistedSchedule);

          const journalEntry = calculateJournalEntry({
            revenueScheduleId: persistedSchedule.id,
            invoiceId: persistedSchedule.invoiceId,
            entryDate: persistedSchedule.recognitionDate,
            amount: persistedSchedule.recognizedAmount,
            currency: persistedSchedule.currency,
            memo: `Recognize revenue for schedule ${persistedSchedule.id}`,
            metadata: {
              revenueScheduleId: persistedSchedule.id,
              invoiceLineItemId: persistedSchedule.invoiceLineItemId,
              performanceObligationId: persistedSchedule.performanceObligationId,
              recognitionMethod: persistedSchedule.recognitionMethod
            }
          });

          const journalEntryRows = await tx<JournalEntryRow[]>`
            insert into journal_entries (revenue_schedule_id, invoice_id, status, entry_date, debit_account, credit_account, amount, currency, memo, metadata)
            values (
              ${journalEntry.revenueScheduleId},
              ${journalEntry.invoiceId},
              ${journalEntry.status},
              ${journalEntry.entryDate},
              ${journalEntry.debitAccount},
              ${journalEntry.creditAccount},
              ${journalEntry.amount},
              ${journalEntry.currency},
              ${journalEntry.memo},
              ${tx.json(journalEntry.metadata as never)}
            )
            returning id, revenue_schedule_id, invoice_id, status, entry_date, debit_account, credit_account, amount, currency, memo, metadata, posted_at, created_at, updated_at
          `;
          const journalEntryRow = journalEntryRows[0];

          if (!journalEntryRow) {
            throw new Error("Journal entry insert did not return a row");
          }

          journalEntries.push(toJournalEntry(journalEntryRow));
        }
      }

      return {
        invoiceId: invoice.id,
        performanceObligations,
        schedules,
        journalEntries
      } satisfies GenerateRevenueSchedulesResult;
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}