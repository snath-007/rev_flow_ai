"use client";

import type { Invoice, Payment } from "@revflow/shared";
import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type StatusFilter = "all" | Payment["allocationStatus"];

type PaymentsWorkspaceProps = {
  canWrite: boolean;
  invoices: Invoice[];
  payments: Payment[];
};

const statusOptions: StatusFilter[] = ["all", "unapplied", "partial", "applied", "overpayment"];

function formatCurrency(currency: string, value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

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

export function PaymentsWorkspace({ canWrite, invoices, payments }: PaymentsWorkspaceProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const payableInvoices = useMemo(() => invoices.filter((invoice) => ["approved", "issued"].includes(invoice.status) && invoice.balanceDue > 0), [invoices]);
  const term = query.trim().toLowerCase();
  const filtered = useMemo(() => payments.filter((payment) => {
    const statusMatches = status === "all" || payment.allocationStatus === status;
    const termMatches = !term || includesTerm([payment.customerName, payment.reference, payment.currency, payment.amount, payment.allocationStatus, payment.status], term);
    return statusMatches && termMatches;
  }), [payments, status, term]);
  const currency = filtered[0]?.currency ?? payments[0]?.currency ?? invoices[0]?.currency ?? "USD";
  const receivedTotal = filtered.reduce((sum, payment) => sum + payment.amount, 0);
  const allocatedTotal = filtered.reduce((sum, payment) => sum + payment.allocatedAmount, 0);
  const unappliedTotal = filtered.reduce((sum, payment) => sum + payment.unappliedAmount, 0);
  const openInvoiceBalance = invoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0);
  const splitTotal = Math.max(receivedTotal, 1);

  function disabledReason() {
    if (!canWrite) return "Missing payments.write permission";
    if (payableInvoices.length === 0) return "No approved or issued invoices with open balance";
    return null;
  }

  function exportPayments() {
    downloadCsv("revflow-payments.csv", [["Customer", "Invoice", "Amount", "Allocated", "Unapplied", "Currency", "Received", "Reference", "Allocation status"], ...filtered.map((payment) => [payment.customerName, payment.invoiceId, payment.amount, payment.allocatedAmount, payment.unappliedAmount, payment.currency, payment.receivedAt, payment.reference, payment.allocationStatus])]);
  }

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          invoiceId: String(formData.get("invoiceId") ?? ""),
          amount: Number(formData.get("amount") ?? 0),
          receivedAt: String(formData.get("receivedAt") ?? ""),
          reference: String(formData.get("reference") ?? "") || null
        })
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? "Could not record payment");
      }

      toast.success("Payment recorded", { description: "Invoice balance and reconciliation evidence were updated." });
      setIsModalOpen(false);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast.error("Payment failed", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  const reason = disabledReason();

  return (
    <section className="payments-workspace-stack">
      <div className="payments-insight-grid">
        <article className="payments-insight-card payments-split-card">
          <p className="eyebrow">Cash received</p>
          <strong>{formatCurrency(currency, receivedTotal)}</strong>
          <span>{formatCurrency(currency, allocatedTotal)} allocated to invoices</span>
          <div className="payments-split-bar" aria-label="Allocated and unapplied payment split"><i style={{ width: `${Math.max(4, (allocatedTotal / splitTotal) * 100)}%` }} /><b style={{ width: `${Math.max(4, (unappliedTotal / splitTotal) * 100)}%` }} /></div>
          <small>{formatCurrency(currency, unappliedTotal)} unapplied or overpayment</small>
        </article>
        <article className="payments-insight-card">
          <p className="eyebrow">Open AR</p>
          <strong>{formatCurrency(currency, openInvoiceBalance)}</strong>
          <span>remaining balance across invoice ledger</span>
        </article>
        <article className="payments-insight-card">
          <p className="eyebrow">Payable invoices</p>
          <strong>{payableInvoices.length}</strong>
          <span>approved or issued invoices ready for receipt</span>
        </article>
      </div>

      <section className="data-panel payments-workspace">
        <div className="data-toolbar">
          <div><h2>Payment ledger</h2><span>{filtered.length} of {payments.length} shown</span></div>
          <div className="data-toolbar-actions payments-toolbar-actions">
            <label className="data-search" htmlFor="payment-search"><span>Search</span><input id="payment-search" onChange={(event) => setQuery(event.target.value)} placeholder="Customer, reference, status" value={query} /></label>
            <label className="data-filter" htmlFor="payment-status-filter"><span>Status</span><select id="payment-status-filter" onChange={(event) => setStatus(event.target.value as StatusFilter)} value={status}>{statusOptions.map((option) => <option key={option} value={option}>{option === "all" ? "All" : option}</option>)}</select></label>
            <button className="secondary-command" disabled={filtered.length === 0} onClick={exportPayments} type="button">Export CSV</button>
            <button className="primary-link data-primary-action" disabled={Boolean(reason)} onClick={() => { setError(null); setIsModalOpen(true); }} title={reason ?? undefined} type="button">Record payment</button>
          </div>
        </div>

        {payments.length === 0 ? <div className="blocked-notice" role="note"><strong>No payments yet</strong><span>Record a receipt against an approved invoice to create reconciliation evidence.</span></div> : filtered.length === 0 ? <p className="empty-state">No payments match this filter.</p> : <PaymentsTable payments={filtered} />}

        {isModalOpen ? <div className="data-modal-backdrop" role="presentation"><section aria-labelledby="payment-create-title" aria-modal="true" className="data-modal" role="dialog"><div className="panel-title-row"><div><p className="eyebrow">Payments</p><h2 id="payment-create-title">Record payment</h2><p>Capture a manual receipt and allocate it deterministically to one invoice.</p></div><button aria-label="Close payment modal" className="secondary-command" onClick={() => setIsModalOpen(false)} type="button">Close</button></div><form className="data-modal-form" onSubmit={submitPayment}><div><label htmlFor="payment-invoice">Invoice</label><select id="payment-invoice" name="invoiceId" required><option value="">Select invoice</option>{payableInvoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.customerName ?? invoice.customerId} - {formatCurrency(invoice.currency, invoice.balanceDue)} due</option>)}</select></div><div className="inline-fields"><div><label htmlFor="payment-amount">Amount</label><input id="payment-amount" name="amount" min="0.01" step="0.01" type="number" required /></div><div><label htmlFor="payment-received-at">Received at</label><input id="payment-received-at" name="receivedAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></div></div><div><label htmlFor="payment-reference">Reference</label><input id="payment-reference" name="reference" placeholder="ACH-2026-001" /></div><div className="consequence-note">Overpayments remain visible as unapplied payment amount. Invoices are marked paid only when allocated receipts cover the total.</div>{error ? <p className="error-text">{error}</p> : null}<div className="data-modal-actions"><span>{reason ?? "The receipt appears in the ledger after save."}</span><button disabled={isSubmitting || Boolean(reason)} type="submit">{isSubmitting ? "Recording..." : "Record payment"}</button></div></form></section></div> : null}
      </section>
    </section>
  );
}

function PaymentsTable({ payments }: { payments: Payment[] }) {
  return <div className="data-table-scroll payments-table-scroll"><table><thead><tr><th>Customer</th><th>Status</th><th>Received</th><th>Amount</th><th>Allocated</th><th>Unapplied</th><th>Reference</th><th>Invoice</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td><strong>{payment.customerName ?? payment.customerId}</strong></td><td><span className={`status-badge status-${payment.allocationStatus}`}>{payment.allocationStatus}</span></td><td>{formatDate(payment.receivedAt)}</td><td>{formatCurrency(payment.currency, payment.amount)}</td><td>{formatCurrency(payment.currency, payment.allocatedAmount)}</td><td>{formatCurrency(payment.currency, payment.unappliedAmount)}</td><td>{payment.reference ?? <span className="muted-text">No reference</span>}</td><td>{payment.invoiceId ? <a href={`/invoices/${payment.invoiceId}`}>Invoice</a> : <span className="muted-text">Unapplied</span>}</td></tr>)}</tbody></table></div>;
}