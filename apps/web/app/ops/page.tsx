import { WorkspaceShell } from "../workspace-shell";
import { listJobRuns } from "@/lib/api-client";
import { WorkflowPageHeader } from "../workflow-components";
import { OpsWorkspace } from "./ops-workspace";

export default async function OpsPage() {
  const jobRuns = await listJobRuns();

  return (
    <WorkspaceShell activePath="/ops">
      <main className="workspace-page page-grid">
        <WorkflowPageHeader
          breadcrumbs={[{ href: "/overview", label: "Overview" }, { label: "Operations" }]}
          eyebrow="Control"
          title="Job runs"
          description="Inspect recent background work for usage aggregation and future billing jobs, including payload, result, and failure evidence."
        />

        <OpsWorkspace jobRuns={jobRuns} />
      </main>
    </WorkspaceShell>
  );
}