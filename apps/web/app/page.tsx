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

