import { listContracts, listMeters, listUsageAggregates, listUsageEvents } from "@/lib/api-client";

import { UsageEventForm } from "./usage-forms";

export default async function UsagePage() {
  const [contracts, meters, events, aggregates] = await Promise.all([
    listContracts(),
    listMeters(),
    listUsageEvents(),
    listUsageAggregates()
  ]);
  const contractById = new Map(contracts.map((contract) => [contract.id, contract.customerName ?? contract.customerId]));
  const meterById = new Map(meters.map((meter) => [meter.id, meter.name]));

  return (
    <main className="shell page-grid">
      <section className="hero compact">
        <p className="eyebrow">Usage</p>
        <h1>Metered activity</h1>
        <p className="lede">Ingest raw usage events, enforce active contract configuration, and inspect billable aggregates by meter.</p>
      </section>

      <section className="two-column">
        <div className="stacked-forms">
          <UsageEventForm contracts={contracts} meters={meters} />
        </div>

        <div className="stacked-forms">
          <div className="table-panel">
            <div className="table-header">
              <h2>Aggregates</h2>
              <span>{aggregates.length} groups</span>
            </div>
            {aggregates.length === 0 ? (
              <p className="empty-state">No usage aggregates yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Meter</th>
                    <th>Events</th>
                    <th>Billable</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregates.map((aggregate) => (
                    <tr key={`${aggregate.contractId}-${aggregate.meterId}`}>
                      <td>{aggregate.customerName ?? aggregate.contractId}</td>
                      <td>{aggregate.meterName}</td>
                      <td>{aggregate.eventCount}</td>
                      <td>{aggregate.billableQuantity} {aggregate.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="table-panel">
            <div className="table-header">
              <h2>Recent events</h2>
              <span>{events.length} shown</span>
            </div>
            {events.length === 0 ? (
              <p className="empty-state">No events ingested yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Contract</th>
                    <th>Meter</th>
                    <th>Quantity</th>
                    <th>Occurred</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td>{contractById.get(event.contractId) ?? event.contractId}</td>
                      <td>{meterById.get(event.meterId) ?? event.meterId}</td>
                      <td>{event.quantity}</td>
                      <td>{new Date(event.occurredAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
