import {
  aiExtractionOutputSchema,
  type AiConfidenceSummary,
  type AiExtractedField
} from "@revflow/shared";

import type { AiProvider, ContractExtractionInput } from "../ai.types.js";
import {
  CONTRACT_EXTRACTION_PROMPT_VERSION,
  CONTRACT_EXTRACTION_SYSTEM_PROMPT
} from "../prompts/contract-extraction.js";

type FetchImplementation = typeof fetch;

type OllamaProviderOptions = {
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: FetchImplementation;
};

const extractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "fields", "ambiguities", "missingFields"],
  properties: {
    summary: { type: "string" },
    fields: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "label", "category", "value", "confidence", "sourceSnippet", "ambiguity"],
        properties: {
          key: { type: "string", minLength: 1 },
          label: { type: "string", minLength: 1 },
          category: {
            type: "string",
            enum: [
              "customer",
              "contract",
              "billing",
              "product",
              "metering",
              "pricing",
              "revenue_recognition",
              "other"
            ]
          },
          value: { type: ["string", "number", "boolean", "null"] },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          sourceSnippet: { type: ["string", "null"] },
          ambiguity: { type: ["string", "null"] }
        }
      }
    },
    ambiguities: { type: "array", items: { type: "string" } },
    missingFields: { type: "array", items: { type: "string" } }
  }
} as const;

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

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function createOllamaAiProvider(options: OllamaProviderOptions = {}): AiProvider {
  return {
    name: "ollama",
    async extractContractTerms(input: ContractExtractionInput) {
      const model = options.model ?? process.env.OLLAMA_MODEL;

      if (!model) {
        throw new Error("OLLAMA_MODEL is required when AI_PROVIDER=ollama");
      }

      const baseUrl = (options.baseUrl ?? process.env.OLLAMA_BASE_URL ?? "http://localhost:11434")
        .replace(/\/$/, "");
      const timeoutMs = options.timeoutMs
        ?? positiveInteger(process.env.OLLAMA_TIMEOUT_MS, 120_000);
      const fetchImpl = options.fetchImpl ?? fetch;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetchImpl(`${baseUrl}/api/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            stream: false,
            format: extractionJsonSchema,
            options: { temperature: 0 },
            messages: [
              { role: "system", content: CONTRACT_EXTRACTION_SYSTEM_PROMPT },
              {
                role: "user",
                content: [
                  `Source name: ${input.sourceName ?? "Pasted contract text"}`,
                  "Extract contract terms from the source enclosed below.",
                  "<contract_source>",
                  input.sourceText,
                  "</contract_source>"
                ].join("\n")
              }
            ]
          })
        });

        if (!response.ok) {
          const details = (await response.text()).trim();
          throw new Error(
            `Ollama request failed with ${response.status}${details ? `: ${details}` : ""}`
          );
        }

        const payload = await response.json() as { message?: { content?: unknown }; model?: unknown };

        if (typeof payload.message?.content !== "string") {
          throw new Error("Ollama response did not include structured message content");
        }

        let untrustedOutput: unknown;
        try {
          untrustedOutput = JSON.parse(payload.message.content);
        } catch {
          throw new Error("Ollama returned invalid JSON for contract extraction");
        }

        const output = aiExtractionOutputSchema.parse(untrustedOutput);

        return {
          provider: "ollama",
          model: typeof payload.model === "string" ? payload.model : model,
          promptVersion: CONTRACT_EXTRACTION_PROMPT_VERSION,
          output,
          confidenceSummary: summarizeConfidence(output.fields)
        };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error(`Ollama request timed out after ${timeoutMs}ms`);
        }

        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }
  };
}

export const ollamaAiProvider = createOllamaAiProvider();
