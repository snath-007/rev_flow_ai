import { WorkspaceShell } from "../workspace-shell";
import { getAuthenticationContext, listInvoices, listJournalEntries, listRevenueSchedules } from "@/lib/api-client";
import { hasCapability } from "@/lib/access";
import { NextAction, WorkflowGuide, WorkflowPageHeader } from "../workflow-components";
import { PermissionNotice } from "../permission-notice";
import { RevenueWorkspace } from "./revenue-workspace";

export default async function RevenuePage() {
  const [context, invoices, schedules, journalEntries] = await Promise.all([
    getAuthenticationContext(),
    listInvoices(),
    listRevenueSchedules(),
    listJournalEntries()
  ]);

  const canGenerateRevenue = context.status === "ready" && hasCapability(context.actor, "revenue.generate");
  const approvedInvoices = invoices.filter((invoice) => invoice.status === "approved");

  return (
    <WorkspaceShell activePath="/revenue">
      <main className="workspace-page page-grid">
        <WorkflowPageHeader
          breadcrumbs={[{ href: "/overview", label: "Overview" }, { label: "Revenue" }]}
          eyebrow="Recognize"
          title="Earned revenue schedules"
          description="Generate deterministic recognition schedules from approved invoices and inspect the journal evidence created from those schedules."
        />

        <WorkflowGuide
          title="Recognition flow"
          items={[
            { href: "/invoices", label: "Approved invoice", detail: `${approvedInvoices.length} available`, status: approvedInvoices.length > 0 ? "done" : "blocked" },
            { label: "Schedule", detail: `${schedules.length} generated`, status: schedules.length > 0 ? "done" : approvedInvoices.length > 0 ? "active" : "blocked" },
            { label: "Journal entry", detail: `${journalEntries.length} created`, status: journalEntries.length > 0 ? "done" : schedules.length > 0 ? "active" : "blocked" },
            { href: "/audit", label: "Audit", detail: "Review actor and state changes", status: journalEntries.length > 0 ? "active" : "idle" }
          ]}
        />

        {!canGenerateRevenue ? <PermissionNotice capability="revenue.generate" label="Revenue generation" /> : null}

        <RevenueWorkspace canGenerate={canGenerateRevenue} invoices={invoices} schedules={schedules} journalEntries={journalEntries} />

        {journalEntries.length > 0 ? <NextAction href="/audit" title="Next: inspect audit trail">Follow the generated finance records back through actor, source, and state history.</NextAction> : null}
      </main>
    </WorkspaceShell>
  );
}