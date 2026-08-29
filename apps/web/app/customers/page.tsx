import { WorkspaceShell } from "../workspace-shell";
import { getAuthenticationContext, listCustomers } from "@/lib/api-client";
import { hasCapability } from "@/lib/access";
import { NextAction, WorkflowGuide, WorkflowPageHeader } from "../workflow-components";
import { PermissionNotice } from "../permission-notice";

import { CustomerCreateForm } from "./customer-create-form";
import { CustomerTable } from "./customer-table";

export default async function CustomersPage() {
  const [context, customers] = await Promise.all([getAuthenticationContext(), listCustomers()]);
  const canWriteCustomers = context.status === "ready" && hasCapability(context.actor, "customers.write");

  return (
    <WorkspaceShell activePath="/customers">
      <main className="workspace-page page-grid">
        <WorkflowPageHeader
          breadcrumbs={[{ href: "/overview", label: "Overview" }, { label: "Customers" }]}
          eyebrow="Configure"
          title="Billable accounts"
          description="Create and maintain the external accounts that contracts, invoices, revenue schedules, and audit events attach to."
          actions={canWriteCustomers ? <CustomerCreateForm /> : undefined}
        />

        <WorkflowGuide
          title="Customer setup flow"
          items={[
            { label: "Create customer", detail: customers.length > 0 ? `${customers.length} customers available` : "Start with the billed account", status: customers.length > 0 ? "done" : "active" },
            { href: "/catalog", label: "Configure catalog", detail: "Products, meters, plans, and price rules come next", status: customers.length > 0 ? "active" : "blocked" },
            { href: "/contracts", label: "Draft contract", detail: "Commercial terms need a customer and price rules", status: customers.length > 0 ? "idle" : "blocked" }
          ]}
        />
        {!canWriteCustomers ? <PermissionNotice capability="customers.write" label="Customer changes" /> : null}

        <CustomerTable customers={customers} />

        {customers.length > 0 ? <NextAction href="/catalog" title="Next: configure catalog">Define products, meters, plans, and price rules before drafting contract terms.</NextAction> : null}
      </main>
    </WorkspaceShell>
  );
}