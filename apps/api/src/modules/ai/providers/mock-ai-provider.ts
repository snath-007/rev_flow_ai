import {
  aiExtractionOutputSchema,
  type AiConfidenceSummary,
  type AiExtractedField,
  type AiExtractedFieldCategory,
  type AiExtractedValue
} from "@revflow/shared";

import type { AiProvider, ContractExtractionInput, ContractExtractionResult } from "../ai.types.js";
import { CONTRACT_EXTRACTION_PROMPT_VERSION } from "../prompts/contract-extraction.js";

type FieldCandidate = {
  key: string;
  label: string;
  category: AiExtractedFieldCategory;
  value: AiExtractedValue;
  confidence: number;
  sourceSnippet: string | null;
  ambiguity: string | null;
};

function excerpt(text: string, index: number, length: number) {
  const start = Math.max(0, index - 24);
  const end = Math.min(text.length, index + length + 48);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function matchField(
  text: string,
  key: string,
  label: string,
  category: AiExtractedFieldCategory,
  pattern: RegExp,
  confidence: number,
  transform: (value: string) => AiExtractedValue = (value) => value.trim()
): FieldCandidate {
  const match = pattern.exec(text);

  if (!match?.[1]) {
    return {
      key,
      label,
      category,
      value: null,
      confidence: 0.2,
      sourceSnippet: null,
      ambiguity: `${label} was not found in the supplied contract text.`
    };
  }

  return {
    key,
    label,
    category,
    value: transform(match[1]),
    confidence,
    sourceSnippet: excerpt(text, match.index, match[0].length),
    ambiguity: null
  };
}

function detectPricingModel(text: string): FieldCandidate {
  const match = /(tiered|volume|per[- ]unit|usage[- ]based|flat(?: fee)?)/i.exec(text);
  const raw = match?.[1]?.toLowerCase() ?? null;
  const value = raw?.startsWith("tiered") || raw === "volume"
    ? "tiered"
    : raw?.startsWith("per") || raw?.startsWith("usage")
      ? "per_unit"
      : raw
        ? "flat"
        : null;

  return {
    key: "pricing_model",
    label: "Pricing model",
    category: "pricing",
    value,
    confidence: value ? 0.88 : 0.2,
    sourceSnippet: match ? excerpt(text, match.index, match[0].length) : null,
    ambiguity: value ? null : "Pricing model was not identified."
  };
}

function detectRecognitionMethod(text: string): FieldCandidate {
  const match = /(straight[- ]line|immediate(?:ly)?|usage[- ]based)\s+(?:revenue\s+)?recognition/i.exec(text);
  const raw = match?.[1]?.toLowerCase() ?? null;
  const value = raw?.startsWith("straight")
    ? "straight_line"
    : raw?.startsWith("usage")
      ? "usage_based"
      : raw
        ? "immediate"
        : null;

  return {
    key: "recognition_method",
    label: "Revenue recognition method",
    category: "revenue_recognition",
    value,
    confidence: value ? 0.86 : 0.2,
    sourceSnippet: match ? excerpt(text, match.index, match[0].length) : null,
    ambiguity: value ? null : "Revenue recognition method requires reviewer confirmation."
  };
}

function summarizeConfidence(fields: AiExtractedField[]): AiConfidenceSummary {
  const overall = fields.length === 0
    ? 0
    : Math.round((fields.reduce((sum, field) => sum + field.confidence, 0) / fields.length) * 100) / 100;

  return {
    overall,
    highConfidenceCount: fields.filter((field) => field.confidence >= 0.8).length,
    lowConfidenceCount: fields.filter((field) => field.confidence < 0.6).length
  };
}

function buildFields(sourceText: string): AiExtractedField[] {
  return [
    matchField(
      sourceText,
      "customer_name",
      "Customer name",
      "customer",
      /(?:customer|client)\s*(?:name)?\s*[:\-]\s*([^\n.;]+)/i,
      0.94
    ),
    matchField(
      sourceText,
      "customer_email",
      "Customer email",
      "customer",
      /(?:email|billing email)\s*[:\-]\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i,
      0.94
    ),
    matchField(
      sourceText,
      "contract_start_date",
      "Contract start date",
      "contract",
      /(?:start date|effective date|commences on)\s*[:\-]?\s*(\d{4}-\d{2}-\d{2})/i,
      0.93
    ),
    matchField(
      sourceText,
      "contract_end_date",
      "Contract end date",
      "contract",
      /(?:end date|expires on|terminates on)\s*[:\-]?\s*(\d{4}-\d{2}-\d{2})/i,
      0.91
    ),
    matchField(
      sourceText,
      "billing_frequency",
      "Billing frequency",
      "billing",
      /(?:billing frequency|billed|billing)\s*[:\-]?\s*(monthly|quarterly|annually|annual)/i,
      0.9,
      (value) => value.toLowerCase() === "annually" ? "annual" : value.toLowerCase()
    ),
    matchField(
      sourceText,
      "payment_terms",
      "Payment terms",
      "billing",
      /(?:payment terms|payable)\s*[:\-]?\s*(net\s*\d+)/i,
      0.9,
      (value) => value.replace(/\s+/g, " ").toUpperCase()
    ),
    matchField(
      sourceText,
      "product_name",
      "Product or plan",
      "product",
      /(?:product|plan)\s*[:\-]\s*([^\n.;]+)/i,
      0.87
    ),
    detectPricingModel(sourceText),
    matchField(
      sourceText,
      "unit_price",
      "Unit price",
      "pricing",
      /(?:unit price|rate|platform fee)\s*[:\-]?\s*\$?([0-9]+(?:\.[0-9]+)?)/i,
      0.89,
      (value) => Number(value)
    ),
    matchField(
      sourceText,
      "currency",
      "Currency",
      "pricing",
      /(?:currency)\s*[:\-]\s*([A-Z]{3})/i,
      0.93,
      (value) => value.toUpperCase()
    ),
    detectRecognitionMethod(sourceText)
  ];
}

export const mockAiProvider: AiProvider = {
  name: "mock",
  async extractContractTerms(input: ContractExtractionInput): Promise<ContractExtractionResult> {
    const fields = buildFields(input.sourceText);
    const ambiguities = fields.flatMap((field) => field.ambiguity ? [field.ambiguity] : []);
    const missingFields = fields.filter((field) => field.value === null).map((field) => field.label);
    const output = aiExtractionOutputSchema.parse({
      summary: `Mock extraction found ${fields.length - missingFields.length} of ${fields.length} tracked contract fields.`,
      fields,
      ambiguities,
      missingFields
    });

    return {
      provider: "mock",
      model: "deterministic-contract-parser-v1",
      promptVersion: CONTRACT_EXTRACTION_PROMPT_VERSION,
      output,
      confidenceSummary: summarizeConfidence(output.fields)
    };
  }
};