"use client";

import type { ContractSummary, Invoice, InvoiceStatus } from "@revflow/shared";
import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type InvoiceAction = "generate" | "approve";
type StatusFilter = "all" | InvoiceStatus;

type InvoicesWorkspaceProps = {
  canGenerate: boolean;
  canApprove: boolean;
  contracts: ContractSummary[];
  invoices: Invoice[];
};

const statusOptions: StatusFilter[] = ["all", "draft", "approved", "issued", "paid", "void", "credited"];

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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function monthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export function InvoicesWorkspace({ canGenerate, canApprove, contracts, invoices }: InvoicesWorkspaceProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [modalAction, setModalAction] = useState<InvoiceAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const defaults = useMemo(() => monthBounds(), []);

  const activeContracts = useMemo(() => contracts.filter((contract) => contract.status === "active"), [contracts]);
  const draftInvoices = useMemo(() => invoices.filter((invoice) => invoice.status === "draft"), [invoices]);
  const approvedInvoices = useMemo(() => invoices.filter((invoice) => invoice.status === "approved"), [invoices]);
  const term = query.trim().toLowerCase();

  const filtered = useMemo(() => invoices.filter((invoice) => {
    const statusMatches = status === "all" || invoice.status === status;
    const termMatches = !term || includesTerm([invoice.customerName, invoice.customerId, invoice.status, invoice.currency, invoice.total, invoice.periodStart, invoice.periodEnd], term);
    return statusMatches && termMatches;
  }), [invoices, status, term]);

  const filteredTotal = filtered.reduce((sum, invoice) => sum + invoice.total, 0);
  const draftTotal = draftInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const approvedTotal = approvedInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const currency = filtered[0]?.currency ?? invoices[0]?.currency ?? "USD";
  const maxStateTotal = Math.max(draftTotal, approvedTotal, 1);

  function generateDisabledReason() {
    if (!canGenerate) return "Missing invoices.generate permission";
    if (activeContracts.length === 0) return "Activate a contract first";
    return null;
  }

  function approveDisabledReason() {
    if (!canApprove) return "Missing invoices.approve permission";
    if (draftInvoices.length === 0) return "Generate a draft invoice first";
    return null;
  }

  function openModal(action: InvoiceAction) {
    setError(null);
    setModalAction(action);
  }

  function exportInvoices() {
    downloadCsv("revflow-invoices.csv", [["Customer", "Status", "Payment status", "Period start", "Period end", "Currency", "Subtotal", "Total", "Paid", "Balance", "Line items", "Created"], ...filtered.map((invoice) => [invoice.customerName ?? invoice.customerId, invoice.status, invoice.paymentStatus, invoice.periodStart, invoice.periodEnd, invoice.currency, invoice.subtotal, invoice.total, invoice.amountPaid, invoice.balanceDue, invoice.lineItems?.length ?? 0, invoice.createdAt])]);
  }

  async function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modalAction) return;

    setError(null);
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      const request = modalAction === "generate"
        ? {
          path: "/api/invoices/generate",
          label: "Draft invoice generated",
          init: {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              contractId: String(formData.get("contractId") ?? ""),
              periodStart: String(formData.get("periodStart") ?? ""),
              periodEnd: String(formData.get("periodEnd") ?? "")
            })
          }
        }
        : {
          path: `/api/invoices/${String(formData.get("invoiceId") ?? "")}/approve`,
          label: "Invoice approved",
          init: { method: "POST" }
        };

      const response = await fetch(request.path, request.init);

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? (modalAction === "generate" ? "Could not generate invoice" : "Could not approve invoice"));
      }

      toast.success(request.label, { description: modalAction === "generate" ? "The draft is ready for controlled review." : "Revenue recognition can now use this invoice." });
      setModalAction(null);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast.error("Invoice action failed", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  const generateReason = generateDisabledReason();
  const approveReason = approveDisabledReason();

  return (
    <section className="invoice-workspace-stack">
      <div className="invoice-insight-grid">
        <article className="invoice-insight-card">
          <p className="eyebrow">Filtered value</p>
          <strong>{formatCurrency(currency, filteredTotal)}</strong>
          <span>{filtered.length} invoices in the current view</span>
        </article>
        <article className="invoice-insight-card invoice-state-card">
          <p className="eyebrow">State value</p>
          <div className="invoice-state-row"><span>Draft</span><div><i style={{ width: `${Math.max(6, (draftTotal / maxStateTotal) * 100)}%` }} /></div><strong>{formatCurrency(currency, draftTotal)}</strong></div>
          <div className="invoice-state-row approved"><span>Approved</span><div><i style={{ width: `${Math.max(6, (approvedTotal / maxStateTotal) * 100)}%` }} /></div><strong>{formatCurrency(currency, approvedTotal)}</strong></div>
        </article>
        <article className="invoice-insight-card">
          <p className="eyebrow">Review queue</p>
          <strong>{draftInvoices.length}</strong>
          <span>draft invoices awaiting approval before revenue recognition</span>
        </article>
      </div>

      <section className="data-panel invoice-workspace">
        <div className="data-toolbar">
          <div>
            <h2>Invoice ledger</h2>
            <span>{filtered.length} of {invoices.length} shown</span>
          </div>
          <div className="data-toolbar-actions invoice-toolbar-actions">
            <label className="data-search" htmlFor="invoice-search">
              <span>Search</span>
              <input id="invoice-search" onChange={(event) => setQuery(event.target.value)} placeholder="Customer, status, period" value={query} />
            </label>
            <label className="data-filter" htmlFor="invoice-status-filter">
              <span>Status</span>
              <select id="invoice-status-filter" onChange={(event) => setStatus(event.target.value as StatusFilter)} value={status}>
                {statusOptions.map((option) => <option key={option} value={option}>{option === "all" ? "All" : option}</option>)}
              </select>
            </label>
            <div className="toolbar-button-group" aria-label="Invoice actions">
              <button className="primary-link data-primary-action" disabled={Boolean(generateReason)} onClick={() => openModal("generate")} title={generateReason ?? undefined} type="button">Generate draft</button>
              <button className="secondary-command" disabled={Boolean(approveReason)} onClick={() => openModal("approve")} title={approveReason ?? undefined} type="button">Approve draft</button>
            </div>
            <button className="secondary-command" disabled={filtered.length === 0} onClick={exportInvoices} type="button">Export CSV</button>
          </div>
        </div>

        {invoices.length === 0 ? <div className="blocked-notice" role="note"><strong>No invoices generated yet</strong><span>Generate a draft after an active contract has billable usage for the period.</span></div> : filtered.length === 0 ? <p className="empty-state">No invoices match this filter.</p> : <InvoicesTable invoices={filtered} />}

        {modalAction ? (
          <div className="data-modal-backdrop" role="presentation">
            <section aria-labelledby="invoice-action-title" aria-modal="true" className="data-modal" role="dialog">
              <div className="panel-title-row">
                <div>
                  <p className="eyebrow">Invoices</p>
                  <h2 id="invoice-action-title">{modalAction === "generate" ? "Generate draft invoice" : "Approve draft invoice"}</h2>
                  <p>{modalAction === "generate" ? "Create a controlled draft from contract, pricing, and metered usage inputs." : "Move a reviewed draft forward for revenue schedule generation."}</p>
                </div>
                <button aria-label="Close invoice modal" className="secondary-command" onClick={() => setModalAction(null)} type="button">Close</button>
              </div>
              <form className="data-modal-form" onSubmit={submitAction}>
                {modalAction === "generate" ? <GenerateFields activeContracts={activeContracts} defaults={defaults} /> : <ApproveFields draftInvoices={draftInvoices} />}
                <div className="consequence-note">{modalAction === "generate" ? "Generation creates a draft invoice. Approval remains a separate review step." : "Approval marks the invoice ready for deterministic revenue recognition."}</div>
                {error ? <p className="error-text">{error}</p> : null}
                <div className="data-modal-actions">
                  <span>{modalAction === "generate" ? generateReason ?? "The draft appears in the invoice ledger after save." : approveReason ?? "Approved invoices can move to revenue recognition."}</span>
                  <button disabled={isSubmitting || Boolean(modalAction === "generate" ? generateReason : approveReason)} type="submit">{isSubmitting ? "Working..." : modalAction === "generate" ? "Generate invoice" : "Approve invoice"}</button>
                </div>
              </form>
            </section>
          </div>
        ) : null}
      </section>
    </section>
  );
}

function InvoicesTable({ invoices }: { invoices: Invoice[] }) {
  return <div className="data-table-scroll"><table><thead><tr><th>Customer</th><th>Status</th><th>Payment</th><th>Period</th><th>Total</th><th>Paid</th><th>Balance</th><th>Detail</th><th>Next</th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.id}><td><strong>{invoice.customerName ?? invoice.customerId}</strong></td><td><span className={`status-badge status-${invoice.status}`}>{invoice.status}</span></td><td><span className={`status-badge status-${invoice.paymentStatus}`}>{invoice.paymentStatus}</span></td><td>{formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}</td><td>{formatCurrency(invoice.currency, invoice.total)}</td><td>{formatCurrency(invoice.currency, invoice.amountPaid)}</td><td>{formatCurrency(invoice.currency, invoice.balanceDue)}</td><td><a href={`/invoices/${invoice.id}`}>View</a></td><td>{invoice.balanceDue > 0 && ["approved", "issued"].includes(invoice.status) ? <a href="/payments">Record payment</a> : invoice.status === "approved" ? <a href="/revenue">Generate revenue</a> : invoice.status === "draft" ? "Approve draft" : <span className="muted-text">Closed</span>}</td></tr>)}</tbody></table></div>;
}

function GenerateFields({ activeContracts, defaults }: { activeContracts: ContractSummary[]; defaults: { start: string; end: string } }) {
  return <><div><label htmlFor="invoice-contract">Active contract</label><select id="invoice-contract" name="contractId" required><option value="">Select contract</option>{activeContracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.customerName ?? contract.customerId}</option>)}</select></div><div className="inline-fields"><div><label htmlFor="period-start">Period start</label><input id="period-start" name="periodStart" type="date" defaultValue={defaults.start} required /></div><div><label htmlFor="period-end">Period end</label><input id="period-end" name="periodEnd" type="date" defaultValue={defaults.end} required /></div></div></>;
}

function ApproveFields({ draftInvoices }: { draftInvoices: Invoice[] }) {
  return <div><label htmlFor="approve-invoice">Draft invoice</label><select id="approve-invoice" name="invoiceId" required><option value="">Select invoice</option>{draftInvoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.customerName ?? invoice.customerId} - {formatCurrency(invoice.currency, invoice.total)}</option>)}</select></div>;
}