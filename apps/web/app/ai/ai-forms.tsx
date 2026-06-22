"use client";

import type {
  AiExtractedField,
  AiExtractedValue,
  AiExtractionRun,
  AiFieldDecisionStatus,
  ReviewAiExtractionInput
} from "@revflow/shared";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function AiExtractionCreateForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/ai/extractions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceType: "text",
          sourceName: String(formData.get("sourceName") ?? "") || undefined,
          sourceText: String(formData.get("sourceText") ?? "")
        })
      });

      if (!response.ok) {
        throw new Error("Could not extract contract terms");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={onSubmit} className="form-panel ai-intake-form">
      <div className="panel-title-row">
        <h2>New extraction</h2>
        <span className="status-badge">Mock provider</span>
      </div>
      <div>
        <label htmlFor="ai-source-name">Source name</label>
        <input id="ai-source-name" name="sourceName" placeholder="Enterprise agreement" />
      </div>
      <div>
        <label htmlFor="ai-source-text">Contract text</label>
        <textarea id="ai-source-text" name="sourceText" rows={12} minLength={20} required />
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <button disabled={isSubmitting} type="submit">
        {isSubmitting ? "Extracting..." : "Extract terms"}
      </button>
    </form>
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
              <button className="secondary-command" onClick={acceptAll} type="button"> Accept all
              </button>
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
                      <button aria-label={`Accept ${field.label}`} onClick={() => setDecision(field, "accepted")} title="Accept extracted value" type="button">
                      </button>
                      <button aria-label={`Edit ${field.label}`} onClick={() => setDecision(field, "edited")} title="Edit value" type="button">
                      </button>
                      <button aria-label={`Reject ${field.label}`} onClick={() => setDecision(field, "rejected")} title="Reject field" type="button">
                      </button>
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
                <span>{pendingCount} pending</span>
                <button className="danger-command" disabled={isSubmitting} onClick={() => submitReview("rejected")} type="button"> Reject extraction
                </button>
                <button disabled={isSubmitting || pendingCount > 0} onClick={() => submitReview("approved")} type="button"> Approve reviewed extraction
                </button>
              </div>
            </div>
          ) : null}

          {canApply ? (
            <div className="apply-banner">
              <div>
                <strong>Approved for draft creation</strong>
                <span>Customer and contract records remain subject to normal activation controls.</span>
              </div>
              <button disabled={isSubmitting} onClick={applyExtraction} type="button"> Apply to draft
              </button>
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