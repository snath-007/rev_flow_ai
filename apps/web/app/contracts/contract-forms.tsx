"use client";

import type { ContractSummary, Customer, PriceRule } from "@revflow/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";

function useSubmitState() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return { error, setError, isSubmitting, setIsSubmitting };
}

export function ContractCreateForm({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const { error, setError, isSubmitting, setIsSubmitting } = useSubmitState();

  async function onSubmit(formData: FormData) {
    setError(null);
    setIsSubmitting(true);

    const endDate = String(formData.get("endDate") ?? "");
    const payload = {
      customerId: String(formData.get("customerId") ?? ""),
      startDate: String(formData.get("startDate") ?? ""),
      endDate: endDate || null
    };

    try {
      const response = await fetch("/api/contracts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Could not create contract");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={onSubmit} className="form-panel">
      <h2>New draft contract</h2>
      <div>
        <label htmlFor="contract-customer">Customer</label>
        <select id="contract-customer" name="customerId" required disabled={customers.length === 0}>
          <option value="">Select customer</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>{customer.name}</option>
          ))}
        </select>
      </div>
      <div className="inline-fields">
        <div>
          <label htmlFor="start-date">Start date</label>
          <input id="start-date" name="startDate" required type="date" />
        </div>
        <div>
          <label htmlFor="end-date">End date</label>
          <input id="end-date" name="endDate" type="date" />
        </div>
      </div>
      {customers.length === 0 ? <p className="form-help">Create a customer before drafting a contract.</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      <button disabled={isSubmitting || customers.length === 0} type="submit">
        {isSubmitting ? "Creating..." : "Create draft"}
      </button>
    </form>
  );
}

export function ContractLineItemForm({ contracts, priceRules }: { contracts: ContractSummary[]; priceRules: PriceRule[] }) {
  const router = useRouter();
  const { error, setError, isSubmitting, setIsSubmitting } = useSubmitState();
  const draftContracts = contracts.filter((contract) => contract.status === "draft");

  async function onSubmit(formData: FormData) {
    setError(null);
    setIsSubmitting(true);

    const contractId = String(formData.get("contractId") ?? "");
    const payload = {
      priceRuleId: String(formData.get("priceRuleId") ?? ""),
      name: String(formData.get("name") ?? ""),
      overrideConfig: {}
    };

    try {
      const response = await fetch(`/api/contracts/${contractId}/line-items`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Could not add line item");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={onSubmit} className="form-panel">
      <h2>Add line item</h2>
      <div>
        <label htmlFor="line-contract">Draft contract</label>
        <select id="line-contract" name="contractId" required disabled={draftContracts.length === 0}>
          <option value="">Select contract</option>
          {draftContracts.map((contract) => (
            <option key={contract.id} value={contract.id}>{contract.customerName ?? contract.customerId}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="line-price-rule">Price rule</label>
        <select id="line-price-rule" name="priceRuleId" required disabled={priceRules.length === 0}>
          <option value="">Select price rule</option>
          {priceRules.map((priceRule) => (
            <option key={priceRule.id} value={priceRule.id}>{priceRule.pricingModel} - {priceRule.currency} {priceRule.unitPrice}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="line-name">Line item name</label>
        <input id="line-name" name="name" required placeholder="Usage charges" />
      </div>
      {draftContracts.length === 0 ? <p className="form-help">Create a draft contract before adding line items.</p> : null}
      {priceRules.length === 0 ? <p className="form-help">Create a price rule before adding contract line items.</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      <button disabled={isSubmitting || draftContracts.length === 0 || priceRules.length === 0} type="submit">
        {isSubmitting ? "Adding..." : "Add line item"}
      </button>
    </form>
  );
}

export function ContractApproveForm({ contracts }: { contracts: ContractSummary[] }) {
  const router = useRouter();
  const { error, setError, isSubmitting, setIsSubmitting } = useSubmitState();
  const approvableContracts = contracts.filter((contract) => contract.status === "draft" && contract.lineItemCount > 0);

  async function onSubmit(formData: FormData) {
    setError(null);
    setIsSubmitting(true);

    const contractId = String(formData.get("contractId") ?? "");

    if (!window.confirm("Approve this contract and make it active for billing, usage, invoice, and revenue workflows?")) {
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/contracts/${contractId}/approve`, {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error("Could not approve contract");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={onSubmit} className="form-panel">
      <h2>Approve contract</h2>
      <div>
        <label htmlFor="approve-contract">Ready draft</label>
        <select id="approve-contract" name="contractId" required disabled={approvableContracts.length === 0}>
          <option value="">Select contract</option>
          {approvableContracts.map((contract) => (
            <option key={contract.id} value={contract.id}>{contract.customerName ?? contract.customerId}</option>
          ))}
        </select>
      </div>
      {approvableContracts.length === 0 ? <p className="form-help">Only draft contracts with at least one line item can be approved.</p> : null}
      <div className="consequence-note">Approval activates this contract for usage aggregation and invoice generation.</div>
      {error ? <p className="error-text">{error}</p> : null}
      <button disabled={isSubmitting || approvableContracts.length === 0} type="submit">
        {isSubmitting ? "Approving..." : "Approve contract"}
      </button>
    </form>
  );
}
