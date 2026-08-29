"use client";

import type { AuditLog } from "@revflow/shared";
import { useEffect, useMemo, useState } from "react";

type EntityFilter = "all" | string;

const pageSizes = [10, 25, 50];

function formatJson(value: unknown) {
  if (value === null || value === undefined) return "None";
  return JSON.stringify(value, null, 2);
}

function csvEscape(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function exportAuditLogs(auditLogs: AuditLog[]) {
  const rows = auditLogs.map((log) => [
    log.action,
    log.entityType,
    log.entityId,
    log.actor,
    log.createdAt,
    JSON.stringify(log.beforeState ?? null),
    JSON.stringify(log.afterState ?? null)
  ]);
  const csv = [["Action", "Entity type", "Entity id", "Actor", "Created", "Before state", "After state"], ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "revflow-audit-events.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function includesTerm(values: (string | number | null | undefined)[], term: string) {
  return values.some((value) => String(value ?? "").toLowerCase().includes(term));
}

export function AuditTable({ auditLogs }: { auditLogs: AuditLog[] }) {
  const [query, setQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState<EntityFilter>("all");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const entityTypes = useMemo(() => [...new Set(auditLogs.map((log) => log.entityType))].sort(), [auditLogs]);
  const term = query.trim().toLowerCase();
  const filtered = useMemo(() => auditLogs.filter((log) => {
    const entityMatches = entityFilter === "all" || log.entityType === entityFilter;
    const termMatches = !term || includesTerm([log.action, log.entityType, log.entityId, log.actor, log.createdAt], term);
    return entityMatches && termMatches;
  }), [auditLogs, entityFilter, term]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(startIndex, startIndex + pageSize);
  const aiEventCount = filtered.filter((log) => log.entityType === "ai_extraction_run").length;

  useEffect(() => {
    setPage(1);
  }, [query, entityFilter, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <section className="data-panel audit-workspace">
      <div className="data-toolbar">
        <div>
          <h2>Audit events</h2>
          <span>{filtered.length} of {auditLogs.length} shown - {aiEventCount} AI-assisted</span>
        </div>
        <div className="data-toolbar-actions audit-toolbar-actions">
          <label className="data-search" htmlFor="audit-search">
            <span>Search</span>
            <input id="audit-search" onChange={(event) => setQuery(event.target.value)} placeholder="Action, entity, actor" value={query} />
          </label>
          <label className="data-filter" htmlFor="audit-entity-filter">
            <span>Entity</span>
            <select id="audit-entity-filter" onChange={(event) => setEntityFilter(event.target.value)} value={entityFilter}>
              <option value="all">All entities</option>
              {entityTypes.map((entityType) => <option key={entityType} value={entityType}>{entityType}</option>)}
            </select>
          </label>
          <label className="data-filter audit-page-size" htmlFor="audit-page-size">
            <span>Rows</span>
            <select id="audit-page-size" onChange={(event) => setPageSize(Number(event.target.value))} value={pageSize}>
              {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <button className="secondary-command" disabled={filtered.length === 0} onClick={() => exportAuditLogs(filtered)} type="button">Export CSV</button>
        </div>
      </div>

      {auditLogs.length === 0 ? <p className="empty-state">No audit events yet.</p> : filtered.length === 0 ? <p className="empty-state">No audit events match this filter.</p> : (
        <>
          <div className="data-table-scroll audit-table-scroll">
            <table>
              <thead><tr><th>Action</th><th>Entity</th><th>Actor</th><th>Created</th><th>After state</th></tr></thead>
              <tbody>{pageRows.map((auditLog) => {
                const isAiExtraction = auditLog.entityType === "ai_extraction_run";
                return <tr key={auditLog.id}><td><strong>{auditLog.action}</strong>{isAiExtraction ? <><br /><a className="audit-context-link" href="/ai">Open AI review</a></> : null}</td><td>{auditLog.entityType}<br /><span className="muted-text">{auditLog.entityId}</span></td><td>{auditLog.actor}</td><td>{new Date(auditLog.createdAt).toLocaleString()}</td><td><pre className="inline-code-block audit-state-block">{formatJson(auditLog.afterState)}</pre></td></tr>;
              })}</tbody>
            </table>
          </div>
          <div className="data-pagination" aria-label="Audit pagination">
            <span>Showing {startIndex + 1}-{Math.min(startIndex + pageSize, filtered.length)} of {filtered.length}</span>
            <div>
              <button className="secondary-command" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button">Previous</button>
              <strong>Page {safePage} / {totalPages}</strong>
              <button className="secondary-command" disabled={safePage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} type="button">Next</button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}