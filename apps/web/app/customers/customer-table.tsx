"use client";

import type { Customer } from "@revflow/shared";
import { useMemo, useState } from "react";

function csvEscape(value: string | number | null) {
  const text = value === null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function exportCustomers(customers: Customer[]) {
  const header = ["Name", "Email", "Billing address", "Created"];
  const rows = customers.map((customer) => [
    customer.name,
    customer.email,
    customer.billingAddress,
    new Date(customer.createdAt).toLocaleDateString()
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "revflow-customers.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function CustomerTable({ customers }: { customers: Customer[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((customer) => [customer.name, customer.email, customer.billingAddress ?? ""].some((value) => value.toLowerCase().includes(term)));
  }, [customers, query]);

  return (
    <section className="data-panel">
      <div className="data-toolbar">
        <div>
          <h2>Customer accounts</h2>
          <span>{filtered.length} of {customers.length} shown</span>
        </div>
        <div className="data-toolbar-actions">
          <label className="data-search" htmlFor="customer-search">
            <span>Search</span>
            <input id="customer-search" onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, address" value={query} />
          </label>
          <button className="secondary-command" disabled={filtered.length === 0} onClick={() => exportCustomers(filtered)} type="button">Export CSV</button>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="empty-stack">
          <p className="empty-state">No customers yet.</p>
          <div className="blocked-notice" role="note"><strong>First workflow step</strong><span>Create a customer before configuring contracts or invoices.</span></div>
        </div>
      ) : filtered.length === 0 ? (
        <p className="empty-state">No customers match this filter.</p>
      ) : (
        <div className="data-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Billing address</th>
                <th>Created</th>
                <th>Next</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
                <tr key={customer.id}>
                  <td><strong>{customer.name}</strong></td>
                  <td>{customer.email}</td>
                  <td>{customer.billingAddress ?? <span className="muted-text">Not captured</span>}</td>
                  <td>{new Date(customer.createdAt).toLocaleDateString()}</td>
                  <td><a href="/contracts">Draft contract</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}