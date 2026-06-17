import { listCustomers } from "@/lib/api-client";

import { CustomerCreateForm } from "./customer-create-form";

export default async function CustomersPage() {
  const customers = await listCustomers();

  return (
    <main className="shell page-grid">
      <section className="hero compact">
        <p className="eyebrow">Customers</p>
        <h1>Billable accounts</h1>
        <p className="lede">Create and review the customer records that contracts will attach to.</p>
      </section>

      <section className="two-column">
        <CustomerCreateForm />

        <div className="table-panel">
          <div className="table-header">
            <h2>Customer list</h2>
            <span>{customers.length} total</span>
          </div>

          {customers.length === 0 ? (
            <p className="empty-state">No customers yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.name}</td>
                    <td>{customer.email}</td>
                    <td>{new Date(customer.createdAt).toLocaleDateString()}</td>
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
