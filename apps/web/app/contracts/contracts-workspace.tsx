"use client";

import type { ContractSummary, Customer, PriceRule } from "@revflow/shared";
import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type ContractAction = "draft" | "line" | "approve";
type StatusFilter = "all" | "draft" | "active" | "ready";

type ContractsWorkspaceProps = {
  canApprove: boolean;
  canWrite: boolean;
  contracts: ContractSummary[];
  customers: Customer[];
  priceRules: PriceRule[];
};

function csvEscape(value: string | number | null) {
  const text = value === null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function exportContracts(contracts: ContractSummary[]) {
  const rows = [
    ["Customer", "Status", "Start", "End", "Line items", "Created"],
    ...contracts.map((contract) => [
      contract.customerName ?? contract.customerId,
      contract.status,
      new Date(contract.startDate).toLocaleDateString(),
      contract.endDate ? new Date(contract.endDate).toLocaleDateString() : "Open",
      contract.lineItemCount,
      new Date(contract.createdAt).toLocaleDateString()
    ])
  ];
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "revflow-contracts.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function ContractsWorkspace({ canApprove, canWrite, contracts, customers, priceRules }: ContractsWorkspaceProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [action, setAction] = useState<ContractAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const draftContracts = useMemo(() => contracts.filter((contract) => contract.status === "draft"), [contracts]);
  const approvableContracts = useMemo(() => draftContracts.filter((contract) => contract.lineItemCount > 0), [draftContracts]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return contracts.filter((contract) => {
      const matchesTerm = !term || [contract.customerName ?? contract.customerId, contract.status, contract.startDate, contract.endDate ?? "Open"].some((value) => value.toLowerCase().includes(term));
      const matchesStatus = status === "all" || contract.status === status || (status === "ready" && contract.status === "draft" && contract.lineItemCount > 0);
      return matchesTerm && matchesStatus;
    });
  }, [contracts, query, status]);

  function disabledReason(nextAction: ContractAction) {
    if (nextAction === "draft") {
      if (!canWrite) return "Read-only access";
      if (customers.length === 0) return "Create a customer first";
    }
    if (nextAction === "line") {
      if (!canWrite) return "Read-only access";
      if (draftContracts.length === 0) return "Create a draft contract first";
      if (priceRules.length === 0) return "Create a price rule first";
    }
    if (nextAction === "approve") {
      if (!canApprove) return "Approval permission required";
      if (approvableContracts.length === 0) return "Add a line item before approval";
    }
    return null;
  }

  function openAction(nextAction: ContractAction) {
    const reason = disabledReason(nextAction);
    if (reason) {
      toast.message(reason);
      return;
    }
    setError(null);
    setAction(nextAction);
  }

  async function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action) return;
    setError(null);
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);

    const request = action === "draft"
      ? {
          path: "/api/contracts",
          label: "Draft contract",
          method: "POST",
          payload: {
            customerId: String(formData.get("customerId") ?? ""),
            startDate: String(formData.get("startDate") ?? ""),
            endDate: String(formData.get("endDate") ?? "") || null
          }
        }
      : action === "line"
        ? {
            path: `/api/contracts/${String(formData.get("contractId") ?? "")}/line-items`,
            label: "Line item",
            method: "POST",
            payload: {
              priceRuleId: String(formData.get("priceRuleId") ?? ""),
              name: String(formData.get("name") ?? ""),
              overrideConfig: {}
            }
          }
        : {
            path: `/api/contracts/${String(formData.get("contractId") ?? "")}/approve`,
            label: "Contract approval",
            method: "POST",
            payload: null
          };

    try {
      const response = await fetch(request.path, {
        method: request.method,
        headers: request.payload ? { "content-type": "application/json" } : undefined,
        body: request.payload ? JSON.stringify(request.payload) : undefined
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? `Could not complete ${request.label.toLowerCase()}`);
      }

      toast.success(`${request.label} complete`, { description: "Contract workspace updated." });
      setAction(null);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast.error("Contract action failed", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="data-panel contracts-workspace">
      <div className="data-toolbar">
        <div>
          <h2>Contracts</h2>
          <span>{filtered.length} of {contracts.length} shown</span>
        </div>
        <div className="data-toolbar-actions contract-toolbar-actions">
          <label className="data-search" htmlFor="contract-search">
            <span>Search</span>
            <input id="contract-search" onChange={(event) => setQuery(event.target.value)} placeholder="Customer, status, date" value={query} />
          </label>
          <label className="data-filter" htmlFor="contract-status-filter">
            <span>Status</span>
            <select id="contract-status-filter" onChange={(event) => setStatus(event.target.value as StatusFilter)} value={status}>
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="ready">Ready approval</option>
              <option value="active">Active</option>
            </select>
          </label>
          <div className="toolbar-button-group" aria-label="Contract actions">
            <button className="primary-link data-primary-action" disabled={Boolean(disabledReason("draft"))} onClick={() => openAction("draft")} title={disabledReason("draft") ?? undefined} type="button">Draft contract</button>
            <button className="secondary-command" disabled={Boolean(disabledReason("line"))} onClick={() => openAction("line")} title={disabledReason("line") ?? undefined} type="button">Add line item</button>
            <button className="secondary-command" disabled={Boolean(disabledReason("approve"))} onClick={() => openAction("approve")} title={disabledReason("approve") ?? undefined} type="button">Approve contract</button>
          </div>
          <button className="secondary-command" disabled={filtered.length === 0} onClick={() => exportContracts(filtered)} type="button">Export CSV</button>
        </div>
      </div>

      {contracts.length === 0 ? (
        <div className="blocked-notice" role="note"><strong>No contracts yet</strong><span>Create a draft manually or start with AI intake after customers and price rules exist.</span></div>
      ) : filtered.length === 0 ? (
        <p className="empty-state">No contracts match this filter.</p>
      ) : (
        <div className="data-table-scroll">
          <table>
            <thead><tr><th>Customer</th><th>Status</th><th>Start</th><th>End</th><th>Lines</th><th>Next</th></tr></thead>
            <tbody>
              {filtered.map((contract) => (
                <tr key={contract.id}>
                  <td><strong>{contract.customerName ?? contract.customerId}</strong></td>
                  <td><span className={`status-badge status-${contract.status}`}>{contract.status}</span></td>
                  <td>{new Date(contract.startDate).toLocaleDateString()}</td>
                  <td>{contract.endDate ? new Date(contract.endDate).toLocaleDateString() : "Open"}</td>
                  <td>{contract.lineItemCount}</td>
                  <td>{contract.status === "active" ? <a href="/usage">Ingest usage</a> : contract.lineItemCount > 0 ? "Ready for approval" : "Add line item"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {action ? (
        <div className="data-modal-backdrop" role="presentation">
          <section aria-labelledby="contract-action-title" aria-modal="true" className="data-modal" role="dialog">
            <div className="panel-title-row">
              <div>
                <p className="eyebrow">Contracts</p>
                <h2 id="contract-action-title">{action === "draft" ? "Draft contract" : action === "line" ? "Add line item" : "Approve contract"}</h2>
                <p>{action === "draft" ? "Create commercial coverage for a billable customer." : action === "line" ? "Attach a price rule to a draft contract." : "Activate a ready draft for downstream usage and invoices."}</p>
              </div>
              <button aria-label="Close contract modal" className="secondary-command" onClick={() => setAction(null)} type="button">Close</button>
            </div>

            <form className="data-modal-form" onSubmit={submitAction}>
              <ContractActionFields action={action} approvableContracts={approvableContracts} customers={customers} draftContracts={draftContracts} priceRules={priceRules} />
              {error ? <p className="error-text">{error}</p> : null}
              <div className="data-modal-actions">
                <span>{disabledReason(action) ?? "This action updates the contract workflow immediately."}</span>
                <button disabled={isSubmitting || Boolean(disabledReason(action))} type="submit">{isSubmitting ? "Working..." : action === "draft" ? "Create draft" : action === "line" ? "Add line item" : "Approve contract"}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function ContractActionFields({ action, approvableContracts, customers, draftContracts, priceRules }: { action: ContractAction; approvableContracts: ContractSummary[]; customers: Customer[]; draftContracts: ContractSummary[]; priceRules: PriceRule[] }) {
  if (action === "draft") {
    return <><div><label htmlFor="contract-customer">Customer</label><select id="contract-customer" name="customerId" required><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></div><div className="inline-fields"><div><label htmlFor="start-date">Start date</label><input id="start-date" name="startDate" required type="date" /></div><div><label htmlFor="end-date">End date</label><input id="end-date" name="endDate" type="date" /></div></div></>;
  }

  if (action === "line") {
    return <><div><label htmlFor="line-contract">Draft contract</label><select id="line-contract" name="contractId" required><option value="">Select contract</option>{draftContracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.customerName ?? contract.customerId}</option>)}</select></div><div><label htmlFor="line-price-rule">Price rule</label><select id="line-price-rule" name="priceRuleId" required><option value="">Select price rule</option>{priceRules.map((priceRule) => <option key={priceRule.id} value={priceRule.id}>{priceRule.pricingModel} - {priceRule.currency} {priceRule.unitPrice}</option>)}</select></div><div><label htmlFor="line-name">Line item name</label><input id="line-name" name="name" required placeholder="Usage charges" /></div></>;
  }

  return <><div><label htmlFor="approve-contract">Ready draft</label><select id="approve-contract" name="contractId" required><option value="">Select contract</option>{approvableContracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.customerName ?? contract.customerId}</option>)}</select></div><div className="consequence-note">Approval activates this contract for usage aggregation and invoice generation.</div></>;
}