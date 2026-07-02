"use client";

import type { Invoice, JournalEntry, JournalEntryStatus, RevenueSchedule, RevenueScheduleStatus } from "@revflow/shared";
import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type RevenueTab = "schedules" | "journals";
type ScheduleStatusFilter = "all" | RevenueScheduleStatus;
type JournalStatusFilter = "all" | JournalEntryStatus;

type RevenueWorkspaceProps = {
  canGenerate: boolean;
  invoices: Invoice[];
  schedules: RevenueSchedule[];
  journalEntries: JournalEntry[];
};

const scheduleStatuses: ScheduleStatusFilter[] = ["all", "draft", "generated", "posted", "void"];
const journalStatuses: JournalStatusFilter[] = ["all", "draft", "posted", "void"];

function csvEscape(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function includesTerm(values: (string | number | null | undefined)[], term: string) {
  return values.some((value) => String(value ?? "").toLowerCase().includes(term));
}

function formatCurrency(currency: string, value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Open";
  return new Date(value).toLocaleDateString();
}

export function RevenueWorkspace({ canGenerate, invoices, schedules, journalEntries }: RevenueWorkspaceProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<RevenueTab>("schedules");
  const [query, setQuery] = useState("");
  const [scheduleStatus, setScheduleStatus] = useState<ScheduleStatusFilter>("all");
  const [journalStatus, setJournalStatus] = useState<JournalStatusFilter>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const approvedInvoices = useMemo(() => invoices.filter((invoice) => invoice.status === "approved"), [invoices]);
  const term = query.trim().toLowerCase();
  const filteredSchedules = useMemo(() => schedules.filter((schedule) => {
    const statusMatches = scheduleStatus === "all" || schedule.status === scheduleStatus;
    const termMatches = !term || includesTerm([schedule.customerName, schedule.invoiceId, schedule.recognitionMethod, schedule.status, schedule.currency, schedule.recognizedAmount, schedule.deferredAmount], term);
    return statusMatches && termMatches;
  }), [scheduleStatus, schedules, term]);
  const filteredJournals = useMemo(() => journalEntries.filter((entry) => {
    const statusMatches = journalStatus === "all" || entry.status === journalStatus;
    const termMatches = !term || includesTerm([entry.customerName, entry.invoiceId, entry.status, entry.debitAccount, entry.creditAccount, entry.memo, entry.amount, entry.currency], term);
    return statusMatches && termMatches;
  }), [journalEntries, journalStatus, term]);

  const activeCount = activeTab === "schedules" ? filteredSchedules.length : filteredJournals.length;
  const totalCount = activeTab === "schedules" ? schedules.length : journalEntries.length;
  const currency = filteredSchedules[0]?.currency ?? schedules[0]?.currency ?? filteredJournals[0]?.currency ?? journalEntries[0]?.currency ?? "USD";
  const recognizedAmount = filteredSchedules.reduce((sum, schedule) => sum + schedule.recognizedAmount, 0);
  const deferredAmount = filteredSchedules.reduce((sum, schedule) => sum + schedule.deferredAmount, 0);
  const journalAmount = filteredJournals.reduce((sum, entry) => sum + entry.amount, 0);
  const splitTotal = Math.max(recognizedAmount + deferredAmount, 1);
  const maxMethodValue = Math.max(...methodMix(schedules).map((item) => item.value), 1);

  function generateDisabledReason() {
    if (!canGenerate) return "Missing revenue.generate permission";
    if (approvedInvoices.length === 0) return "Approve an invoice first";
    return null;
  }

  function exportActiveTab() {
    if (activeTab === "schedules") {
      downloadCsv("revflow-revenue-schedules.csv", [["Customer", "Invoice", "Status", "Method", "Period start", "Period end", "Recognition date", "Recognized", "Deferred", "Currency", "Created"], ...filteredSchedules.map((schedule) => [schedule.customerName, schedule.invoiceId, schedule.status, schedule.recognitionMethod, schedule.periodStart, schedule.periodEnd, schedule.recognitionDate, schedule.recognizedAmount, schedule.deferredAmount, schedule.currency, schedule.createdAt])]);
      return;
    }

    downloadCsv("revflow-journal-entries.csv", [["Customer", "Invoice", "Status", "Entry date", "Debit", "Credit", "Amount", "Currency", "Memo", "Posted"], ...filteredJournals.map((entry) => [entry.customerName, entry.invoiceId, entry.status, entry.entryDate, entry.debitAccount, entry.creditAccount, entry.amount, entry.currency, entry.memo, entry.postedAt])]);
  }

  async function submitGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/revenue/schedules/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invoiceId: String(formData.get("invoiceId") ?? "") })
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? "Could not generate revenue schedules");
      }

      toast.success("Revenue schedules generated", { description: "Journal evidence was created from the approved invoice." });
      setIsModalOpen(false);
      setActiveTab("schedules");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast.error("Revenue generation failed", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  const disabledReason = generateDisabledReason();
  const methods = methodMix(schedules);

  return (
    <section className="revenue-workspace-stack">
      <div className="revenue-insight-grid">
        <article className="revenue-insight-card revenue-split-card">
          <p className="eyebrow">Recognition split</p>
          <strong>{formatCurrency(currency, recognizedAmount)}</strong>
          <span>recognized in the current schedule view</span>
          <div className="revenue-split-bar" aria-label="Recognized and deferred split"><i style={{ width: `${Math.max(4, (recognizedAmount / splitTotal) * 100)}%` }} /><b style={{ width: `${Math.max(4, (deferredAmount / splitTotal) * 100)}%` }} /></div>
          <small>{formatCurrency(currency, deferredAmount)} deferred</small>
        </article>
        <article className="revenue-insight-card revenue-method-card">
          <p className="eyebrow">Method mix</p>
          {methods.length === 0 ? <span>No recognition methods yet.</span> : methods.map((item) => <div className="revenue-method-row" key={item.label}><span>{item.label.replace("_", " ")}</span><div><i style={{ width: `${Math.max(8, (item.value / maxMethodValue) * 100)}%` }} /></div><strong>{formatCurrency(currency, item.value)}</strong></div>)}
        </article>
        <article className="revenue-insight-card">
          <p className="eyebrow">Journal evidence</p>
          <strong>{formatCurrency(currency, journalAmount)}</strong>
          <span>{filteredJournals.length} journal entries in the current view</span>
        </article>
      </div>

      <section className="data-panel revenue-workspace">
        <div className="data-toolbar">
          <div>
            <h2>Revenue ledger</h2>
            <span>{activeCount} of {totalCount} {activeTab} shown</span>
          </div>
          <div className="data-toolbar-actions revenue-toolbar-actions">
            <label className="data-search" htmlFor="revenue-search">
              <span>Search</span>
              <input id="revenue-search" onChange={(event) => setQuery(event.target.value)} placeholder={activeTab === "schedules" ? "Customer, method, status" : "Account, customer, memo"} value={query} />
            </label>
            <label className="data-filter" htmlFor="revenue-status-filter">
              <span>Status</span>
              {activeTab === "schedules" ? <select id="revenue-status-filter" onChange={(event) => setScheduleStatus(event.target.value as ScheduleStatusFilter)} value={scheduleStatus}>{scheduleStatuses.map((status) => <option key={status} value={status}>{status === "all" ? "All" : status}</option>)}</select> : <select id="revenue-status-filter" onChange={(event) => setJournalStatus(event.target.value as JournalStatusFilter)} value={journalStatus}>{journalStatuses.map((status) => <option key={status} value={status}>{status === "all" ? "All" : status}</option>)}</select>}
            </label>
            <button className="secondary-command" disabled={activeCount === 0} onClick={exportActiveTab} type="button">Export CSV</button>
            <button className="primary-link data-primary-action" disabled={Boolean(disabledReason)} onClick={() => { setError(null); setIsModalOpen(true); }} title={disabledReason ?? undefined} type="button">Generate schedules</button>
          </div>
        </div>

        <div className="data-tabs" role="tablist" aria-label="Revenue tables">
          <button aria-selected={activeTab === "schedules"} className={activeTab === "schedules" ? "active" : ""} onClick={() => { setActiveTab("schedules"); setQuery(""); }} role="tab" type="button"><span>Schedules</span><strong>{schedules.length}</strong></button>
          <button aria-selected={activeTab === "journals"} className={activeTab === "journals" ? "active" : ""} onClick={() => { setActiveTab("journals"); setQuery(""); }} role="tab" type="button"><span>Journal entries</span><strong>{journalEntries.length}</strong></button>
        </div>

        {activeTab === "schedules" ? <SchedulesTable schedules={filteredSchedules} /> : <JournalsTable journalEntries={filteredJournals} />}

        {isModalOpen ? (
          <div className="data-modal-backdrop" role="presentation">
            <section aria-labelledby="revenue-generate-title" aria-modal="true" className="data-modal" role="dialog">
              <div className="panel-title-row">
                <div>
                  <p className="eyebrow">Recognize</p>
                  <h2 id="revenue-generate-title">Generate revenue schedules</h2>
                  <p>Create deterministic recognition schedules and journal evidence from an approved invoice.</p>
                </div>
                <button aria-label="Close revenue modal" className="secondary-command" onClick={() => setIsModalOpen(false)} type="button">Close</button>
              </div>
              <form className="data-modal-form" onSubmit={submitGenerate}>
                <div>
                  <label htmlFor="revenue-invoice">Approved invoice</label>
                  <select id="revenue-invoice" name="invoiceId" required>
                    <option value="">Select invoice</option>
                    {approvedInvoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.customerName ?? invoice.customerId} - {formatCurrency(invoice.currency, invoice.total)}</option>)}
                  </select>
                </div>
                <div className="consequence-note">Generation creates the recognition schedule rows and journal evidence used by audit.</div>
                {error ? <p className="error-text">{error}</p> : null}
                <div className="data-modal-actions">
                  <span>{disabledReason ?? "Schedules and journals appear after generation."}</span>
                  <button disabled={isSubmitting || Boolean(disabledReason)} type="submit">{isSubmitting ? "Generating..." : "Generate schedules"}</button>
                </div>
              </form>
            </section>
          </div>
        ) : null}
      </section>
    </section>
  );
}

function methodMix(schedules: RevenueSchedule[]) {
  const totals = new Map<string, number>();
  for (const schedule of schedules) {
    totals.set(schedule.recognitionMethod, (totals.get(schedule.recognitionMethod) ?? 0) + schedule.recognizedAmount);
  }
  return [...totals.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 4);
}

function SchedulesTable({ schedules }: { schedules: RevenueSchedule[] }) {
  if (schedules.length === 0) return <div className="blocked-notice" role="note"><strong>No schedules found</strong><span>Generate schedules from an approved invoice or adjust filters.</span></div>;

  return <div className="data-table-scroll"><table><thead><tr><th>Status</th><th>Customer</th><th>Method</th><th>Period</th><th>Recognized</th><th>Deferred</th><th>Source</th></tr></thead><tbody>{schedules.map((schedule) => <tr key={schedule.id}><td><span className={`status-badge status-${schedule.status}`}>{schedule.status}</span></td><td><strong>{schedule.customerName ?? "Unknown customer"}</strong></td><td>{schedule.recognitionMethod.replace("_", " ")}</td><td>{formatDate(schedule.periodStart)} - {formatDate(schedule.periodEnd)}</td><td>{formatCurrency(schedule.currency, schedule.recognizedAmount)}</td><td>{formatCurrency(schedule.currency, schedule.deferredAmount)}</td><td><a href={`/invoices/${schedule.invoiceId}`}>Invoice</a></td></tr>)}</tbody></table></div>;
}

function JournalsTable({ journalEntries }: { journalEntries: JournalEntry[] }) {
  if (journalEntries.length === 0) return <div className="blocked-notice" role="note"><strong>No journal entries found</strong><span>Generate schedules to create journal evidence, or adjust filters.</span></div>;

  return <div className="data-table-scroll"><table><thead><tr><th>Status</th><th>Customer</th><th>Date</th><th>Debit</th><th>Credit</th><th>Amount</th><th>Memo</th></tr></thead><tbody>{journalEntries.map((entry) => <tr key={entry.id}><td><span className={`status-badge status-${entry.status}`}>{entry.status}</span></td><td><strong>{entry.customerName ?? "Unknown customer"}</strong></td><td>{formatDate(entry.entryDate)}</td><td>{entry.debitAccount}</td><td>{entry.creditAccount}</td><td>{formatCurrency(entry.currency, entry.amount)}</td><td>{entry.memo ?? <span className="muted-text">No memo</span>}</td></tr>)}</tbody></table></div>;
}