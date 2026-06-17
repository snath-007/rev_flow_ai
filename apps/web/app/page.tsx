const workflowSteps = [
  "AI contract intake",
  "Human review",
  "Billing configuration",
  "Usage aggregation",
  "Invoice approval",
  "Revenue schedules"
];

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">RevFlow</p>
        <h1>AI revenue automation workbench</h1>
        <p className="lede">
          A scaffold for contract-driven billing, usage metering, invoicing,
          revenue recognition, and auditability.
        </p>
      </section>

      <nav className="quick-links" aria-label="Primary sections">
        <a className="primary-link" href="/customers">Open customers</a>
        <a className="primary-link secondary" href="/catalog">Open catalog</a>
        <a className="primary-link secondary" href="/contracts">Open contracts</a>
        <a className="primary-link secondary" href="/usage">Open usage</a>
        <a className="primary-link secondary" href="/invoices">Open invoices</a>
      </nav>

      <section className="panel" aria-label="Planned workflow">
        {workflowSteps.map((step, index) => (
          <div className="step" key={step}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step}</strong>
          </div>
        ))}
      </section>
    </main>
  );
}



