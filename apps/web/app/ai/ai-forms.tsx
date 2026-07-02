"use client";

import type {
  AiExtractedField,
  AiExtractedValue,
  AiExtractionRun,
  AiFieldDecisionStatus,
  ReviewAiExtractionInput
} from "@revflow/shared";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export function AiExtractionCreateForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"paste" | "upload">("paste");
  const [sourceName, setSourceName] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function submitExtraction(payload: { sourceName?: string; sourceText: string; sourceType?: "text" | "document" }) {
    const response = await fetch("/api/ai/extractions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(body?.message ?? "Could not extract contract terms");
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      let text = sourceText;
      let name = sourceName.trim() || undefined;
      let sourceType: "text" | "document" = "text";

      if (mode === "upload") {
        if (!selectedFile) {
          throw new Error("Choose a contract file first");
        }

        const extension = selectedFile.name.split(".").pop()?.toLowerCase();
        if (!["txt", "md"].includes(extension ?? "")) {
          throw new Error("PDF, Word, and scanned contract parsing need the document parser service. Paste text or upload .txt/.md for now.");
        }

        text = await selectedFile.text();
        name = name ?? selectedFile.name;
        sourceType = "document";
      }

      if (text.trim().length < 20) {
        throw new Error("Add at least 20 characters of contract text before extraction");
      }

      const toastId = toast.loading("Extraction started", { description: "RevFlow is reading the contract terms." });
      await submitExtraction({ sourceName: name, sourceText: text, sourceType });
      toast.success("Extraction ready for review", { id: toastId, description: "Open the run below to resolve fields and evidence." });
      setIsOpen(false);
      setSourceName("");
      setSourceText("");
      setSelectedFile(null);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast.error("Extraction did not start", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button className="primary-link ai-new-extraction-button" onClick={() => setIsOpen(true)} type="button">New extraction</button>
      {isOpen ? (
        <div className="ai-modal-backdrop" role="presentation">
          <section aria-labelledby="ai-new-extraction-title" aria-modal="true" className="ai-extraction-modal" role="dialog">
            <div className="panel-title-row">
              <div>
                <p className="eyebrow">AI intake</p>
                <h2 id="ai-new-extraction-title">New extraction</h2>
                <p>Start from pasted contract text today. Document upload is staged for the parser service.</p>
              </div>
              <button aria-label="Close extraction modal" className="secondary-command" onClick={() => setIsOpen(false)} type="button">Close</button>
            </div>

            <div className="ai-intake-tabs" role="tablist" aria-label="Extraction source">
              <button aria-selected={mode === "paste"} className={mode === "paste" ? "active" : ""} onClick={() => setMode("paste")} role="tab" type="button">Paste text</button>
              <button aria-selected={mode === "upload"} className={mode === "upload" ? "active" : ""} onClick={() => setMode("upload")} role="tab" type="button">Upload file</button>
            </div>

            <form className="ai-modal-form" onSubmit={onSubmit}>
              <div>
                <label htmlFor="ai-source-name">Source name</label>
                <input id="ai-source-name" onChange={(event) => setSourceName(event.target.value)} placeholder="Enterprise agreement" value={sourceName} />
              </div>

              {mode === "paste" ? (
                <div>
                  <label htmlFor="ai-source-text">Contract text</label>
                  <textarea id="ai-source-text" minLength={20} onChange={(event) => setSourceText(event.target.value)} rows={13} value={sourceText} />
                </div>
              ) : (
                <div className="ai-upload-dropzone">
                  <label htmlFor="ai-source-file">Contract file</label>
                  <input accept=".txt,.md,.pdf,.doc,.docx" id="ai-source-file" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} type="file" />
                  <strong>{selectedFile ? selectedFile.name : "Drop in a contract file"}</strong>
                  <span>.txt and .md can be read now. PDF, Word, and scanned files are queued for the document parser service.</span>
                </div>
              )}

              {error ? <p className="error-text">{error}</p> : null}
              <div className="ai-modal-actions">
                <span>{mode === "paste" ? "Paste terms, then create a review run." : "Upload path is staged for richer document parsing."}</span>
                <button disabled={isSubmitting} type="submit">{isSubmitting ? "Starting..." : "Start extraction"}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
type FieldDraft = {
  value: string;
  status: AiFieldDecisionStatus;
};

function displayValue(value: AiExtractedValue) {
  return value === null ? "" : String(value);
}

function parseReviewedValue(original: AiExtractedValue, draft: FieldDraft): AiExtractedValue {
  if (draft.status === "rejected" || draft.value.trim() === "") {
    return null;
  }

  if (typeof original === "number") {
    const number = Number(draft.value);
    return Number.isFinite(number) ? number : draft.value;
  }

  if (typeof original === "boolean") {
    return draft.value.toLowerCase() === "true";
  }

  return draft.value;
}

function initialDrafts(fields: AiExtractedField[]) {
  return Object.fromEntries(fields.map((field) => [
    field.key,
    { value: displayValue(field.value), status: "pending" as const }
  ]));
}

export function AiReviewWorkbench({ extractions }: { extractions: AiExtractionRun[] }) {
  const router = useRouter();
  const initialSelection = extractions.find((run) => run.status === "extracted")?.id ?? extractions[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState(initialSelection);
  const selected = useMemo(
    () => extractions.find((run) => run.id === selectedId) ?? null,
    [extractions, selectedId]
  );
  const baseOutput = selected?.reviewedOutput ?? selected?.structuredOutput ?? null;
  const [drafts, setDrafts] = useState<Record<string, FieldDraft>>({});
  const [reviewer, setReviewer] = useState("finance-reviewer@revflow.local");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setDrafts(initialDrafts(baseOutput?.fields ?? []));
    setError(null);
  }, [selectedId, baseOutput]);

  if (extractions.length === 0) {
    return <section className="table-panel"><p className="empty-state">No extraction runs yet.</p></section>;
  }

  const canReview = selected?.status === "extracted" || selected?.status === "reviewing";
  const canApply = selected?.status === "approved";
  const fields = baseOutput?.fields ?? [];
  const pendingCount = fields.filter((field) => (drafts[field.key]?.status ?? "pending") === "pending").length;

  function setDecision(field: AiExtractedField, status: AiFieldDecisionStatus) {
    setDrafts((current) => ({
      ...current,
      [field.key]: {
        value: status === "rejected" ? "" : displayValue(field.value),
        status
      }
    }));
  }

  function setEditedValue(field: AiExtractedField, value: string) {
    setDrafts((current) => ({
      ...current,
      [field.key]: { value, status: "edited" }
    }));
  }

  function acceptAll() {
    setDrafts(Object.fromEntries(fields.map((field) => [
      field.key,
      { value: displayValue(field.value), status: "accepted" as const }
    ])));
  }

  function buildReviewPayload(status: "approved" | "rejected"): ReviewAiExtractionInput {
    if (!baseOutput) {
      throw new Error("No structured extraction output is available");
    }

    if (status === "approved" && pendingCount > 0) {
      throw new Error("Resolve every extracted field before approval");
    }

    const reviewedFields = baseOutput.fields.map((field) => {
      const draft = drafts[field.key] ?? { value: displayValue(field.value), status: "pending" as const };
      return { ...field, value: parseReviewedValue(field.value, draft) };
    });

    return {
      reviewer,
      status,
      fieldDecisions: baseOutput.fields.map((field) => {
        const draft = drafts[field.key] ?? { value: displayValue(field.value), status: "pending" as const };
        return {
          fieldKey: field.key,
          status: draft.status,
          originalValue: field.value,
          reviewedValue: parseReviewedValue(field.value, draft),
          notes: null
        };
      }),
      reviewedOutput: {
        ...baseOutput,
        fields: reviewedFields,
        missingFields: reviewedFields.filter((field) => field.value === null).map((field) => field.label)
      },
      notes: notes || undefined
    };
  }

  async function submitReview(status: "approved" | "rejected") {
    if (!selected) return;
    setError(null);

    try {
      const payload = buildReviewPayload(status);
      setIsSubmitting(true);
      const response = await fetch(`/api/ai/extractions/${selected.id}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Could not ${status === "approved" ? "approve" : "reject"} extraction`);
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function applyExtraction() {
    if (!selected) return;
    setError(null);

    if (!window.confirm("Apply the approved extraction into draft customer and contract records? The resulting contract still requires normal activation controls.")) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/ai/extractions/${selected.id}/apply`, { method: "POST" });

      if (!response.ok) {
        throw new Error("Could not apply extraction to draft configuration");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="ai-review-panel">
      <div className="ai-review-toolbar">
        <div>
          <label htmlFor="ai-run">Extraction run</label>
          <select id="ai-run" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
            {extractions.map((run) => (
              <option key={run.id} value={run.id}>
                {run.sourceName ?? "Untitled source"} - {run.status}
              </option>
            ))}
          </select>
        </div>
        <div className="review-summary">
          <span className={`status-badge status-${selected?.status}`}>{selected?.status}</span>
          <span>{baseOutput?.fields.length ?? 0} fields</span>
          <span>{selected?.ambiguities.length ?? 0} ambiguities</span>
          <span>Provider: {selected?.provider ?? "-"}</span>
          <span>Model: {selected?.model ?? "-"}</span>
          <span>Prompt: {selected?.promptVersion ?? "-"}</span>
        </div>
      </div>

      <div className="ai-review-grid">
        <aside className="source-panel">
          <div className="panel-title-row">
            <h2>Source contract</h2>
            <span>{selected?.sourceType}</span>
          </div>
          <pre>{selected?.sourceText}</pre>
        </aside>

        <div className="extraction-panel">
          <div className="panel-title-row">
            <div>
              <h2>Extracted terms</h2>
              <p>{baseOutput?.summary ?? selected?.errorMessage ?? "No structured output"}</p>
            </div>
            {canReview ? (
              <button className="secondary-command" onClick={acceptAll} type="button">Accept all fields</button>
            ) : null}
          </div>

          {fields.length === 0 ? <p className="empty-state">No extracted fields available.</p> : null}
          <div className="extracted-fields">
            {fields.map((field) => {
              const draft = drafts[field.key] ?? { value: displayValue(field.value), status: "pending" as const };
              const lowConfidence = field.confidence < 0.6;

              return (
                <div className={`extracted-field ${lowConfidence ? "low-confidence" : ""}`} key={field.key}>
                  <div className="field-heading">
                    <div>
                      <span className="field-category">{field.category.replace("_", " ")}</span>
                      <strong>{field.label}</strong>
                    </div>
                    <div className="field-status-group">
                      <span className="confidence-value">{Math.round(field.confidence * 100)}%</span>
                      <span className={`decision-status decision-${draft.status}`}>{draft.status}</span>
                    </div>
                  </div>

                  <input
                    aria-label={`Reviewed value for ${field.label}`}
                    disabled={!canReview || draft.status === "rejected"}
                    onChange={(event) => setEditedValue(field, event.target.value)}
                    value={draft.value}
                  />

                  {field.sourceSnippet ? <p className="source-snippet"><strong>Source evidence:</strong> {field.sourceSnippet}</p> : null}
                  {field.ambiguity ? <p className="ambiguity-text">{field.ambiguity}</p> : null}

                  {canReview ? (
                    <div className="field-actions" aria-label={`Review actions for ${field.label}`}>
                      <button aria-label={`Accept ${field.label}`} onClick={() => setDecision(field, "accepted")} title="Accept extracted value" type="button">OK</button>
                      <button aria-label={`Edit ${field.label}`} onClick={() => setDecision(field, "edited")} title="Edit value" type="button">Edit</button>
                      <button aria-label={`Reject ${field.label}`} onClick={() => setDecision(field, "rejected")} title="Reject field" type="button">Reject</button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {canReview ? (
            <div className="review-footer">
              <div className="reviewer-fields">
                <div>
                  <label htmlFor="reviewer">Reviewer</label>
                  <input id="reviewer" onChange={(event) => setReviewer(event.target.value)} value={reviewer} />
                </div>
                <div>
                  <label htmlFor="review-notes">Review notes</label>
                  <input id="review-notes" onChange={(event) => setNotes(event.target.value)} value={notes} />
                </div>
              </div>
              <div className="review-actions">
                <span>{pendingCount === 0 ? "All fields resolved" : `${pendingCount} fields still pending`}</span>
                <button className="danger-command" disabled={isSubmitting} onClick={() => submitReview("rejected")} type="button">Reject extraction</button>
                <button disabled={isSubmitting || pendingCount > 0} onClick={() => submitReview("approved")} type="button">Approve reviewed extraction</button>
              </div>
            </div>
          ) : null}

          {canApply ? (
            <div className="apply-banner">
              <div>
                <strong>Approved for draft creation</strong>
                <span>Customer and contract records remain subject to normal activation controls.</span>
              </div>
              <button disabled={isSubmitting} onClick={applyExtraction} type="button">Apply to draft</button>
            </div>
          ) : null}

          {selected?.status === "applied" && selected.appliedContractId ? (
            <div className="apply-banner applied-banner">
              <div>
                <strong>Applied to draft contract</strong>
                <a href={`/contracts/${selected.appliedContractId}`}>{selected.appliedContractId}</a>
              </div>
            </div>
          ) : null}

          {error ? <p className="error-text">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}