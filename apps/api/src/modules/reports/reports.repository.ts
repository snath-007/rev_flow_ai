import { createSqlClient } from "@revflow/db";
import type { ArAgingBucket, ArAgingBucketTotal, ArAgingCredit, ArAgingReport, CurrencyAmount, DsoMetric, DsoReport, RecurringRevenueCurrencyTotal, RecurringRevenueExcludedLine, RecurringRevenueIncludedLine, RecurringRevenueReport, ReportException, ReportOverview, RevenueWaterfallPeriod, RevenueWaterfallReport } from "@revflow/shared";

import { getRequiredWorkspaceId } from "../../lib/request-context.js";



type RecurringRevenueLineRow = {
  customer_id: string;
  customer_name: string;
  contract_id: string;
  contract_line_item_id: string;
  line_item_name: string;
  product_name: string;
  plan_name: string;
  billing_interval: "monthly" | "annual";
  pricing_model: "flat" | "per_unit" | "tiered";
  unit_price: string | number;
  currency: string;
};
type ArAgingRow = {
  bucket: ArAgingBucket;
  currency: string;
  amount: string | number;
  invoice_count: string | number;
};

type ArCreditRow = {
  currency: string;
  amount: string | number;
  invoice_count: string | number;
};

type ArAtDateRow = {
  currency: string;
  amount: string | number;
};

type CreditSalesRow = {
  currency: string;
  amount: string | number;
};
type CurrencyAmountRow = {
  currency: string;
  amount: string | number | null;
};

type CountRow = {
  count: string | number;
};


type WaterfallScheduleRow = {
  period: string;
  currency: string;
  status: "generated" | "posted";
  recognized_amount: string | number;
  deferred_amount: string | number;
  schedule_addition: string | number;
};
type ExceptionCountRow = {
  missing_issued_at: string | number;
  missing_due_at: string | number;
};




function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function mergeCurrencies(groups: string[][]) {
  return Array.from(new Set(groups.flat())).sort();
}

function amountMap(rows: { currency: string; amount: string | number }[]) {
  return new Map(rows.map((row) => [row.currency, Number(row.amount ?? 0)]));
}

function buildAgingBuckets(rows: ArAgingRow[]) {
  return rows.map((row): ArAgingBucketTotal => ({
    bucket: row.bucket,
    currency: row.currency,
    amount: Number(row.amount ?? 0),
    invoiceCount: Number(row.invoice_count ?? 0)
  }));
}

function buildAgingCredits(rows: ArCreditRow[]) {
  return rows.map((row): ArAgingCredit => ({
    currency: row.currency,
    amount: Number(row.amount ?? 0),
    invoiceCount: Number(row.invoice_count ?? 0)
  }));
}

function normalizeMrr(amount: number, interval: "monthly" | "annual") {
  return interval === "annual" ? amount / 12 : amount;
}

function exclusionReason(pricingModel: "flat" | "per_unit" | "tiered") {
  if (pricingModel === "per_unit") {
    return "Usage-priced per-unit line has no explicit minimum commitment in the current schema.";
  }

  if (pricingModel === "tiered") {
    return "Tiered usage line has no explicit minimum commitment in the current schema.";
  }

  return "Line is not eligible for committed recurring revenue.";
}

function buildRecurringTotals(includedLines: RecurringRevenueIncludedLine[], excludedLines: RecurringRevenueExcludedLine[]) {
  const currencies = mergeCurrencies([includedLines.map((line) => line.currency), excludedLines.map((line) => line.currency)]);

  return currencies.map((currency): RecurringRevenueCurrencyTotal => {
    const includedForCurrency = includedLines.filter((line) => line.currency === currency);
    const excludedForCurrency = excludedLines.filter((line) => line.currency === currency);
    const mrr = includedForCurrency.reduce((sum, line) => sum + line.mrr, 0);

    return {
      currency,
      mrr,
      arr: mrr * 12,
      includedLineCount: includedForCurrency.length,
      excludedLineCount: excludedForCurrency.length
    };
  });
}
function nowIso() {
  return new Date().toISOString();
}

function toCurrencyAmounts(rows: CurrencyAmountRow[]) {
  return rows.map((row) => ({
    currency: row.currency,
    amount: Number(row.amount ?? 0)
  }));
}


function createWaterfallKey(period: string, currency: string) {
  return `${period}:${currency}`;
}


function buildRevenueWaterfall(rows: WaterfallScheduleRow[]) {
  const currencies = Array.from(new Set(rows.map((row) => row.currency))).sort();
  const periods = Array.from(new Set(rows.map((row) => row.period))).sort();
  const additionsByFirstPeriod = new Map<string, number>();
  const recognizedByPeriod = new Map<string, number>();
  const generatedByPeriod = new Map<string, number>();
  const postedByPeriod = new Map<string, number>();
  const scheduleCountByPeriod = new Map<string, number>();

  for (const row of rows) {
    const key = createWaterfallKey(row.period, row.currency);
    const scheduleAddition = Number(row.schedule_addition ?? 0);
    const recognizedAmount = Number(row.recognized_amount ?? 0);

    additionsByFirstPeriod.set(key, (additionsByFirstPeriod.get(key) ?? 0) + scheduleAddition);
    recognizedByPeriod.set(key, (recognizedByPeriod.get(key) ?? 0) + recognizedAmount);
    scheduleCountByPeriod.set(key, (scheduleCountByPeriod.get(key) ?? 0) + 1);

    if (row.status === "posted") {
      postedByPeriod.set(key, (postedByPeriod.get(key) ?? 0) + recognizedAmount);
    } else {
      generatedByPeriod.set(key, (generatedByPeriod.get(key) ?? 0) + recognizedAmount);
    }
  }

  const result: RevenueWaterfallPeriod[] = [];

  for (const currency of currencies) {
    let openingDeferred = 0;

    for (const period of periods) {
      const key = createWaterfallKey(period, currency);
      const scheduleAdditions = additionsByFirstPeriod.get(key) ?? 0;
      const recognizedRevenue = recognizedByPeriod.get(key) ?? 0;
      const closingDeferred = openingDeferred + scheduleAdditions - recognizedRevenue;

      result.push({
        period,
        currency,
        openingDeferred,
        scheduleAdditions,
        recognizedRevenue,
        closingDeferred,
        generatedAmount: generatedByPeriod.get(key) ?? 0,
        postedAmount: postedByPeriod.get(key) ?? 0,
        scheduleCount: scheduleCountByPeriod.get(key) ?? 0
      });

      openingDeferred = closingDeferred;
    }
  }

  return { periods: result, currencies };
}
function collectCurrencies(groups: CurrencyAmount[][]) {
  return Array.from(new Set(groups.flat().map((item) => item.currency))).sort();
}

export async function getOverviewReport(): Promise<ReportOverview> {
  const workspaceId = getRequiredWorkspaceId();
  const sql = createSqlClient();
  const asOf = nowIso();

  try {
    const [openArRows, cashRows, revenueRows, deferredRows, activeContractRows, payableInvoiceRows, exceptionRows] = await Promise.all([
      sql<CurrencyAmountRow[]>`
        select i.currency, coalesce(sum(greatest(i.total - coalesce(payment_totals.amount_paid, 0), 0)), 0) as amount
        from invoices i
        left join lateral (
          select coalesce(sum(pa.amount), 0) as amount_paid
          from payment_allocations pa
          join payments p on p.id = pa.payment_id
            and p.workspace_id = pa.workspace_id
          where pa.workspace_id = i.workspace_id
            and pa.invoice_id = i.id
            and p.status = 'received'
            and p.received_at <= ${asOf}
        ) payment_totals on true
        where i.workspace_id = ${workspaceId}
          and i.status in ('approved', 'issued', 'paid')
          and i.issued_at is not null
        group by i.currency
        order by i.currency
      `,
      sql<CurrencyAmountRow[]>`
        select currency, coalesce(sum(amount), 0) as amount
        from payments
        where workspace_id = ${workspaceId}
          and status = 'received'
          and received_at <= ${asOf}
        group by currency
        order by currency
      `,
      sql<CurrencyAmountRow[]>`
        select currency, coalesce(sum(recognized_amount), 0) as amount
        from revenue_schedules
        where workspace_id = ${workspaceId}
          and status in ('generated', 'posted')
          and recognition_date <= ${asOf}::date
        group by currency
        order by currency
      `,
      sql<CurrencyAmountRow[]>`
        select currency, coalesce(sum(deferred_amount), 0) as amount
        from revenue_schedules
        where workspace_id = ${workspaceId}
          and status in ('generated', 'posted')
        group by currency
        order by currency
      `,
      sql<CountRow[]>`
        select count(*) as count
        from contracts
        where workspace_id = ${workspaceId}
          and status = 'active'
      `,
      sql<CountRow[]>`
        select count(*) as count
        from invoices i
        left join lateral (
          select coalesce(sum(pa.amount), 0) as amount_paid
          from payment_allocations pa
          join payments p on p.id = pa.payment_id
            and p.workspace_id = pa.workspace_id
          where pa.workspace_id = i.workspace_id
            and pa.invoice_id = i.id
            and p.status = 'received'
        ) payment_totals on true
        where i.workspace_id = ${workspaceId}
          and i.status in ('approved', 'issued')
          and greatest(i.total - coalesce(payment_totals.amount_paid, 0), 0) > 0
      `,
      sql<ExceptionCountRow[]>`
        select
          count(*) filter (where issued_at is null) as missing_issued_at,
          count(*) filter (where due_at is null) as missing_due_at
        from invoices
        where workspace_id = ${workspaceId}
          and status in ('approved', 'issued', 'paid')
      `
    ]);

    const openAr = toCurrencyAmounts(openArRows);
    const cashReceived = toCurrencyAmounts(cashRows);
    const recognizedRevenue = toCurrencyAmounts(revenueRows);
    const deferredRevenue = toCurrencyAmounts(deferredRows);
    const exceptionCounts = exceptionRows[0];
    const exceptions: ReportException[] = [];

    if (Number(exceptionCounts?.missing_issued_at ?? 0) > 0) {
      exceptions.push({
        code: "MISSING_ISSUED_AT",
        message: "Some reportable invoices do not have an issued_at timestamp and are excluded from time-based receivables reporting.",
        source: "invoices",
        count: Number(exceptionCounts?.missing_issued_at ?? 0)
      });
    }

    if (Number(exceptionCounts?.missing_due_at ?? 0) > 0) {
      exceptions.push({
        code: "MISSING_DUE_AT",
        message: "Some reportable invoices do not have a due_at timestamp and are excluded from aging and DSO calculations.",
        source: "invoices",
        count: Number(exceptionCounts?.missing_due_at ?? 0)
      });
    }

    return {
      metadata: {
        workspaceId,
        asOf,
        currency: null,
        definitionVersion: "phase6-v1",
        generatedAt: nowIso(),
        dataCompleteness: exceptions.length > 0 ? "partial" : "complete",
        assumptions: [
          "Phase 6 treats invoice approval as issuance for the POC reporting model.",
          "Default POC payment terms are Net 30 unless future contract terms provide a due date.",
          "Currency amounts are separated; no FX conversion is inferred.",
          "Generated revenue schedules are shown as scheduled revenue, not posted accounting actuals."
        ],
        exceptions
      },
      kpis: {
        openAr,
        cashReceived,
        recognizedRevenue,
        deferredRevenue,
        activeContracts: Number(activeContractRows[0]?.count ?? 0),
        payableInvoices: Number(payableInvoiceRows[0]?.count ?? 0),
        reportingCurrencies: collectCurrencies([openAr, cashReceived, recognizedRevenue, deferredRevenue])
      }
    };
  } finally {
    await sql.end({ timeout: 5 });
  }
}
export async function getRevenueWaterfallReport(): Promise<RevenueWaterfallReport> {
  const workspaceId = getRequiredWorkspaceId();
  const sql = createSqlClient();
  const asOf = nowIso();

  try {
    const rows = await sql<WaterfallScheduleRow[]>`
      select
        to_char(date_trunc('month', recognition_date), 'YYYY-MM') as period,
        currency,
        status,
        recognized_amount,
        deferred_amount,
        case
          when (calculation_snapshot->>'allocationIndex')::int = 1 then coalesce((calculation_snapshot->>'originalAmount')::numeric, recognized_amount + deferred_amount)
          else 0
        end as schedule_addition
      from revenue_schedules
      where workspace_id = ${workspaceId}
        and status in ('generated', 'posted')
      order by period asc, currency asc
    `;

    const waterfall = buildRevenueWaterfall(rows);
    const exceptions: ReportException[] = [];

    if (rows.length === 0) {
      exceptions.push({
        code: "NO_REVENUE_SCHEDULES",
        message: "No generated or posted revenue schedules are available for the waterfall.",
        source: "revenue_schedules",
        count: 0
      });
    }

    return {
      metadata: {
        workspaceId,
        asOf,
        currency: null,
        definitionVersion: "phase6-v1",
        generatedAt: nowIso(),
        dataCompleteness: rows.length === 0 ? "unavailable" : exceptions.length > 0 ? "partial" : "complete",
        assumptions: [
          "Waterfall periods are grouped by revenue schedule recognition month.",
          "Schedule additions use originalAmount from the first persisted allocation row in each revenue schedule stream.",
          "Generated schedules are scheduled revenue, not posted accounting actuals.",
          "Currency amounts are separated; no FX conversion is inferred."
        ],
        exceptions
      },
      periods: waterfall.periods,
      currencies: waterfall.currencies
    };
  } finally {
    await sql.end({ timeout: 5 });
  }
}
async function getArAtDate(sql: ReturnType<typeof createSqlClient>, workspaceId: string, asOfDate: string) {
  return sql<ArAtDateRow[]>`
    select currency, coalesce(sum(greatest(outstanding, 0)), 0) as amount
    from (
      select
        i.currency,
        i.total - coalesce(payment_totals.amount_paid, 0) as outstanding
      from invoices i
      left join lateral (
        select coalesce(sum(pa.amount), 0) as amount_paid
        from payment_allocations pa
        join payments p on p.id = pa.payment_id
          and p.workspace_id = pa.workspace_id
        where pa.workspace_id = i.workspace_id
          and pa.invoice_id = i.id
          and p.status = 'received'
          and p.received_at::date <= ${asOfDate}::date
      ) payment_totals on true
      where i.workspace_id = ${workspaceId}
        and i.status in ('approved', 'issued', 'paid')
        and i.issued_at is not null
        and i.due_at is not null
        and i.issued_at::date <= ${asOfDate}::date
    ) ar
    group by currency
    order by currency
  `;
}

export async function getArAgingReport(): Promise<ArAgingReport> {
  const workspaceId = getRequiredWorkspaceId();
  const sql = createSqlClient();
  const asOf = nowIso();
  const asOfDate = asOf.slice(0, 10);

  try {
    const [bucketRows, creditRows, exceptionRows] = await Promise.all([
      sql<ArAgingRow[]>`
        select bucket, currency, coalesce(sum(outstanding), 0) as amount, count(*) as invoice_count
        from (
          select
            i.currency,
            i.total - coalesce(payment_totals.amount_paid, 0) as outstanding,
            case
              when i.due_at::date > ${asOfDate}::date then 'current'
              when (${asOfDate}::date - i.due_at::date) between 1 and 30 then '1-30'
              when (${asOfDate}::date - i.due_at::date) between 31 and 60 then '31-60'
              when (${asOfDate}::date - i.due_at::date) between 61 and 90 then '61-90'
              else '90+'
            end as bucket
          from invoices i
          left join lateral (
            select coalesce(sum(pa.amount), 0) as amount_paid
            from payment_allocations pa
            join payments p on p.id = pa.payment_id
              and p.workspace_id = pa.workspace_id
            where pa.workspace_id = i.workspace_id
              and pa.invoice_id = i.id
              and p.status = 'received'
              and p.received_at::date <= ${asOfDate}::date
          ) payment_totals on true
          where i.workspace_id = ${workspaceId}
            and i.status in ('approved', 'issued', 'paid')
            and i.issued_at is not null
            and i.due_at is not null
            and i.issued_at::date <= ${asOfDate}::date
        ) aged
        where outstanding > 0
        group by bucket, currency
        order by currency, bucket
      `,
      sql<ArCreditRow[]>`
        select currency, abs(coalesce(sum(outstanding), 0)) as amount, count(*) as invoice_count
        from (
          select
            i.currency,
            i.total - coalesce(payment_totals.amount_paid, 0) as outstanding
          from invoices i
          left join lateral (
            select coalesce(sum(pa.amount), 0) as amount_paid
            from payment_allocations pa
            join payments p on p.id = pa.payment_id
              and p.workspace_id = pa.workspace_id
            where pa.workspace_id = i.workspace_id
              and pa.invoice_id = i.id
              and p.status = 'received'
              and p.received_at::date <= ${asOfDate}::date
          ) payment_totals on true
          where i.workspace_id = ${workspaceId}
            and i.status in ('approved', 'issued', 'paid')
            and i.issued_at is not null
            and i.due_at is not null
            and i.issued_at::date <= ${asOfDate}::date
        ) credits
        where outstanding < 0
        group by currency
        order by currency
      `,
      sql<ExceptionCountRow[]>`
        select
          count(*) filter (where issued_at is null) as missing_issued_at,
          count(*) filter (where due_at is null) as missing_due_at
        from invoices
        where workspace_id = ${workspaceId}
          and status in ('approved', 'issued', 'paid')
      `
    ]);

    const buckets = buildAgingBuckets(bucketRows);
    const credits = buildAgingCredits(creditRows);
    const exceptionCounts = exceptionRows[0];
    const exceptions: ReportException[] = [];

    if (Number(exceptionCounts?.missing_due_at ?? 0) > 0) {
      exceptions.push({
        code: "MISSING_DUE_AT",
        message: "Some reportable invoices do not have a due_at timestamp and are excluded from AR aging.",
        source: "invoices",
        count: Number(exceptionCounts?.missing_due_at ?? 0)
      });
    }

    if (Number(exceptionCounts?.missing_issued_at ?? 0) > 0) {
      exceptions.push({
        code: "MISSING_ISSUED_AT",
        message: "Some reportable invoices do not have an issued_at timestamp and are excluded from AR aging.",
        source: "invoices",
        count: Number(exceptionCounts?.missing_issued_at ?? 0)
      });
    }

    const currencies = mergeCurrencies([buckets.map((item) => item.currency), credits.map((item) => item.currency)]);

    return {
      metadata: {
        workspaceId,
        asOf,
        currency: null,
        definitionVersion: "phase6-v1",
        generatedAt: nowIso(),
        dataCompleteness: exceptions.length > 0 ? "partial" : "complete",
        assumptions: [
          "AR aging uses issued/approved/paid invoices with issued_at and due_at present.",
          "Outstanding balance equals invoice total minus received payment applications through the as-of date.",
          "Negative outstanding balances are shown as credits or overpayments, not positive receivables.",
          "Currency amounts are separated; no FX conversion is inferred."
        ],
        exceptions
      },
      buckets,
      credits,
      currencies
    };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function getDsoReport(): Promise<DsoReport> {
  const workspaceId = getRequiredWorkspaceId();
  const sql = createSqlClient();
  const asOf = new Date();
  const asOfIso = asOf.toISOString();
  const closingDate = toDateOnly(asOf);
  const openingDate = toDateOnly(addDays(asOf, -90));
  const windowDays = 90;

  try {
    const [openingRows, closingRows, creditSalesRows, exceptionRows] = await Promise.all([
      getArAtDate(sql, workspaceId, openingDate),
      getArAtDate(sql, workspaceId, closingDate),
      sql<CreditSalesRow[]>`
        select currency, coalesce(sum(total), 0) as amount
        from invoices
        where workspace_id = ${workspaceId}
          and status in ('approved', 'issued', 'paid')
          and issued_at is not null
          and issued_at::date > ${openingDate}::date
          and issued_at::date <= ${closingDate}::date
        group by currency
        order by currency
      `,
      sql<ExceptionCountRow[]>`
        select
          count(*) filter (where issued_at is null) as missing_issued_at,
          count(*) filter (where due_at is null) as missing_due_at
        from invoices
        where workspace_id = ${workspaceId}
          and status in ('approved', 'issued', 'paid')
      `
    ]);

    const opening = amountMap(openingRows);
    const closing = amountMap(closingRows);
    const creditSales = amountMap(creditSalesRows);
    const currencies = mergeCurrencies([Array.from(opening.keys()), Array.from(closing.keys()), Array.from(creditSales.keys())]);
    const metrics: DsoMetric[] = currencies.map((currency) => {
      const openingAr = opening.get(currency) ?? 0;
      const closingAr = closing.get(currency) ?? 0;
      const averageAr = (openingAr + closingAr) / 2;
      const sales = creditSales.get(currency) ?? 0;
      const dsoDays = sales > 0 ? (averageAr / sales) * windowDays : null;

      return {
        currency,
        dsoDays,
        openingAr,
        closingAr,
        averageAr,
        creditSales: sales,
        windowDays,
        status: dsoDays === null ? "unavailable" : "available"
      };
    });
    const exceptionCounts = exceptionRows[0];
    const exceptions: ReportException[] = [];

    if (Number(exceptionCounts?.missing_issued_at ?? 0) > 0) {
      exceptions.push({
        code: "MISSING_ISSUED_AT",
        message: "Some reportable invoices do not have an issued_at timestamp and are excluded from POC DSO.",
        source: "invoices",
        count: Number(exceptionCounts?.missing_issued_at ?? 0)
      });
    }

    if (Number(exceptionCounts?.missing_due_at ?? 0) > 0) {
      exceptions.push({
        code: "MISSING_DUE_AT",
        message: "Some reportable invoices do not have a due_at timestamp and are excluded from opening and closing AR.",
        source: "invoices",
        count: Number(exceptionCounts?.missing_due_at ?? 0)
      });
    }

    const unavailableCount = metrics.filter((metric) => metric.status === "unavailable").length;
    if (unavailableCount > 0) {
      exceptions.push({
        code: "ZERO_CREDIT_SALES",
        message: "One or more currencies have zero credit sales in the 90-day DSO window, so DSO is unavailable rather than reported as zero.",
        source: "invoices",
        count: unavailableCount
      });
    }

    return {
      metadata: {
        workspaceId,
        asOf: asOfIso,
        currency: null,
        definitionVersion: "phase6-v1",
        generatedAt: nowIso(),
        dataCompleteness: metrics.length === 0 ? "unavailable" : exceptions.length > 0 ? "partial" : "complete",
        assumptions: [
          "POC DSO uses the 90 calendar days ending on the as-of date.",
          "Average AR uses a two-point average: opening AR plus closing AR divided by two.",
          "All issued POC invoices in the window are treated as credit sales.",
          "Tax, credit notes, write-offs, reversals, and FX conversion are excluded until those records exist."
        ],
        exceptions
      },
      metrics,
      currencies
    };
  } finally {
    await sql.end({ timeout: 5 });
  }
}
export async function getRecurringRevenueReport(): Promise<RecurringRevenueReport> {
  const workspaceId = getRequiredWorkspaceId();
  const sql = createSqlClient();
  const asOf = nowIso();
  const asOfDate = asOf.slice(0, 10);

  try {
    const rows = await sql<RecurringRevenueLineRow[]>`
      select
        c.id as customer_id,
        c.name as customer_name,
        ct.id as contract_id,
        cli.id as contract_line_item_id,
        cli.name as line_item_name,
        p.name as product_name,
        pl.name as plan_name,
        pl.billing_interval,
        pr.pricing_model,
        pr.unit_price,
        pr.currency
      from contracts ct
      join customers c on c.id = ct.customer_id
        and c.workspace_id = ct.workspace_id
      join lateral (
        select cv.id
        from contract_versions cv
        where cv.workspace_id = ct.workspace_id
          and cv.contract_id = ct.id
          and cv.effective_from <= ${asOfDate}::date
          and (cv.effective_to is null or cv.effective_to >= ${asOfDate}::date)
        order by cv.version_number desc
        limit 1
      ) current_version on true
      join contract_line_items cli on cli.workspace_id = ct.workspace_id
        and cli.contract_version_id = current_version.id
      join price_rules pr on pr.workspace_id = ct.workspace_id
        and pr.id = cli.price_rule_id
      join plans pl on pl.workspace_id = ct.workspace_id
        and pl.id = pr.plan_id
      join products p on p.workspace_id = ct.workspace_id
        and p.id = pl.product_id
      where ct.workspace_id = ${workspaceId}
        and ct.status = 'active'
        and ct.start_date <= ${asOfDate}::date
        and (ct.end_date is null or ct.end_date >= ${asOfDate}::date)
        and pl.status = 'active'
        and p.status = 'active'
      order by c.name asc, ct.created_at desc, cli.created_at asc
    `;

    const includedLines: RecurringRevenueIncludedLine[] = [];
    const excludedLines: RecurringRevenueExcludedLine[] = [];

    for (const row of rows) {
      if (row.pricing_model === "flat") {
        const committedAmount = Number(row.unit_price ?? 0);
        const mrr = normalizeMrr(committedAmount, row.billing_interval);
        includedLines.push({
          customerId: row.customer_id,
          customerName: row.customer_name,
          contractId: row.contract_id,
          contractLineItemId: row.contract_line_item_id,
          lineItemName: row.line_item_name,
          productName: row.product_name,
          planName: row.plan_name,
          billingInterval: row.billing_interval,
          currency: row.currency,
          committedAmount,
          mrr,
          arr: mrr * 12
        });
        continue;
      }

      excludedLines.push({
        customerId: row.customer_id,
        customerName: row.customer_name,
        contractId: row.contract_id,
        contractLineItemId: row.contract_line_item_id,
        lineItemName: row.line_item_name,
        productName: row.product_name,
        planName: row.plan_name,
        pricingModel: row.pricing_model,
        currency: row.currency,
        reason: exclusionReason(row.pricing_model)
      });
    }

    const totals = buildRecurringTotals(includedLines, excludedLines);
    const exceptions: ReportException[] = [];

    if (includedLines.length === 0) {
      exceptions.push({
        code: "NO_COMMITTED_RECURRING_LINES",
        message: "No active flat recurring contract lines are available for MRR and ARR.",
        source: "contract_line_items",
        count: 0
      });
    }

    if (excludedLines.length > 0) {
      exceptions.push({
        code: "USAGE_PRICED_LINES_EXCLUDED",
        message: "Usage-priced contract lines are excluded from committed MRR/ARR until explicit minimum commitments exist.",
        source: "contract_line_items",
        count: excludedLines.length
      });
    }

    return {
      metadata: {
        workspaceId,
        asOf,
        currency: null,
        definitionVersion: "phase6-v1",
        generatedAt: nowIso(),
        dataCompleteness: includedLines.length === 0 ? "unavailable" : exceptions.length > 0 ? "partial" : "complete",
        assumptions: [
          "MRR uses active contracts and the latest effective contract version as of the report date.",
          "Only flat recurring price rules are included in committed recurring revenue.",
          "Annual flat charges are divided by 12; monthly flat charges are used as-is.",
          "ARR is annualized committed recurring revenue, calculated as MRR multiplied by 12.",
          "Usage, tiered, invoice totals, historical usage, forecasts, and one-time charges are not substituted for commitments."
        ],
        exceptions
      },
      totals,
      includedLines,
      excludedLines,
      currencies: totals.map((total) => total.currency)
    };
  } finally {
    await sql.end({ timeout: 5 });
  }
}