import { listAuditLogs } from "@/lib/api-client";

function formatJson(value: unknown) {
  if (value === null || value === undefined) {
    return "None";
  }

  return JSON.stringify(value, null, 2);
}

export default async function AuditPage() {
  const auditLogs = await listAuditLogs();
  const aiEventCount = auditLogs.filter((log) => log.entityType === "ai_extraction_run").length;

  return (
    <main className="shell page-grid">
      <section className="hero compact">
        <p className="eyebrow">Audit</p>
        <h1>Operational trail</h1>
        <p className="lede">Review finance-impacting and AI-assisted workflow changes captured during the current workflow.</p>
      </section>

      <section className="table-panel table-scroll">
        <div className="table-header">
          <h2>Audit events</h2>
          <span>{auditLogs.length} recent · {aiEventCount} AI-assisted</span>
        </div>

        {auditLogs.length === 0 ? (
          <p className="empty-state">No audit events yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Entity</th>
                <th>Actor</th>
                <th>Created</th>
                <th>After state</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((auditLog) => {
                const isAiExtraction = auditLog.entityType === "ai_extraction_run";

                return (
                  <tr key={auditLog.id}>
                    <td>
                      {auditLog.action}
                      {isAiExtraction ? (
                        <>
                          <br />
                          <a className="audit-context-link" href="/ai">Open AI review</a>
                        </>
                      ) : null}
                    </td>
                    <td>
                      {auditLog.entityType}
                      <br />
                      <span className="muted-text">{auditLog.entityId}</span>
                    </td>
                    <td>{auditLog.actor}</td>
                    <td>{new Date(auditLog.createdAt).toLocaleString()}</td>
                    <td>
                      <pre className="inline-code-block">{formatJson(auditLog.afterState)}</pre>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}