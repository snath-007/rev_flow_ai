import { listJobRuns } from "@/lib/api-client";

function formatJson(value: unknown) {
  if (value === null || value === undefined) {
    return "None";
  }

  return JSON.stringify(value, null, 2);
}

export default async function OpsPage() {
  const jobRuns = await listJobRuns();

  return (
    <main className="shell page-grid">
      <section className="hero compact">
        <p className="eyebrow">Operations</p>
        <h1>Job runs</h1>
        <p className="lede">Inspect recent background work for usage aggregation and future billing jobs.</p>
      </section>

      <section className="table-panel">
        <div className="table-header">
          <h2>Recent jobs</h2>
          <span>{jobRuns.length} recent</span>
        </div>

        {jobRuns.length === 0 ? (
          <p className="empty-state">No job runs yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Queue</th>
                <th>Job</th>
                <th>Started</th>
                <th>Finished</th>
                <th>Payload</th>
              </tr>
            </thead>
            <tbody>
              {jobRuns.map((jobRun) => (
                <tr key={jobRun.id}>
                  <td>{jobRun.status}</td>
                  <td>{jobRun.queueName}</td>
                  <td>
                    {jobRun.jobName}
                    <br />
                    <span className="muted-text">{jobRun.jobId ?? "No queue id"}</span>
                  </td>
                  <td>{new Date(jobRun.startedAt).toLocaleString()}</td>
                  <td>{jobRun.finishedAt ? new Date(jobRun.finishedAt).toLocaleString() : "Running"}</td>
                  <td>
                    <pre className="inline-code-block">{formatJson(jobRun.errorMessage ?? jobRun.result ?? jobRun.payload)}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
