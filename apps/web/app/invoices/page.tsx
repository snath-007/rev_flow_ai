import { listContracts, listInvoices } from "@/lib/api-client";

import { InvoiceApproveForm, InvoiceGenerateForm } from "./invoice-forms";

export default async function InvoicesPage() {
  const [contracts, invoices] = await Promise.all([
    listContracts(),
    listInvoices()
  ]);

  return (
    <main className="shell page-grid">
      <section className="hero compact">
        <p className="eyebrow">Invoices</p>
        <h1>Draft billing review</h1>
        <p className="lede">Generate draft invoices from approved contract terms and metered usage, then approve them for downstream issuing.</p>
      </section>

      <section className="two-column">
        <div className="stacked-forms">
          <InvoiceGenerateForm contracts={contracts} />
          <InvoiceApproveForm invoices={invoices} />
        </div>

        <div className="table-panel">
          <div className="table-header">
            <h2>Invoices</h2>
            <span>{invoices.length} total</span>
          </div>
          {invoices.length === 0 ? (
            <p className="empty-state">No invoices generated yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Period</th>
                  <th>Total</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.customerName ?? invoice.customerId}</td>
                    <td>{invoice.status}</td>
                    <td>{new Date(invoice.periodStart).toLocaleDateString()} - {new Date(invoice.periodEnd).toLocaleDateString()}</td>
                    <td>{invoice.currency} {invoice.total.toFixed(2)}</td>
                    <td><a href={`/invoices/${invoice.id}`}>View</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
