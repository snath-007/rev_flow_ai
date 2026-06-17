import { listContracts, listCustomers, listPriceRules } from "@/lib/api-client";

import { ContractApproveForm, ContractCreateForm, ContractLineItemForm } from "./contract-forms";

export default async function ContractsPage() {
  const [customers, contracts, priceRules] = await Promise.all([
    listCustomers(),
    listContracts(),
    listPriceRules()
  ]);

  return (
    <main className="shell page-grid">
      <section className="hero compact">
        <p className="eyebrow">Contracts</p>
        <h1>Customer commercial terms</h1>
        <p className="lede">Draft customer contracts, attach catalog price rules, and approve them into active billing configuration.</p>
      </section>

      <section className="two-column">
        <div className="stacked-forms">
          <ContractCreateForm customers={customers} />
          <ContractLineItemForm contracts={contracts} priceRules={priceRules} />
          <ContractApproveForm contracts={contracts} />
        </div>

        <div className="table-panel">
          <div className="table-header">
            <h2>Contracts</h2>
            <span>{contracts.length} total</span>
          </div>
          {contracts.length === 0 ? (
            <p className="empty-state">No contracts yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Lines</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.id}>
                    <td>{contract.customerName ?? contract.customerId}</td>
                    <td>{contract.status}</td>
                    <td>{new Date(contract.startDate).toLocaleDateString()}</td>
                    <td>{contract.endDate ? new Date(contract.endDate).toLocaleDateString() : "Open"}</td>
                    <td>{contract.lineItemCount}</td>
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
