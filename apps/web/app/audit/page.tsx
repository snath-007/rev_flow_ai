import { WorkspaceShell } from "../workspace-shell";
import { listAuditLogs } from "@/lib/api-client";
import { WorkflowPageHeader } from "../workflow-components";
import { AuditTable } from "./audit-table";

export default async function AuditPage() {
  const auditLogs = await listAuditLogs();

  return (
    <WorkspaceShell activePath="/audit">
      <main className="workspace-page page-grid">
        <WorkflowPageHeader
          breadcrumbs={[{ href: "/overview", label: "Overview" }, { label: "Audit" }]}
          eyebrow="Control"
          title="Operational trail"
          description="Review finance-impacting and AI-assisted workflow changes with actor, entity, state, and timestamp evidence."
        />

        <AuditTable auditLogs={auditLogs} />
      </main>
    </WorkspaceShell>
  );
}