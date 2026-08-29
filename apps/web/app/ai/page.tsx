import { WorkspaceShell } from "../workspace-shell";
import { getAuthenticationContext, listAiExtractions } from "@/lib/api-client";
import { hasAnyCapability, hasCapability } from "@/lib/access";
import { BlockedNotice, EvidenceStrip, NextAction, VisualBars, WorkflowGuide, WorkflowPageHeader } from "../workflow-components";
import { PermissionNotice } from "../permission-notice";

import { AiExtractionCreateForm, AiReviewWorkbench } from "./ai-forms";

export default async function AiExtractionPage() {
  const [context, extractions] = await Promise.all([getAuthenticationContext(), listAiExtractions()]);
  const canExtract = context.status === "ready" && hasCapability(context.actor, "ai.extract");
  const canReviewOrApply = context.status === "ready" && hasAnyCapability(context.actor, ["ai.review", "ai.apply"]);
  const extracted = extractions.filter((run) => run.status === "extracted" || run.status === "reviewing").length;
  const approved = extractions.filter((run) => run.status === "approved").length;
  const applied = extractions.filter((run) => run.status === "applied").length;

  return (
    <WorkspaceShell activePath="/ai">
      <main className="workspace-page page-grid">
        <WorkflowPageHeader
          breadcrumbs={[{ href: "/overview", label: "Overview" }, { href: "/contracts", label: "Contracts" }, { label: "AI intake" }]}
          eyebrow="Configure"
          title="Contract review workspace"
          description="Extract commercial terms into structured fields, resolve every decision, and apply approved output into draft records under human control."
          actions={canExtract ? <><AiExtractionCreateForm /><a className="primary-link secondary" href="/contracts">Open contracts</a></> : <a className="primary-link secondary" href="/contracts">Open contracts</a>}
        />

        <WorkflowGuide
          title="AI-assisted contract flow"
          items={[
            { label: "Extract", detail: `${extractions.length} runs created`, status: extractions.length > 0 ? "done" : "active" },
            { label: "Review fields", detail: `${extracted} runs need review`, status: extracted > 0 ? "active" : extractions.length > 0 ? "done" : "blocked" },
            { label: "Apply draft", detail: `${approved} approved runs`, status: approved > 0 ? "active" : applied > 0 ? "done" : "blocked" },
            { href: "/contracts", label: "Approve contract", detail: `${applied} applied runs`, status: applied > 0 ? "active" : "blocked" }
          ]}
        />

        <EvidenceStrip
          items={[
            { label: "Runs", value: extractions.length },
            { label: "Needs review", value: extracted },
            { label: "Approved", value: approved },
            { label: "Applied", value: applied }
          ]}
        />

        <VisualBars
          title="AI review state"
          items={[
            { label: "Review", value: extracted, color: "var(--amber)" },
            { label: "Approved", value: approved, color: "var(--teal)" },
            { label: "Applied", value: applied, color: "var(--blue)" }
          ]}
        />
        {!canExtract ? <PermissionNotice capability="ai.extract" label="AI extraction intake" /> : null}

        <section className="table-panel table-scroll extraction-runs-panel">
            <div className="table-header">
              <h2>Extraction runs</h2>
              <span>{extractions.length} total</span>
            </div>
            {extractions.length === 0 ? (
              <BlockedNotice title="No extraction runs yet">Paste contract text to create a structured review package. Manual contract drafting remains available under Contracts.</BlockedNotice>
            ) : (
              <table>
                <thead><tr><th>Source</th><th>Status</th><th>Confidence</th><th>Provider</th><th>Created</th><th>Next</th></tr></thead>
                <tbody>
                  {extractions.map((run) => (
                    <tr key={run.id}>
                      <td>{run.sourceName ?? "Untitled source"}</td>
                      <td><span className={`status-badge status-${run.status}`}>{run.status}</span></td>
                      <td>{run.confidenceSummary ? `${Math.round(run.confidenceSummary.overall * 100)}%` : "-"}</td>
                      <td>{run.provider}</td>
                      <td>{new Date(run.createdAt).toLocaleString()}</td>
                      <td>{run.status === "applied" ? <a href="/contracts">Open contract</a> : run.status === "approved" ? "Apply draft" : "Review fields"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </section>

        {canReviewOrApply ? <AiReviewWorkbench extractions={extractions} /> : <PermissionNotice capability="ai.review" label="AI review workbench" />}
        {applied > 0 ? <NextAction href="/contracts" title="Next: activate contract">Review the applied draft and approve the resulting contract when ready.</NextAction> : null}
      </main>
    </WorkspaceShell>
  );
}