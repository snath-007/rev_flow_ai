import { getInvoice } from "@/lib/api-client";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getInvoice(id);
  const lineItems = invoice.lineItems ?? [];

  return (
    <main className="shell page-grid">
      <section className="hero compact">
        <p className="eyebrow">Invoice detail</p>
        <h1>{invoice.customerName ?? invoice.customerId}</h1>
        <p className="lede">
          {new Date(invoice.periodStart).toLocaleDateString()} - {new Date(invoice.periodEnd).toLocaleDateString()} / {invoice.status}
        </p>
      </section>

      <section className="table-panel">
        <div className="table-header">
          <h2>Line items</h2>
          <span>{invoice.currency} {invoice.total.toFixed(2)}</span>
        </div>
        {lineItems.length === 0 ? (
          <p className="empty-state">No line items found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((lineItem) => (
                <tr key={lineItem.id}>
                  <td>{lineItem.description}</td>
                  <td>{lineItem.quantity}</td>
                  <td>{lineItem.currency} {lineItem.unitPrice.toFixed(4)}</td>
                  <td>{lineItem.currency} {lineItem.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="table-panel">
        <div className="table-header">
          <h2>Calculation snapshot</h2>
          <span>{lineItems.length} lines</span>
        </div>
        <pre className="code-block">{JSON.stringify(invoice.calculationSnapshot, null, 2)}</pre>
      </section>
    </main>
  );
}
