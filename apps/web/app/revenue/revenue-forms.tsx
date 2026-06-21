"use client";

import type { Invoice } from "@revflow/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RevenueScheduleGenerateForm({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const approvedInvoices = invoices.filter((invoice) => invoice.status === "approved");

  async function onSubmit(formData: FormData) {
    setError(null);
    setIsSubmitting(true);

    const payload = {
      invoiceId: String(formData.get("invoiceId") ?? "")
    };

    try {
      const response = await fetch("/api/revenue/schedules/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Could not generate revenue schedules");
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
      <h2>Generate schedules</h2>
      <div>
        <label htmlFor="revenue-invoice">Approved invoice</label>
        <select id="revenue-invoice" name="invoiceId" required disabled={approvedInvoices.length === 0}>
          <option value="">Select invoice</option>
          {approvedInvoices.map((invoice) => (
            <option key={invoice.id} value={invoice.id}>
              {invoice.customerName ?? invoice.customerId} - {invoice.currency} {invoice.total.toFixed(2)}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <button disabled={isSubmitting || approvedInvoices.length === 0} type="submit">
        {isSubmitting ? "Generating..." : "Generate revenue schedules"}
      </button>
    </form>
  );
}