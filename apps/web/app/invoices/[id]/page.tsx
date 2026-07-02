import { WorkspaceShell } from "../../workspace-shell";
import { getInvoice } from "@/lib/api-client";
import { NextAction, WorkflowPageHeader } from "../../workflow-components";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getInvoice(id);
  const lineItems = invoice.lineItems ?? [];

  return (
    <WorkspaceShell activePath="/invoices">
      <main className="workspace-page page-grid">
        <WorkflowPageHeader
          breadcrumbs={[{ href: "/overview", label: "Overview" }, { href: "/invoices", label: "Invoices" }, { label: "Invoice detail" }]}
          eyebrow="Invoice detail"
          title={invoice.customerName ?? invoice.customerId}
          description={`${new Date(invoice.periodStart).toLocaleDateString()} - ${new Date(invoice.periodEnd).toLocaleDateString()} / ${invoice.status}`}
          actions={<a className="primary-link secondary" href="/invoices">Back to invoices</a>}
        />

        <section className="evidence-strip" aria-label="Invoice evidence">
          <div><span>Status</span><strong>{invoice.status}</strong></div>
          <div><span>Total</span><strong>{invoice.currency} {invoice.total.toFixed(2)}</strong></div>
          <div><span>Line items</span><strong>{lineItems.length}</strong></div>
        </section>

        <section className="table-panel">
          <div className="table-header"><h2>Line items</h2><span>{invoice.currency} {invoice.total.toFixed(2)}</span></div>
          {lineItems.length === 0 ? <p className="empty-state">No line items found.</p> : (
            <table><thead><tr><th>Description</th><th>Quantity</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>{lineItems.map((lineItem) => <tr key={lineItem.id}><td>{lineItem.description}</td><td>{lineItem.quantity}</td><td>{lineItem.currency} {lineItem.unitPrice.toFixed(4)}</td><td>{lineItem.currency} {lineItem.amount.toFixed(2)}</td></tr>)}</tbody></table>
          )}
        </section>

        <section className="table-panel">
          <div className="table-header"><h2>Calculation snapshot</h2><span>{lineItems.length} lines</span></div>
          <pre className="code-block">{JSON.stringify(invoice.calculationSnapshot, null, 2)}</pre>
        </section>

        {invoice.status === "approved" ? <NextAction href="/revenue" title="Next: revenue recognition">Generate revenue schedules from this approved invoice.</NextAction> : <NextAction href="/invoices" title="Next: approve invoice">Return to invoices and approve this draft when ready.</NextAction>}
      </main>
    </WorkspaceShell>
  );
}