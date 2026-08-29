import { WorkspaceShell } from "../workspace-shell";
import { getAuthenticationContext, listContracts, listCustomers, listPriceRules } from "@/lib/api-client";
import { hasCapability } from "@/lib/access";
import { NextAction, WorkflowGuide, WorkflowPageHeader } from "../workflow-components";
import { PermissionNotice } from "../permission-notice";

import { ContractsWorkspace } from "./contracts-workspace";

export default async function ContractsPage() {
  const [context, customers, contracts, priceRules] = await Promise.all([
    getAuthenticationContext(),
    listCustomers(),
    listContracts(),
    listPriceRules()
  ]);

  const canWriteContracts = context.status === "ready" && hasCapability(context.actor, "contracts.write");
  const canApproveContracts = context.status === "ready" && hasCapability(context.actor, "contracts.approve");
  const draftContracts = contracts.filter((contract) => contract.status === "draft");
  const activeContracts = contracts.filter((contract) => contract.status === "active");
  const approvableContracts = draftContracts.filter((contract) => contract.lineItemCount > 0);

  return (
    <WorkspaceShell activePath="/contracts">
      <main className="workspace-page page-grid">
        <WorkflowPageHeader
          breadcrumbs={[{ href: "/overview", label: "Overview" }, { label: "Contracts" }]}
          eyebrow="Configure"
          title="Customer commercial terms"
          description="Draft contract terms, attach price rules, and approve eligible contracts into active billing configuration."
          actions={<a className="primary-link secondary" href="/ai">Use AI intake</a>}
        />

        <WorkflowGuide
          title="Contract activation flow"
          items={[
            { href: "/customers", label: "Customer", detail: `${customers.length} available`, status: customers.length > 0 ? "done" : "blocked" },
            { href: "/catalog", label: "Price rule", detail: `${priceRules.length} available`, status: priceRules.length > 0 ? "done" : "blocked" },
            { label: "Draft", detail: `${draftContracts.length} draft contracts`, status: draftContracts.length > 0 ? "done" : customers.length > 0 && priceRules.length > 0 ? "active" : "blocked" },
            { label: "Approve", detail: `${approvableContracts.length} ready for approval`, status: activeContracts.length > 0 ? "done" : approvableContracts.length > 0 ? "active" : "blocked" }
          ]}
        />

        {!canWriteContracts ? <PermissionNotice capability="contracts.write" label="Contract drafting" /> : null}
        {!canApproveContracts ? <PermissionNotice capability="contracts.approve" label="Contract approval" /> : null}

        <ContractsWorkspace canApprove={canApproveContracts} canWrite={canWriteContracts} contracts={contracts} customers={customers} priceRules={priceRules} />

        {activeContracts.length > 0 ? <NextAction href="/usage" title="Next: ingest usage">Use active contracts and meters to create billable usage aggregates.</NextAction> : null}
      </main>
    </WorkspaceShell>
  );
}