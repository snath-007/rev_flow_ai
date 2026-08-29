import type { ReactNode } from "react";
import type { ArAgingBucket, ArAgingReport, CurrencyAmount, DsoReport, RecurringRevenueReport, ReportOverview, RevenueWaterfallPeriod, RevenueWaterfallReport } from "@revflow/shared";

import { getArAgingReport, getAuthenticationContext, getDsoReport, getRecurringRevenueReport, getReportOverview, getRevenueWaterfallReport } from "@/lib/api-client";
import { hasCapability } from "@/lib/access";

import { PermissionNotice } from "../permission-notice";
import { EvidenceStrip, NextAction, WorkflowGuide, WorkflowPageHeader } from "../workflow-components";
import { WorkspaceShell } from "../workspace-shell";

const agingBucketOrder: ArAgingBucket[] = ["current", "1-30", "31-60", "61-90", "90+"];

function formatCurrency(currency: string, value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

function formatPeriod(value: string) {
  const [year, month] = value.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}


function formatPricingModel(value: string) {
  if (value === "per_unit") return "Per-unit usage";
  if (value === "tiered") return "Tiered usage";
  if (value === "flat") return "Flat recurring";
  return value.replace(/_/g, " ");
}

function ReportSection({ children, eyebrow, title }: { children: ReactNode; eyebrow: string; title: string }) {
  return (
    <section className="report-section-block">
      <div className="report-section-heading">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}
function totalAmounts(items: CurrencyAmount[]) {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

function AmountList({ emptyLabel, items }: { emptyLabel: string; items: CurrencyAmount[] }) {
  if (items.length === 0) {
    return <span className="muted-text">{emptyLabel}</span>;
  }

  return (
    <div className="report-currency-list">
      {items.map((item) => <strong key={item.currency}>{formatCurrency(item.currency, item.amount)}</strong>)}
    </div>
  );
}

function ReportMetricCard({ detail, items, label }: { detail: string; items: CurrencyAmount[]; label: string }) {
  const max = Math.max(...items.map((item) => item.amount), 1);

  return (
    <article className="report-metric-card">
      <p className="eyebrow">{label}</p>
      <AmountList emptyLabel="No source records" items={items} />
      <span>{detail}</span>
      <div className="report-mini-bars" aria-label={`${label} by currency`}>
        {items.length === 0 ? <i style={{ width: "8%" }} /> : items.map((item) => <i key={item.currency} style={{ width: `${Math.max(8, (item.amount / max) * 100)}%` }} />)}
      </div>
    </article>
  );
}

function ReadinessPanel({ aging, dso, overview, recurring, waterfall }: { aging: ArAgingReport; dso: DsoReport; overview: ReportOverview; recurring: RecurringRevenueReport; waterfall: RevenueWaterfallReport }) {
  const assumptions = Array.from(new Set([...overview.metadata.assumptions, ...waterfall.metadata.assumptions, ...aging.metadata.assumptions, ...dso.metadata.assumptions, ...recurring.metadata.assumptions]));
  const exceptions = Array.from(new Map([...overview.metadata.exceptions, ...waterfall.metadata.exceptions, ...aging.metadata.exceptions, ...dso.metadata.exceptions, ...recurring.metadata.exceptions].map((item) => [`${item.code}-${item.source ?? "report"}-${item.message}`, item])).values());
  const visibleAssumptions = assumptions.slice(0, 4);
  const visibleExceptions = exceptions.slice(0, 4);

  return (
    <section className="data-panel report-readiness-panel">
      <div className="report-readiness-strip">
        <div>
          <span>Definition</span>
          <strong>{overview.metadata.definitionVersion}</strong>
        </div>
        <div>
          <span>Generated</span>
          <strong>{new Date(overview.metadata.generatedAt).toLocaleString()}</strong>
        </div>
        <div>
          <span>Exceptions</span>
          <strong>{exceptions.length}</strong>
        </div>
        <span className={`status-badge status-${overview.metadata.dataCompleteness}`}>{overview.metadata.dataCompleteness}</span>
      </div>
      <div className="report-readiness-cards">
        <article>
          <div><p className="eyebrow">Assumptions</p><strong>{assumptions.length}</strong></div>
          <ul>{visibleAssumptions.map((item) => <li key={item}>{item}</li>)}</ul>
          {assumptions.length > visibleAssumptions.length ? <span>{assumptions.length - visibleAssumptions.length} more assumptions apply.</span> : null}
        </article>
        <article>
          <div><p className="eyebrow">Exceptions</p><strong>{exceptions.length}</strong></div>
          {exceptions.length === 0 ? <p className="muted-text">No report exceptions detected.</p> : <ul>{visibleExceptions.map((item) => <li key={`${item.code}-${item.source ?? "report"}`}><strong>{item.code.replace(/_/g, " ")}</strong>{item.count === undefined ? null : ` (${item.count})`}</li>)}</ul>}
          {exceptions.length > visibleExceptions.length ? <span>{exceptions.length - visibleExceptions.length} more exceptions apply.</span> : null}
        </article>
      </div>
    </section>
  );
}

function WaterfallBars({ periods }: { periods: RevenueWaterfallPeriod[] }) {
  const max = Math.max(...periods.map((period) => Math.max(period.scheduleAdditions, period.recognizedRevenue, period.closingDeferred)), 1);

  if (periods.length === 0) {
    return <div className="blocked-notice" role="note"><strong>No waterfall yet</strong><span>Generate revenue schedules from approved invoices to populate the waterfall.</span></div>;
  }

  return (
    <div className="waterfall-bars" aria-label="Revenue waterfall period comparison">
      {periods.map((period) => (
        <article className="waterfall-period-card" key={`${period.currency}-${period.period}`}>
          <div><strong>{formatPeriod(period.period)}</strong><span>{period.currency}</span></div>
          <dl>
            <div><dt>Add</dt><dd>{formatCurrency(period.currency, period.scheduleAdditions)}</dd></div>
            <div><dt>Recognize</dt><dd>{formatCurrency(period.currency, period.recognizedRevenue)}</dd></div>
            <div><dt>Close</dt><dd>{formatCurrency(period.currency, period.closingDeferred)}</dd></div>
          </dl>
          <div className="waterfall-bar-stack">
            <i className="additions" style={{ width: `${Math.max(6, (period.scheduleAdditions / max) * 100)}%` }} />
            <i className="recognized" style={{ width: `${Math.max(6, (period.recognizedRevenue / max) * 100)}%` }} />
            <i className="closing" style={{ width: `${Math.max(6, (period.closingDeferred / max) * 100)}%` }} />
          </div>
        </article>
      ))}
    </div>
  );
}

function WaterfallTable({ periods }: { periods: RevenueWaterfallPeriod[] }) {
  if (periods.length === 0) return null;

  return (
    <div className="data-table-scroll report-waterfall-table">
      <table>
        <thead><tr><th>Period</th><th>Currency</th><th>Opening deferred</th><th>Additions</th><th>Recognized</th><th>Closing deferred</th><th>Generated</th><th>Posted</th><th>Schedules</th></tr></thead>
        <tbody>{periods.map((period) => <tr key={`${period.currency}-${period.period}`}><td>{formatPeriod(period.period)}</td><td>{period.currency}</td><td>{formatCurrency(period.currency, period.openingDeferred)}</td><td>{formatCurrency(period.currency, period.scheduleAdditions)}</td><td>{formatCurrency(period.currency, period.recognizedRevenue)}</td><td>{formatCurrency(period.currency, period.closingDeferred)}</td><td>{formatCurrency(period.currency, period.generatedAmount)}</td><td>{formatCurrency(period.currency, period.postedAmount)}</td><td>{period.scheduleCount}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function RevenueWaterfallPanel({ report }: { report: RevenueWaterfallReport }) {
  return (
    <section className="data-panel report-waterfall-panel">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">Scheduled revenue</p>
          <h2>Revenue waterfall</h2>
          <p>Opening deferred plus schedule additions minus scheduled recognized revenue equals closing deferred.</p>
        </div>
        <span className={`status-badge status-${report.metadata.dataCompleteness}`}>{report.metadata.dataCompleteness}</span>
      </div>
      <WaterfallBars periods={report.periods} />
      <WaterfallTable periods={report.periods} />
    </section>
  );
}

function AgingPanel({ report }: { report: ArAgingReport }) {
  const max = Math.max(...report.buckets.map((bucket) => bucket.amount), 1);

  return (
    <section className="data-panel report-aging-panel">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">Receivables</p>
          <h2>AR aging</h2>
          <p>Outstanding invoice balances grouped by due-date age and currency.</p>
        </div>
        <span className={`status-badge status-${report.metadata.dataCompleteness}`}>{report.metadata.dataCompleteness}</span>
      </div>
      {report.buckets.length === 0 ? <div className="blocked-notice" role="note"><strong>No open receivables</strong><span>Approved or issued invoices with open balances will appear by aging bucket.</span></div> : <div className="aging-bucket-grid">{agingBucketOrder.map((bucket) => {
        const rows = report.buckets.filter((item) => item.bucket === bucket);
        const total = rows.reduce((sum, item) => sum + item.amount, 0);
        return <article className="aging-bucket-card" key={bucket}><p>{bucket}</p><strong>{total === 0 ? "-" : rows.map((item) => formatCurrency(item.currency, item.amount)).join(" / ")}</strong><div>{rows.length === 0 ? <i style={{ width: "6%" }} /> : rows.map((item) => <i key={item.currency} style={{ width: `${Math.max(6, (item.amount / max) * 100)}%` }} />)}</div><span>{rows.reduce((sum, item) => sum + item.invoiceCount, 0)} invoices</span></article>;
      })}</div>}
      {report.credits.length > 0 ? <div className="report-credit-strip"><strong>Credits / overpayments</strong>{report.credits.map((item) => <span key={item.currency}>{formatCurrency(item.currency, item.amount)} across {item.invoiceCount} invoices</span>)}</div> : null}
    </section>
  );
}

function RecurringRevenuePanel({ report }: { report: RecurringRevenueReport }) {
  const maxMrr = Math.max(...report.totals.map((total) => total.mrr), 1);

  return (
    <section className="data-panel report-recurring-panel">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">Committed revenue</p>
          <h2>MRR and ARR</h2>
          <p>Flat recurring contract commitments normalized by billing interval and separated by currency.</p>
        </div>
        <span className={`status-badge status-${report.metadata.dataCompleteness}`}>{report.metadata.dataCompleteness}</span>
      </div>
      {report.totals.length === 0 ? <div className="blocked-notice" role="note"><strong>No committed recurring revenue</strong><span>Add flat recurring contract lines to active contracts to populate MRR and ARR.</span></div> : <div className="recurring-total-grid">{report.totals.map((total) => <article className="recurring-total-card" key={total.currency}><p className="eyebrow">{total.currency}</p><strong>{formatCurrency(total.currency, total.mrr)} MRR</strong><span>{formatCurrency(total.currency, total.arr)} annualized ARR</span><div><i style={{ width: `${Math.max(6, (total.mrr / maxMrr) * 100)}%` }} /></div><small>{total.includedLineCount} included / {total.excludedLineCount} excluded</small></article>)}</div>}
      {report.includedLines.length > 0 ? <div className="data-table-scroll recurring-table"><table><thead><tr><th>Customer</th><th>Contract line</th><th>Plan</th><th>Interval</th><th>Committed</th><th>MRR</th><th>ARR</th></tr></thead><tbody>{report.includedLines.map((line) => <tr key={line.contractLineItemId}><td><strong>{line.customerName}</strong></td><td>{line.lineItemName}</td><td>{line.productName} / {line.planName}</td><td>{line.billingInterval}</td><td>{formatCurrency(line.currency, line.committedAmount)}</td><td>{formatCurrency(line.currency, line.mrr)}</td><td>{formatCurrency(line.currency, line.arr)}</td></tr>)}</tbody></table></div> : null}
      {report.excludedLines.length > 0 ? <div className="recurring-exclusion-list"><strong>Excluded from MRR/ARR</strong>{report.excludedLines.slice(0, 4).map((line) => <span key={line.contractLineItemId}>{line.customerName}: {line.lineItemName} ({formatPricingModel(line.pricingModel)})</span>)}</div> : null}
    </section>
  );
}

function DsoPanel({ report }: { report: DsoReport }) {
  return (
    <section className="data-panel report-dso-panel">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">POC DSO</p>
          <h2>Days sales outstanding</h2>
          <p>Two-point average AR divided by credit sales over the 90-day POC window.</p>
        </div>
        <span className={`status-badge status-${report.metadata.dataCompleteness}`}>{report.metadata.dataCompleteness}</span>
      </div>
      {report.metrics.length === 0 ? <div className="blocked-notice" role="note"><strong>DSO unavailable</strong><span>Issued invoices with credit sales in the report window are required before DSO can be calculated.</span></div> : <div className="dso-card-grid">{report.metrics.map((metric) => <article className="dso-card" key={metric.currency}><p className="eyebrow">{metric.currency}</p><strong>{metric.dsoDays === null ? "Unavailable" : `${formatNumber(metric.dsoDays)} days`}</strong><dl><div><dt>Opening AR</dt><dd>{formatCurrency(metric.currency, metric.openingAr)}</dd></div><div><dt>Closing AR</dt><dd>{formatCurrency(metric.currency, metric.closingAr)}</dd></div><div><dt>Average AR</dt><dd>{formatCurrency(metric.currency, metric.averageAr)}</dd></div><div><dt>Credit sales</dt><dd>{formatCurrency(metric.currency, metric.creditSales)}</dd></div></dl><span>{metric.status === "available" ? `${metric.windowDays}-day window` : "Zero credit sales in window"}</span></article>)}</div>}
    </section>
  );
}

export default async function ReportsPage() {
  const [context, overview, waterfall, aging, dso, recurring] = await Promise.all([getAuthenticationContext(), getReportOverview(), getRevenueWaterfallReport(), getArAgingReport(), getDsoReport(), getRecurringRevenueReport()]);
  const canReadReports = context.status === "ready" && hasCapability(context.actor, "reports.read");
  const hasRevenue = totalAmounts(overview.kpis.recognizedRevenue) + totalAmounts(overview.kpis.deferredRevenue) > 0;
  const hasReceivables = totalAmounts(overview.kpis.openAr) + totalAmounts(overview.kpis.cashReceived) > 0;

  return (
    <WorkspaceShell activePath="/reports">
      <main className="workspace-page page-grid">
        <WorkflowPageHeader
          breadcrumbs={[{ href: "/overview", label: "Overview" }, { label: "Reports" }]}
          eyebrow="Recognize"
          title="Tenant-aware reporting"
          description="Inspect finance summaries that stay tied to explicit workspace records, currency boundaries, and visible POC assumptions."
        />

        <WorkflowGuide
          title="Reporting flow"
          items={[
            { href: "/invoices", label: "Invoice dates", detail: aging.metadata.exceptions.some((item) => item.code.includes("DUE")) ? "exceptions" : "ready", status: aging.metadata.exceptions.length === 0 ? "done" : "active" },
            { href: "/payments", label: "Cash evidence", detail: `${overview.kpis.cashReceived.length} currencies`, status: hasReceivables ? "done" : "idle" },
            { href: "/revenue", label: "Revenue schedules", detail: `${waterfall.periods.length} periods`, status: hasRevenue ? "done" : "blocked" },
            { label: "Reports", detail: dso.metadata.dataCompleteness, status: dso.metadata.dataCompleteness === "complete" ? "done" : "active" }
          ]}
        />

        {!canReadReports ? <PermissionNotice capability="reports.read" label="Reporting" /> : null}

        <EvidenceStrip
          items={[
            { label: "Currencies", value: overview.kpis.reportingCurrencies.length || "None" },
            { label: "Waterfall periods", value: waterfall.periods.length },
            { label: "AR buckets", value: aging.buckets.length },
            { label: "DSO currencies", value: dso.metrics.length },
            { label: "MRR currencies", value: recurring.totals.length }
          ]}
        />

        <ReportSection eyebrow="Snapshot" title="Finance posture">
          <section className="reports-metric-grid" aria-label="Finance report overview">
            <ReportMetricCard detail="approved or issued invoice balances with payment applications applied" items={overview.kpis.openAr} label="Open AR" />
            <ReportMetricCard detail="received payments through the report as-of timestamp" items={overview.kpis.cashReceived} label="Cash received" />
            <ReportMetricCard detail="generated or posted schedules through the report as-of date" items={overview.kpis.recognizedRevenue} label="Recognized revenue" />
            <ReportMetricCard detail="deferred amount remaining on generated or posted schedules" items={overview.kpis.deferredRevenue} label="Deferred revenue" />
          </section>
        </ReportSection>

        <ReportSection eyebrow="Revenue" title="Recognition and commitments">
          <RevenueWaterfallPanel report={waterfall} />
          <RecurringRevenuePanel report={recurring} />
        </ReportSection>

        <ReportSection eyebrow="Receivables" title="Collections and aging">
          <section className="two-column report-receivables-grid">
            <AgingPanel report={aging} />
            <DsoPanel report={dso} />
          </section>
        </ReportSection>

        <ReportSection eyebrow="Controls" title="Definitions and exceptions">
          <ReadinessPanel aging={aging} dso={dso} overview={overview} recurring={recurring} waterfall={waterfall} />
        </ReportSection>
        <NextAction href="/audit" title="Next: integration and export boundaries">Use export boundaries to package customers, invoices, payments, revenue schedules, and reporting evidence for external systems.</NextAction>
      </main>
    </WorkspaceShell>
  );
}