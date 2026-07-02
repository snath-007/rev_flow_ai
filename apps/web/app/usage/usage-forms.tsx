"use client";

import type { ContractSummary, Meter } from "@revflow/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";

function useSubmitState() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return { error, setError, isSubmitting, setIsSubmitting };
}

export function UsageEventForm({ contracts, meters }: { contracts: ContractSummary[]; meters: Meter[] }) {
  const router = useRouter();
  const { error, setError, isSubmitting, setIsSubmitting } = useSubmitState();
  const activeContracts = contracts.filter((contract) => contract.status === "active");

  async function onSubmit(formData: FormData) {
    setError(null);
    setIsSubmitting(true);

    const occurredAtInput = String(formData.get("occurredAt") ?? "");
    const payload = {
      idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
      contractId: String(formData.get("contractId") ?? ""),
      meterId: String(formData.get("meterId") ?? ""),
      quantity: Number(formData.get("quantity") ?? 0),
      occurredAt: new Date(occurredAtInput).toISOString(),
      properties: {}
    };

    try {
      const response = await fetch("/api/usage/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Could not ingest usage event");
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
      <h2>Ingest usage</h2>
      <div>
        <label htmlFor="usage-contract">Active contract</label>
        <select id="usage-contract" name="contractId" required disabled={activeContracts.length === 0}>
          <option value="">Select contract</option>
          {activeContracts.map((contract) => (
            <option key={contract.id} value={contract.id}>{contract.customerName ?? contract.customerId}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="usage-meter">Meter</label>
        <select id="usage-meter" name="meterId" required disabled={meters.length === 0}>
          <option value="">Select meter</option>
          {meters.map((meter) => (
            <option key={meter.id} value={meter.id}>{meter.name} ({meter.unit})</option>
          ))}
        </select>
      </div>
      <div className="inline-fields">
        <div>
          <label htmlFor="usage-quantity">Quantity</label>
          <input id="usage-quantity" name="quantity" min="0.0001" step="0.0001" type="number" defaultValue="1" required />
        </div>
        <div>
          <label htmlFor="occurred-at">Occurred at</label>
          <input id="occurred-at" name="occurredAt" type="datetime-local" required />
        </div>
      </div>
      <div>
        <label htmlFor="idempotency-key">Idempotency key</label>
        <input id="idempotency-key" name="idempotencyKey" required placeholder="evt_001" />
      </div>
      {activeContracts.length === 0 ? <p className="form-help">Activate a contract before ingesting usage.</p> : null}
      {meters.length === 0 ? <p className="form-help">Configure a meter before ingesting usage.</p> : null}
      <div className="consequence-note">The idempotency key prevents duplicate event ingestion for this workspace.</div>
      {error ? <p className="error-text">{error}</p> : null}
      <button disabled={isSubmitting || activeContracts.length === 0 || meters.length === 0} type="submit">
        {isSubmitting ? "Ingesting..." : "Ingest event"}
      </button>
    </form>
  );
}
