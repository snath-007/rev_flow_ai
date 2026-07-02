"use client";

import type { ContractSummary, Meter, UsageAggregate, UsageEvent } from "@revflow/shared";
import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type UsageTab = "aggregates" | "events";
type MeterFilter = "all" | string;

type UsageWorkspaceProps = {
  canWrite: boolean;
  contracts: ContractSummary[];
  meters: Meter[];
  events: UsageEvent[];
  aggregates: UsageAggregate[];
};

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

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Open";
  return new Date(value).toLocaleString();
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Open";
  return new Date(value).toLocaleDateString();
}

function defaultOccurredAt() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function defaultIdempotencyKey() {
  return `evt_${Date.now()}`;
}

export function UsageWorkspace({ canWrite, contracts, meters, events, aggregates }: UsageWorkspaceProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<UsageTab>("aggregates");
  const [query, setQuery] = useState("");
  const [meterFilter, setMeterFilter] = useState<MeterFilter>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeContracts = useMemo(() => contracts.filter((contract) => contract.status === "active"), [contracts]);
  const contractById = useMemo(() => new Map(contracts.map((contract) => [contract.id, contract.customerName ?? contract.customerId])), [contracts]);
  const meterById = useMemo(() => new Map(meters.map((meter) => [meter.id, meter.name])), [meters]);
  const meterUnitById = useMemo(() => new Map(meters.map((meter) => [meter.id, meter.unit])), [meters]);
  const term = query.trim().toLowerCase();

  const filteredAggregates = useMemo(() => aggregates.filter((aggregate) => {
    const meterMatches = meterFilter === "all" || aggregate.meterId === meterFilter;
    const termMatches = !term || includesTerm([aggregate.customerName, aggregate.contractId, aggregate.meterName, aggregate.unit, aggregate.billableQuantity, aggregate.eventCount], term);
    return meterMatches && termMatches;
  }), [aggregates, meterFilter, term]);

  const filteredEvents = useMemo(() => events.filter((event) => {
    const meterMatches = meterFilter === "all" || event.meterId === meterFilter;
    const termMatches = !term || includesTerm([contractById.get(event.contractId), meterById.get(event.meterId), event.idempotencyKey, event.quantity, event.occurredAt], term);
    return meterMatches && termMatches;
  }), [contractById, events, meterById, meterFilter, term]);

  const activeCount = activeTab === "aggregates" ? filteredAggregates.length : filteredEvents.length;
  const totalCount = activeTab === "aggregates" ? aggregates.length : events.length;
  const totalBillable = filteredAggregates.reduce((sum, aggregate) => sum + aggregate.billableQuantity, 0);
  const totalRaw = filteredEvents.reduce((sum, event) => sum + event.quantity, 0);
  const topMeters = useMemo(() => {
    const totals = new Map<string, { label: string; unit: string; value: number }>();
    for (const aggregate of aggregates) {
      const current = totals.get(aggregate.meterId) ?? { label: aggregate.meterName, unit: aggregate.unit, value: 0 };
      current.value += aggregate.billableQuantity;
      totals.set(aggregate.meterId, current);
    }
    return [...totals.values()].sort((a, b) => b.value - a.value).slice(0, 4);
  }, [aggregates]);
  const maxTopMeter = Math.max(...topMeters.map((meter) => meter.value), 1);

  function exportActiveTab() {
    if (activeTab === "aggregates") {
      downloadCsv("revflow-usage-aggregates.csv", [["Customer", "Contract", "Meter", "Events", "Total quantity", "Billable quantity", "Unit", "First occurred", "Last occurred", "Calculated"], ...filteredAggregates.map((aggregate) => [aggregate.customerName, aggregate.contractId, aggregate.meterName, aggregate.eventCount, aggregate.totalQuantity, aggregate.billableQuantity, aggregate.unit, aggregate.firstOccurredAt, aggregate.lastOccurredAt, aggregate.calculatedAt])]);
      return;
    }

    downloadCsv("revflow-usage-events.csv", [["Contract", "Meter", "Quantity", "Unit", "Occurred", "Idempotency key", "Created"], ...filteredEvents.map((event) => [contractById.get(event.contractId), meterById.get(event.meterId), event.quantity, meterUnitById.get(event.meterId), event.occurredAt, event.idempotencyKey, event.createdAt])]);
  }

  function createDisabledReason() {
    if (!canWrite) return "Read-only access";
    if (activeContracts.length === 0) return "Activate a contract first";
    if (meters.length === 0) return "Configure a meter first";
    return null;
  }

  async function submitEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
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
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? "Could not ingest usage event");
      }

      toast.success("Usage event accepted", { description: "Aggregation will refresh for the event period." });
      setIsModalOpen(false);
      setActiveTab("events");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast.error("Usage ingestion failed", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  const disabledReason = createDisabledReason();

  return (
    <section className="usage-workspace-stack">
      <div className="usage-insight-grid">
        <article className="usage-insight-card">
          <p className="eyebrow">Billable motion</p>
          <strong>{formatNumber(totalBillable)}</strong>
          <span>billable units across {filteredAggregates.length} aggregate groups</span>
        </article>
        <article className="usage-insight-card">
          <p className="eyebrow">Raw intake</p>
          <strong>{formatNumber(totalRaw)}</strong>
          <span>units from {filteredEvents.length} accepted usage events</span>
        </article>
        <article className="usage-insight-card usage-meter-mix">
          <p className="eyebrow">Meter mix</p>
          {topMeters.length === 0 ? <span>No billable meter distribution yet.</span> : topMeters.map((meter) => (
            <div className="meter-mix-row" key={meter.label}>
              <span>{meter.label}</span>
              <div><i style={{ width: `${Math.max(8, (meter.value / maxTopMeter) * 100)}%` }} /></div>
              <strong>{formatNumber(meter.value)} {meter.unit}</strong>
            </div>
          ))}
        </article>
      </div>

      <section className="data-panel usage-workspace">
        <div className="data-toolbar">
          <div>
            <h2>Usage ledger</h2>
            <span>{activeCount} of {totalCount} {activeTab} shown</span>
          </div>
          <div className="data-toolbar-actions usage-toolbar-actions">
            <label className="data-search" htmlFor="usage-search">
              <span>Search</span>
              <input id="usage-search" onChange={(event) => setQuery(event.target.value)} placeholder={activeTab === "aggregates" ? "Customer, meter, unit" : "Contract, meter, key"} value={query} />
            </label>
            <label className="data-filter" htmlFor="usage-meter-filter">
              <span>Meter</span>
              <select id="usage-meter-filter" onChange={(event) => setMeterFilter(event.target.value)} value={meterFilter}>
                <option value="all">All meters</option>
                {meters.map((meter) => <option key={meter.id} value={meter.id}>{meter.name}</option>)}
              </select>
            </label>
            <button className="secondary-command" disabled={activeCount === 0} onClick={exportActiveTab} type="button">Export CSV</button>
            <button className="primary-link data-primary-action" disabled={Boolean(disabledReason)} onClick={() => { setError(null); setIsModalOpen(true); }} title={disabledReason ?? undefined} type="button">Ingest event</button>
          </div>
        </div>

        <div className="data-tabs" role="tablist" aria-label="Usage tables">
          <button aria-selected={activeTab === "aggregates"} className={activeTab === "aggregates" ? "active" : ""} onClick={() => { setActiveTab("aggregates"); setQuery(""); }} role="tab" type="button"><span>Aggregates</span><strong>{aggregates.length}</strong></button>
          <button aria-selected={activeTab === "events"} className={activeTab === "events" ? "active" : ""} onClick={() => { setActiveTab("events"); setQuery(""); }} role="tab" type="button"><span>Raw events</span><strong>{events.length}</strong></button>
        </div>

        {activeTab === "aggregates" ? <AggregatesTable aggregates={filteredAggregates} /> : <EventsTable contractById={contractById} events={filteredEvents} meterById={meterById} meterUnitById={meterUnitById} />}

        {isModalOpen ? (
          <div className="data-modal-backdrop" role="presentation">
            <section aria-labelledby="usage-create-title" aria-modal="true" className="data-modal" role="dialog">
              <div className="panel-title-row">
                <div>
                  <p className="eyebrow">Operate</p>
                  <h2 id="usage-create-title">Ingest usage event</h2>
                  <p>Capture one metered activity event with an idempotency key for duplicate protection.</p>
                </div>
                <button aria-label="Close usage modal" className="secondary-command" onClick={() => setIsModalOpen(false)} type="button">Close</button>
              </div>
              <form className="data-modal-form" onSubmit={submitEvent}>
                <div>
                  <label htmlFor="usage-contract">Active contract</label>
                  <select id="usage-contract" name="contractId" required>
                    <option value="">Select contract</option>
                    {activeContracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.customerName ?? contract.customerId}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="usage-meter">Meter</label>
                  <select id="usage-meter" name="meterId" required>
                    <option value="">Select meter</option>
                    {meters.map((meter) => <option key={meter.id} value={meter.id}>{meter.name} ({meter.unit})</option>)}
                  </select>
                </div>
                <div className="inline-fields">
                  <div>
                    <label htmlFor="usage-quantity">Quantity</label>
                    <input id="usage-quantity" name="quantity" min="0.0001" step="0.0001" type="number" defaultValue="1" required />
                  </div>
                  <div>
                    <label htmlFor="occurred-at">Occurred at</label>
                    <input id="occurred-at" name="occurredAt" type="datetime-local" defaultValue={defaultOccurredAt()} required />
                  </div>
                </div>
                <div>
                  <label htmlFor="idempotency-key">Idempotency key</label>
                  <input id="idempotency-key" name="idempotencyKey" required defaultValue={defaultIdempotencyKey()} />
                </div>
                <div className="consequence-note">Accepted events refresh usage aggregates for invoice generation.</div>
                {error ? <p className="error-text">{error}</p> : null}
                <div className="data-modal-actions">
                  <span>{disabledReason ?? "The new event appears in raw events after save."}</span>
                  <button disabled={isSubmitting || Boolean(disabledReason)} type="submit">{isSubmitting ? "Ingesting..." : "Ingest event"}</button>
                </div>
              </form>
            </section>
          </div>
        ) : null}
      </section>
    </section>
  );
}

function AggregatesTable({ aggregates }: { aggregates: UsageAggregate[] }) {
  if (aggregates.length === 0) return <div className="blocked-notice" role="note"><strong>No aggregates found</strong><span>Ingest usage for an active contract and meter, or adjust filters.</span></div>;

  return <div className="data-table-scroll"><table><thead><tr><th>Customer</th><th>Meter</th><th>Events</th><th>Billable</th><th>Period</th><th>Next</th></tr></thead><tbody>{aggregates.map((aggregate) => <tr key={`${aggregate.contractId}-${aggregate.meterId}-${aggregate.periodStart ?? "open"}`}><td><strong>{aggregate.customerName ?? aggregate.contractId}</strong></td><td>{aggregate.meterName}<br /><span className="muted-text">{aggregate.aggregationType}</span></td><td>{aggregate.eventCount}</td><td>{formatNumber(aggregate.billableQuantity)} {aggregate.unit}</td><td>{formatDate(aggregate.periodStart)} - {formatDate(aggregate.periodEnd)}</td><td><a href="/invoices">Generate invoice</a></td></tr>)}</tbody></table></div>;
}

function EventsTable({ contractById, events, meterById, meterUnitById }: { contractById: Map<string, string>; events: UsageEvent[]; meterById: Map<string, string>; meterUnitById: Map<string, string> }) {
  if (events.length === 0) return <div className="blocked-notice" role="note"><strong>No events found</strong><span>Ingest an event or adjust filters to inspect raw usage.</span></div>;

  return <div className="data-table-scroll"><table><thead><tr><th>Contract</th><th>Meter</th><th>Quantity</th><th>Occurred</th><th>Idempotency</th></tr></thead><tbody>{events.map((event) => <tr key={event.id}><td><strong>{contractById.get(event.contractId) ?? event.contractId}</strong></td><td>{meterById.get(event.meterId) ?? event.meterId}</td><td>{formatNumber(event.quantity)} {meterUnitById.get(event.meterId) ?? "units"}</td><td>{formatDateTime(event.occurredAt)}</td><td><code>{event.idempotencyKey}</code></td></tr>)}</tbody></table></div>;
}