import { createSqlClient } from "@revflow/db";
import type {
  AiConfidenceSummary,
  AiExtractionOutput,
  AiExtractionReview,
  AiExtractionReviewStatus,
  AiExtractionRun,
  AiExtractionSourceType,
  AiExtractionStatus,
  CreateAiExtractionInput,
  ReviewAiExtractionInput
} from "@revflow/shared";

import type { ContractExtractionResult } from "./ai.types.js";

type ExtractionRunRow = {
  id: string;
  source_type: AiExtractionSourceType;
  source_name: string | null;
  source_text: string;
  status: AiExtractionStatus;
  provider: string;
  model: string | null;
  prompt_version: string;
  structured_output: AiExtractionOutput | null;
  confidence_summary: AiConfidenceSummary | null;
  ambiguities: string[];
  error_message: string | null;
  reviewed_output: AiExtractionOutput | null;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  applied_contract_id: string | null;
  applied_at: Date | null;
  created_at: Date;
  updated_at: Date;
};


type ExtractionReviewRow = {
  id: string;
  extraction_run_id: string;
  status: AiExtractionReviewStatus;
  reviewer: string;
  field_decisions: ReviewAiExtractionInput["fieldDecisions"];
  reviewed_output: ReviewAiExtractionInput["reviewedOutput"];
  notes: string | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function toExtractionReview(row: ExtractionReviewRow): AiExtractionReview {
  return {
    id: row.id,
    extractionRunId: row.extraction_run_id,
    status: row.status,
    reviewer: row.reviewer,
    fieldDecisions: row.field_decisions,
    reviewedOutput: row.reviewed_output,
    notes: row.notes,
    completedAt: row.completed_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}
const extractionRunColumns = `
  id,
  source_type,
  source_name,
  source_text,
  status,
  provider,
  model,
  prompt_version,
  structured_output,
  confidence_summary,
  ambiguities,
  error_message,
  reviewed_output,
  reviewed_by,
  reviewed_at,
  applied_contract_id,
  applied_at,
  created_at,
  updated_at
`;

function toExtractionRun(row: ExtractionRunRow): AiExtractionRun {
  return {
    id: row.id,
    sourceType: row.source_type,
    sourceName: row.source_name,
    sourceText: row.source_text,
    status: row.status,
    provider: row.provider,
    model: row.model,
    promptVersion: row.prompt_version,
    structuredOutput: row.structured_output,
    confidenceSummary: row.confidence_summary,
    ambiguities: row.ambiguities,
    errorMessage: row.error_message,
    reviewedOutput: row.reviewed_output,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at?.toISOString() ?? null,
    appliedContractId: row.applied_contract_id,
    appliedAt: row.applied_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

export async function listExtractionRuns() {
  const sql = createSqlClient();

  try {
    const rows = await sql<ExtractionRunRow[]>`
      select ${sql.unsafe(extractionRunColumns)}
      from ai_extraction_runs
      order by created_at desc
      limit 100
    `;

    return rows.map(toExtractionRun);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function getExtractionRunById(id: string) {
  const sql = createSqlClient();

  try {
    const rows = await sql<ExtractionRunRow[]>`
      select ${sql.unsafe(extractionRunColumns)}
      from ai_extraction_runs
      where id = ${id}
      limit 1
    `;

    return rows[0] ? toExtractionRun(rows[0]) : null;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function createExtractionRun(
  input: CreateAiExtractionInput,
  provider: string,
  promptVersion: string
) {
  const sql = createSqlClient();

  try {
    const rows = await sql<ExtractionRunRow[]>`
      insert into ai_extraction_runs (
        source_type,
        source_name,
        source_text,
        status,
        provider,
        prompt_version
      )
      values (
        ${input.sourceType},
        ${input.sourceName ?? null},
        ${input.sourceText},
        'created',
        ${provider},
        ${promptVersion}
      )
      returning ${sql.unsafe(extractionRunColumns)}
    `;
    const row = rows[0];

    if (!row) {
      throw new Error("AI extraction run insert did not return a row");
    }

    return toExtractionRun(row);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function markExtractionRunExtracting(id: string) {
  const sql = createSqlClient();

  try {
    const rows = await sql<ExtractionRunRow[]>`
      update ai_extraction_runs
      set status = 'extracting', updated_at = now()
      where id = ${id}
        and status = 'created'
      returning ${sql.unsafe(extractionRunColumns)}
    `;

    return rows[0] ? toExtractionRun(rows[0]) : null;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function completeExtractionRun(id: string, result: ContractExtractionResult) {
  const sql = createSqlClient();

  try {
    const rows = await sql<ExtractionRunRow[]>`
      update ai_extraction_runs
      set
        status = 'extracted',
        provider = ${result.provider},
        model = ${result.model},
        prompt_version = ${result.promptVersion},
        structured_output = ${sql.json(result.output as never)},
        confidence_summary = ${sql.json(result.confidenceSummary as never)},
        ambiguities = ${sql.json(result.output.ambiguities as never)},
        error_message = null,
        updated_at = now()
      where id = ${id}
        and status = 'extracting'
      returning ${sql.unsafe(extractionRunColumns)}
    `;

    return rows[0] ? toExtractionRun(rows[0]) : null;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function failExtractionRun(id: string, errorMessage: string) {
  const sql = createSqlClient();

  try {
    const rows = await sql<ExtractionRunRow[]>`
      update ai_extraction_runs
      set
        status = 'failed',
        error_message = ${errorMessage},
        updated_at = now()
      where id = ${id}
        and status in ('created', 'extracting')
      returning ${sql.unsafe(extractionRunColumns)}
    `;

    return rows[0] ? toExtractionRun(rows[0]) : null;
  } finally {
    await sql.end({ timeout: 5 });
  }
}
export async function reviewExtractionRun(id: string, input: ReviewAiExtractionInput) {
  const sql = createSqlClient();

  try {
    return await sql.begin(async (tx) => {
      const existingRows = await tx<{ status: AiExtractionStatus }[]>`
        select status
        from ai_extraction_runs
        where id = ${id}
        for update
      `;
      const existing = existingRows[0];

      if (!existing) {
        return "AI_EXTRACTION_NOT_FOUND" as const;
      }

      if (existing.status !== "extracted" && existing.status !== "reviewing") {
        return "AI_EXTRACTION_NOT_REVIEWABLE" as const;
      }

      const reviewRows = await tx<ExtractionReviewRow[]>`
        insert into ai_extraction_reviews (
          extraction_run_id,
          status,
          reviewer,
          field_decisions,
          reviewed_output,
          notes,
          completed_at
        )
        values (
          ${id},
          ${input.status},
          ${input.reviewer},
          ${tx.json(input.fieldDecisions as never)},
          ${tx.json(input.reviewedOutput as never)},
          ${input.notes ?? null},
          now()
        )
        returning id, extraction_run_id, status, reviewer, field_decisions, reviewed_output, notes, completed_at, created_at, updated_at
      `;
      const reviewRow = reviewRows[0];

      if (!reviewRow) {
        throw new Error("AI extraction review insert did not return a row");
      }

      const runRows = await tx<ExtractionRunRow[]>`
        update ai_extraction_runs
        set
          status = ${input.status},
          reviewed_output = ${tx.json(input.reviewedOutput as never)},
          reviewed_by = ${input.reviewer},
          reviewed_at = now(),
          updated_at = now()
        where id = ${id}
        returning ${tx.unsafe(extractionRunColumns)}
      `;
      const runRow = runRows[0];

      if (!runRow) {
        throw new Error("AI extraction review update did not return a run");
      }

      return {
        run: toExtractionRun(runRow),
        review: toExtractionReview(reviewRow)
      };
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function markExtractionRunApplied(id: string, contractId: string) {
  const sql = createSqlClient();

  try {
    const rows = await sql<ExtractionRunRow[]>`
      update ai_extraction_runs
      set
        status = 'applied',
        applied_contract_id = ${contractId},
        applied_at = now(),
        updated_at = now()
      where id = ${id}
        and status = 'approved'
      returning ${sql.unsafe(extractionRunColumns)}
    `;

    return rows[0] ? toExtractionRun(rows[0]) : null;
  } finally {
    await sql.end({ timeout: 5 });
  }
}
