import { createGoogle, type GoogleLanguageModelOptions } from "@ai-sdk/google";
import {
  aiExtractionOutputSchema,
  type AiConfidenceSummary,
  type AiExtractedField,
  type AiExtractionOutput,
} from "@revflow/shared";
import { generateText, Output } from "ai";

import type { AiProvider, ContractExtractionInput } from "../ai.types.js";
import {
  CONTRACT_EXTRACTION_PROMPT_VERSION,
  CONTRACT_EXTRACTION_SYSTEM_PROMPT,
} from "../prompts/contract-extraction.js";

type GeminiGenerationInput = {
  apiKey: string;
  model: string;
  system: string;
  prompt: string;
  abortSignal: AbortSignal;
  thinkingLevel?: "minimal";
};

type GeminiGenerateImplementation = (
  input: GeminiGenerationInput,
) => Promise<unknown>;

type GeminiProviderOptions = {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  generateImpl?: GeminiGenerateImplementation;
};

function summarizeConfidence(fields: AiExtractedField[]): AiConfidenceSummary {
  const overall =
    fields.length === 0
      ? 0
      : Math.round(
          (fields.reduce((sum, field) => sum + field.confidence, 0) /
            fields.length) *
            100,
        ) / 100;

  return {
    overall,
    highConfidenceCount: fields.filter((field) => field.confidence >= 0.8)
      .length,
    lowConfidenceCount: fields.filter((field) => field.confidence < 0.6).length,
  };
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const canonicalFieldAliases: Record<string, { key: string; label: string }> = {
  billing_email: { key: "customer_email", label: "Customer email" },
  client_email: { key: "customer_email", label: "Customer email" },
  client_name: { key: "customer_name", label: "Customer name" },
  start_date: { key: "contract_start_date", label: "Contract start date" },
  service_start_date: {
    key: "contract_start_date",
    label: "Contract start date",
  },
  effective_date: { key: "contract_start_date", label: "Contract start date" },
  end_date: { key: "contract_end_date", label: "Contract end date" },
  service_end_date: { key: "contract_end_date", label: "Contract end date" },
  expiration_date: { key: "contract_end_date", label: "Contract end date" },
};

function normalizeCanonicalFields(
  output: AiExtractionOutput,
): AiExtractionOutput {
  const claimedKeys = new Set(output.fields.map((field) => field.key));
  const fields = output.fields.flatMap((field) => {
    const canonical = canonicalFieldAliases[field.key];

    if (!canonical) {
      return [field];
    }

    if (claimedKeys.has(canonical.key)) {
      return [];
    }

    claimedKeys.add(canonical.key);
    return [{ ...field, key: canonical.key, label: canonical.label }];
  });

  return { ...output, fields };
}

async function generateWithGemini(input: GeminiGenerationInput) {
  const google = createGoogle({ apiKey: input.apiKey });
  const result = await generateText({
    model: google(input.model),
    system: input.system,
    prompt: input.prompt,
    temperature: 0,
    providerOptions: input.thinkingLevel
      ? {
          google: {
            thinkingConfig: { thinkingLevel: input.thinkingLevel },
          } satisfies GoogleLanguageModelOptions,
        }
      : undefined,
    output: Output.object({ schema: aiExtractionOutputSchema }),
    abortSignal: input.abortSignal,
  });

  return result.output;
}

export function createGeminiAiProvider(
  options: GeminiProviderOptions = {},
): AiProvider {
  return {
    name: "gemini",
    async extractContractTerms(input: ContractExtractionInput) {
      const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;

      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is required when AI_PROVIDER=gemini");
      }

      const model =
        options.model ?? process.env.GEMINI_MODEL ?? "gemini-3.6-flash";
      const timeoutMs =
        options.timeoutMs ??
        positiveInteger(process.env.GEMINI_TIMEOUT_MS, 60_000);
      const generateImpl = options.generateImpl ?? generateWithGemini;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const untrustedOutput = await generateImpl({
          apiKey,
          model,
          system: CONTRACT_EXTRACTION_SYSTEM_PROMPT,
          prompt: [
            `Source name: ${input.sourceName ?? "Pasted contract text"}`,
            "Extract contract terms from the source enclosed below.",
            "<contract_source>",
            input.sourceText,
            "</contract_source>",
          ].join("\n"),
          abortSignal: controller.signal,
          thinkingLevel: model === "gemini-3.6-flash" ? "minimal" : undefined,
        });
        const output = normalizeCanonicalFields(
          aiExtractionOutputSchema.parse(untrustedOutput),
        );

        return {
          provider: "gemini",
          model,
          promptVersion: CONTRACT_EXTRACTION_PROMPT_VERSION,
          output,
          confidenceSummary: summarizeConfidence(output.fields),
        };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error(`Gemini request timed out after ${timeoutMs}ms`);
        }

        throw error;
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

export const geminiAiProvider = createGeminiAiProvider();
