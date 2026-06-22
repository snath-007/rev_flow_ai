import { listAiExtractions } from "@/lib/api-client";

import { AiExtractionCreateForm, AiReviewWorkbench } from "./ai-forms";

export default async function AiExtractionPage() {
  const extractions = await listAiExtractions();

  return (
    <main className="shell page-grid">
      <section className="hero compact">
        <p className="eyebrow">AI-assisted extraction</p>
        <h1>Contract review workspace</h1>
        <p className="lede">Extract commercial terms into a reviewable draft while keeping approval and financial activation under explicit human control.</p>
      </section>

      <section className="ai-intake-grid">
        <AiExtractionCreateForm />
        <div className="table-panel table-scroll">
          <div className="table-header">
            <h2>Extraction runs</h2>
            <span>{extractions.length} total</span>
          </div>
          {extractions.length === 0 ? (
            <p className="empty-state">No extraction runs yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Confidence</th>
                  <th>Provider</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {extractions.map((run) => (
                  <tr key={run.id}>
                    <td>{run.sourceName ?? "Untitled source"}</td>
                    <td><span className={`status-badge status-${run.status}`}>{run.status}</span></td>
                    <td>{run.confidenceSummary ? `${Math.round(run.confidenceSummary.overall * 100)}%` : "-"}</td>
                    <td>{run.provider}</td>
                    <td>{new Date(run.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <AiReviewWorkbench extractions={extractions} />
    </main>
  );
}