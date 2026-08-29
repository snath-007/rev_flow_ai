"use client";

import type { JobRun, JobRunStatus } from "@revflow/shared";
import { useEffect, useMemo, useState } from "react";

type StatusFilter = "all" | JobRunStatus;
type QueueFilter = "all" | string;

const pageSizes = [10, 25, 50];
const statusOptions: StatusFilter[] = ["all", "running", "succeeded", "failed"];

function formatJson(value: unknown) {
  if (value === null || value === undefined) return "None";
  return JSON.stringify(value, null, 2);
}

function csvEscape(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function includesTerm(values: (string | number | null | undefined)[], term: string) {
  return values.some((value) => String(value ?? "").toLowerCase().includes(term));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Running";
  return new Date(value).toLocaleString();
}

function durationMs(jobRun: JobRun) {
  const end = jobRun.finishedAt ? new Date(jobRun.finishedAt).getTime() : Date.now();
  return Math.max(0, end - new Date(jobRun.startedAt).getTime());
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s`;
}

function exportJobRuns(jobRuns: JobRun[]) {
  downloadCsv("revflow-job-runs.csv", [["Status", "Queue", "Job", "Queue id", "Duration", "Started", "Finished", "Error", "Payload", "Result"], ...jobRuns.map((jobRun) => [jobRun.status, jobRun.queueName, jobRun.jobName, jobRun.jobId, formatDuration(durationMs(jobRun)), jobRun.startedAt, jobRun.finishedAt, jobRun.errorMessage, JSON.stringify(jobRun.payload ?? null), JSON.stringify(jobRun.result ?? null)])]);
}

export function OpsWorkspace({ jobRuns }: { jobRuns: JobRun[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [queue, setQueue] = useState<QueueFilter>("all");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const queues = useMemo(() => [...new Set(jobRuns.map((jobRun) => jobRun.queueName))].sort(), [jobRuns]);
  const term = query.trim().toLowerCase();
  const filtered = useMemo(() => jobRuns.filter((jobRun) => {
    const statusMatches = status === "all" || jobRun.status === status;
    const queueMatches = queue === "all" || jobRun.queueName === queue;
    const termMatches = !term || includesTerm([jobRun.queueName, jobRun.jobName, jobRun.jobId, jobRun.status, jobRun.errorMessage], term);
    return statusMatches && queueMatches && termMatches;
  }), [jobRuns, queue, status, term]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(startIndex, startIndex + pageSize);
  const succeededCount = filtered.filter((jobRun) => jobRun.status === "succeeded").length;
  const failedCount = filtered.filter((jobRun) => jobRun.status === "failed").length;
  const runningCount = filtered.filter((jobRun) => jobRun.status === "running").length;
  const healthTotal = Math.max(succeededCount + failedCount + runningCount, 1);
  const avgDuration = filtered.length === 0 ? 0 : filtered.reduce((sum, jobRun) => sum + durationMs(jobRun), 0) / filtered.length;
  const queueMix = useMemo(() => {
    const totals = new Map<string, number>();
    for (const jobRun of filtered) totals.set(jobRun.queueName, (totals.get(jobRun.queueName) ?? 0) + 1);
    return [...totals.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 4);
  }, [filtered]);
  const maxQueueCount = Math.max(...queueMix.map((item) => item.value), 1);

  useEffect(() => {
    setPage(1);
  }, [query, status, queue, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <section className="ops-workspace-stack">
      <div className="ops-insight-grid">
        <article className="ops-insight-card ops-health-card">
          <p className="eyebrow">Job health</p>
          <strong>{succeededCount}/{filtered.length}</strong>
          <span>succeeded in the current view</span>
          <div className="ops-health-bar" aria-label="Job health split"><i style={{ width: `${Math.max(4, (succeededCount / healthTotal) * 100)}%` }} /><b style={{ width: `${Math.max(4, (failedCount / healthTotal) * 100)}%` }} /><em style={{ width: `${Math.max(4, (runningCount / healthTotal) * 100)}%` }} /></div>
          <small>{failedCount} failed - {runningCount} running</small>
        </article>
        <article className="ops-insight-card">
          <p className="eyebrow">Average duration</p>
          <strong>{formatDuration(Math.round(avgDuration))}</strong>
          <span>based on filtered job runs</span>
        </article>
        <article className="ops-insight-card ops-queue-card">
          <p className="eyebrow">Queue mix</p>
          {queueMix.length === 0 ? <span>No queue activity yet.</span> : queueMix.map((item) => <div className="ops-queue-row" key={item.label}><span>{item.label}</span><div><i style={{ width: `${Math.max(8, (item.value / maxQueueCount) * 100)}%` }} /></div><strong>{item.value}</strong></div>)}
        </article>
      </div>

      <section className="data-panel ops-workspace">
        <div className="data-toolbar">
          <div>
            <h2>Job runs</h2>
            <span>{filtered.length} of {jobRuns.length} shown</span>
          </div>
          <div className="data-toolbar-actions ops-toolbar-actions">
            <label className="data-search" htmlFor="ops-search"><span>Search</span><input id="ops-search" onChange={(event) => setQuery(event.target.value)} placeholder="Queue, job, error" value={query} /></label>
            <label className="data-filter" htmlFor="ops-status-filter"><span>Status</span><select id="ops-status-filter" onChange={(event) => setStatus(event.target.value as StatusFilter)} value={status}>{statusOptions.map((option) => <option key={option} value={option}>{option === "all" ? "All" : option}</option>)}</select></label>
            <label className="data-filter" htmlFor="ops-queue-filter"><span>Queue</span><select id="ops-queue-filter" onChange={(event) => setQueue(event.target.value)} value={queue}><option value="all">All queues</option>{queues.map((queueName) => <option key={queueName} value={queueName}>{queueName}</option>)}</select></label>
            <label className="data-filter ops-page-size" htmlFor="ops-page-size"><span>Rows</span><select id="ops-page-size" onChange={(event) => setPageSize(Number(event.target.value))} value={pageSize}>{pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
            <button className="secondary-command" disabled={filtered.length === 0} onClick={() => exportJobRuns(filtered)} type="button">Export CSV</button>
          </div>
        </div>

        {jobRuns.length === 0 ? <p className="empty-state">No job runs yet.</p> : filtered.length === 0 ? <p className="empty-state">No job runs match this filter.</p> : <><div className="data-table-scroll ops-table-scroll"><table><thead><tr><th>Status</th><th>Queue</th><th>Job</th><th>Duration</th><th>Started</th><th>Finished</th><th>Evidence</th></tr></thead><tbody>{pageRows.map((jobRun) => <tr key={jobRun.id}><td><span className={`status-badge status-${jobRun.status}`}>{jobRun.status}</span></td><td>{jobRun.queueName}</td><td><strong>{jobRun.jobName}</strong><br /><span className="muted-text">{jobRun.jobId ?? "No queue id"}</span></td><td>{formatDuration(durationMs(jobRun))}</td><td>{formatDateTime(jobRun.startedAt)}</td><td>{formatDateTime(jobRun.finishedAt)}</td><td><pre className="inline-code-block ops-evidence-block">{formatJson(jobRun.errorMessage ?? jobRun.result ?? jobRun.payload)}</pre></td></tr>)}</tbody></table></div><div className="data-pagination" aria-label="Operations pagination"><span>Showing {startIndex + 1}-{Math.min(startIndex + pageSize, filtered.length)} of {filtered.length}</span><div><button className="secondary-command" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button">Previous</button><strong>Page {safePage} / {totalPages}</strong><button className="secondary-command" disabled={safePage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} type="button">Next</button></div></div></>}
      </section>
    </section>
  );
}