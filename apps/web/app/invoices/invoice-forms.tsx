"use client";

import type { ContractSummary, Invoice } from "@revflow/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";

function useSubmitState() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return { error, setError, isSubmitting, setIsSubmitting };
}

export function InvoiceGenerateForm({ contracts }: { contracts: ContractSummary[] }) {
  const router = useRouter();
  const { error, setError, isSubmitting, setIsSubmitting } = useSubmitState();
  const activeContracts = contracts.filter((contract) => contract.status === "active");

  async function onSubmit(formData: FormData) {
    setError(null);
    setIsSubmitting(true);

    const payload = {
      contractId: String(formData.get("contractId") ?? ""),
      periodStart: String(formData.get("periodStart") ?? ""),
      periodEnd: String(formData.get("periodEnd") ?? "")
    };

    try {
      const response = await fetch("/api/invoices/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Could not generate invoice");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={onSubmit} className="form-panel">
      <h2>Generate draft</h2>
      <div>
        <label htmlFor="invoice-contract">Active contract</label>
        <select id="invoice-contract" name="contractId" required disabled={activeContracts.length === 0}>
          <option value="">Select contract</option>
          {activeContracts.map((contract) => (
            <option key={contract.id} value={contract.id}>{contract.customerName ?? contract.customerId}</option>
          ))}
        </select>
      </div>
      <div className="inline-fields">
        <div>
          <label htmlFor="period-start">Period start</label>
          <input id="period-start" name="periodStart" type="date" required />
        </div>
        <div>
          <label htmlFor="period-end">Period end</label>
          <input id="period-end" name="periodEnd" type="date" required />
        </div>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <button disabled={isSubmitting || activeContracts.length === 0} type="submit">
        {isSubmitting ? "Generating..." : "Generate invoice"}
      </button>
    </form>
  );
}

export function InvoiceApproveForm({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter();
  const { error, setError, isSubmitting, setIsSubmitting } = useSubmitState();
  const draftInvoices = invoices.filter((invoice) => invoice.status === "draft");

  async function onSubmit(formData: FormData) {
    setError(null);
    setIsSubmitting(true);

    const invoiceId = String(formData.get("invoiceId") ?? "");

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/approve`, {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error("Could not approve invoice");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={onSubmit} className="form-panel">
      <h2>Approve draft</h2>
      <div>
        <label htmlFor="approve-invoice">Draft invoice</label>
        <select id="approve-invoice" name="invoiceId" required disabled={draftInvoices.length === 0}>
          <option value="">Select invoice</option>
          {draftInvoices.map((invoice) => (
            <option key={invoice.id} value={invoice.id}>{invoice.customerName ?? invoice.customerId} - {invoice.currency} {invoice.total.toFixed(2)}</option>
          ))}
        </select>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <button disabled={isSubmitting || draftInvoices.length === 0} type="submit">
        {isSubmitting ? "Approving..." : "Approve invoice"}
      </button>
    </form>
  );
}
