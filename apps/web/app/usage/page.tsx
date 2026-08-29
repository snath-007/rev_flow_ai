import { WorkspaceShell } from "../workspace-shell";
import { getAuthenticationContext, listContracts, listMeters, listUsageAggregates, listUsageEvents } from "@/lib/api-client";
import { hasCapability } from "@/lib/access";
import { NextAction, WorkflowGuide, WorkflowPageHeader } from "../workflow-components";
import { PermissionNotice } from "../permission-notice";
import { UsageWorkspace } from "./usage-workspace";

export default async function UsagePage() {
  const [context, contracts, meters, events, aggregates] = await Promise.all([
    getAuthenticationContext(),
    listContracts(),
    listMeters(),
    listUsageEvents(),
    listUsageAggregates()
  ]);
  const canWriteUsage = context.status === "ready" && hasCapability(context.actor, "usage.write");
  const activeContracts = contracts.filter((contract) => contract.status === "active");

  return (
    <WorkspaceShell activePath="/usage">
      <main className="workspace-page page-grid">
        <WorkflowPageHeader
          breadcrumbs={[{ href: "/overview", label: "Overview" }, { label: "Operate" }]}
          eyebrow="Operate"
          title="Metered activity"
          description="Ingest raw usage events, preserve idempotency, and inspect billable aggregates before invoice generation."
        />

        <WorkflowGuide
          title="Usage path"
          items={[
            { href: "/contracts", label: "Active contract", detail: `${activeContracts.length} active`, status: activeContracts.length > 0 ? "done" : "blocked" },
            { href: "/catalog", label: "Meter", detail: `${meters.length} configured`, status: meters.length > 0 ? "done" : "blocked" },
            { label: "Event intake", detail: `${events.length} accepted`, status: events.length > 0 ? "done" : activeContracts.length > 0 && meters.length > 0 ? "active" : "blocked" },
            { label: "Aggregate", detail: `${aggregates.length} billable groups`, status: aggregates.length > 0 ? "done" : events.length > 0 ? "active" : "blocked" }
          ]}
        />

        {!canWriteUsage ? <PermissionNotice capability="usage.write" label="Usage ingestion" /> : null}

        <UsageWorkspace canWrite={canWriteUsage} contracts={contracts} meters={meters} events={events} aggregates={aggregates} />

        {aggregates.length > 0 ? <NextAction href="/invoices" title="Next: generate invoice">Use aggregate periods and active contracts to create draft invoices.</NextAction> : null}
      </main>
    </WorkspaceShell>
  );
}