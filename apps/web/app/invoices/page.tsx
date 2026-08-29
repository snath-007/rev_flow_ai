import { WorkspaceShell } from "../workspace-shell";
import { getAuthenticationContext, listContracts, listInvoices } from "@/lib/api-client";
import { hasCapability } from "@/lib/access";
import { NextAction, WorkflowGuide, WorkflowPageHeader } from "../workflow-components";
import { PermissionNotice } from "../permission-notice";
import { InvoicesWorkspace } from "./invoices-workspace";

export default async function InvoicesPage() {
  const [context, contracts, invoices] = await Promise.all([
    getAuthenticationContext(),
    listContracts(),
    listInvoices()
  ]);

  const canGenerateInvoices = context.status === "ready" && hasCapability(context.actor, "invoices.generate");
  const canApproveInvoices = context.status === "ready" && hasCapability(context.actor, "invoices.approve");
  const activeContracts = contracts.filter((contract) => contract.status === "active");
  const draftInvoices = invoices.filter((invoice) => invoice.status === "draft");
  const approvedInvoices = invoices.filter((invoice) => invoice.status === "approved");

  return (
    <WorkspaceShell activePath="/invoices">
      <main className="workspace-page page-grid">
        <WorkflowPageHeader
          breadcrumbs={[{ href: "/overview", label: "Overview" }, { label: "Invoices" }]}
          eyebrow="Operate"
          title="Draft billing review"
          description="Generate draft invoices from active contracts and metered usage, then approve them for downstream revenue recognition."
        />

        <WorkflowGuide
          title="Invoice workflow"
          items={[
            { href: "/contracts", label: "Active contract", detail: `${activeContracts.length} active`, status: activeContracts.length > 0 ? "done" : "blocked" },
            { href: "/usage", label: "Usage aggregate", detail: "Metered usage feeds invoice lines", status: activeContracts.length > 0 ? "active" : "blocked" },
            { label: "Draft invoice", detail: `${draftInvoices.length} waiting`, status: draftInvoices.length > 0 ? "active" : approvedInvoices.length > 0 ? "done" : "idle" },
            { label: "Approve", detail: `${approvedInvoices.length} approved`, status: approvedInvoices.length > 0 ? "done" : draftInvoices.length > 0 ? "active" : "blocked" }
          ]}
        />

        {!canGenerateInvoices ? <PermissionNotice capability="invoices.generate" label="Invoice generation" /> : null}
        {!canApproveInvoices ? <PermissionNotice capability="invoices.approve" label="Invoice approval" /> : null}

        <InvoicesWorkspace canGenerate={canGenerateInvoices} canApprove={canApproveInvoices} contracts={contracts} invoices={invoices} />

        {approvedInvoices.length > 0 ? <NextAction href="/revenue" title="Next: generate revenue schedules">Convert approved invoices into deterministic recognition schedules and journal entries.</NextAction> : null}
      </main>
    </WorkspaceShell>
  );
}