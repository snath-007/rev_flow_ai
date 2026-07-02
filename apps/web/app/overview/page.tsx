import { getAuthenticationContext, listAuditLogs, listContracts, listInvoices, listJobRuns, listUsageAggregates } from "@/lib/api-client";

import { DonutMetric, EvidenceStrip, PipelineMap, QueueBoard, TimelinePanel } from "../workflow-components";
import { WorkspaceShell } from "../workspace-shell";

function roleLabel(role: string) {
  return role.replace(/_/g, " ");
}

export default async function OverviewPage() {
  const [context, contracts, invoices, aggregates, auditLogs, jobRuns] = await Promise.all([
    getAuthenticationContext(),
    listContracts(),
    listInvoices(),
    listUsageAggregates(),
    listAuditLogs(),
    listJobRuns()
  ]);

  const actor = context.status === "ready" ? context.actor : null;
  const draftContracts = contracts.filter((contract) => contract.status === "draft").length;
  const activeContracts = contracts.filter((contract) => contract.status === "active").length;
  const draftInvoices = invoices.filter((invoice) => invoice.status === "draft").length;
  const approvedInvoices = invoices.filter((invoice) => invoice.status === "approved").length;
  const recentFailures = jobRuns.filter((jobRun) => jobRun.status === "failed").length;
  const completedJobs = jobRuns.filter((jobRun) => jobRun.status !== "failed").length;
  const aiAuditEvents = auditLogs.filter((log) => log.entityType === "ai_extraction_run").length;
  const totalReviewItems = draftContracts + draftInvoices + recentFailures;
  const operationalRecords = contracts.length + aggregates.length + invoices.length;

  return (
    <WorkspaceShell activePath="/overview">
      <main className="workspace-page page-grid">
        <section className="hero compact">
          <p className="eyebrow">Overview</p>
          <h1>Workspace command center</h1>
          <p className="lede">
            Follow the contract-to-revenue operating system from setup through audit evidence, with queues and health signals derived from the live workspace data.
          </p>
        </section>

        <EvidenceStrip
          items={[
            { label: "Role", value: actor ? roleLabel(actor.role) : "Pending" },
            { label: "Capabilities", value: actor ? actor.capabilities.length : 0 },
            { label: "Review queue", value: totalReviewItems },
            { label: "Evidence events", value: auditLogs.length }
          ]}
        />

        <PipelineMap
          items={[
            { href: "/customers", label: "Customer", value: contracts.length > 0 ? contracts.length : 0, detail: `${contracts.length} contract-linked records`, tone: "blue" },
            { href: "/contracts", label: "Contract", value: contracts.length, detail: `${activeContracts} active / ${draftContracts} draft`, tone: "terracotta" },
            { href: "/ai", label: "AI review", value: aiAuditEvents, detail: `${aiAuditEvents} extraction audit events`, tone: "blue" },
            { href: "/usage", label: "Usage", value: aggregates.length, detail: `${aggregates.length} billable aggregate groups`, tone: "teal" },
            { href: "/invoices", label: "Invoice", value: invoices.length, detail: `${approvedInvoices} approved / ${draftInvoices} draft`, tone: "amber" },
            { href: "/revenue", label: "Revenue", value: approvedInvoices, detail: `${approvedInvoices} invoice sources ready`, tone: "teal" },
            { href: "/audit", label: "Audit", value: auditLogs.length, detail: `${auditLogs.length} traceable events`, tone: "terracotta" }
          ]}
        />

        <section className="overview-insight-grid" aria-label="Workspace insight summary">
          <DonutMetric title="Contract activation" value={activeContracts} total={Math.max(contracts.length, 1)} detail={`${activeContracts} of ${contracts.length} contracts are active`} tone="teal" />
          <DonutMetric title="Invoice approval" value={approvedInvoices} total={Math.max(invoices.length, 1)} detail={`${approvedInvoices} of ${invoices.length} invoices approved`} tone="blue" />
          <DonutMetric title="Job health" value={completedJobs} total={Math.max(jobRuns.length, 1)} detail={`${recentFailures} failed jobs in recent runs`} tone={recentFailures > 0 ? "danger" : "teal"} />
        </section>

        <section className="two-column overview-columns">
          <QueueBoard
            title="Finance review queue"
            items={[
              { href: "/contracts", label: "Draft contracts", value: draftContracts, detail: "Need line items or approval before usage can flow", tone: "terracotta" },
              { href: "/invoices", label: "Draft invoices", value: draftInvoices, detail: "Waiting for finance approval before recognition", tone: "amber" },
              { href: "/ops", label: "Failed jobs", value: recentFailures, detail: "Operational exceptions that can block automation", tone: recentFailures > 0 ? "danger" : "teal" },
              { href: "/audit", label: "AI evidence", value: aiAuditEvents, detail: "Extraction decisions captured in audit trail", tone: "blue" }
            ]}
          />

          <TimelinePanel
            title="Recent evidence"
            items={auditLogs.length === 0 ? [{ label: "No audit activity yet", detail: "Workflow state changes will appear here." }] : auditLogs.slice(0, 5).map((log) => ({
              label: log.action,
              detail: `${log.actor} - ${new Date(log.createdAt).toLocaleString()}`
            }))}
          />
        </section>

        <EvidenceStrip
          items={[
            { label: "Operational records", value: operationalRecords },
            { label: "Usage aggregates", value: aggregates.length },
            { label: "Job runs", value: jobRuns.length },
            { label: "Failed jobs", value: recentFailures }
          ]}
        />
      </main>
    </WorkspaceShell>
  );
}