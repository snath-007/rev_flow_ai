import { describe, expect, it, vi } from "vitest";

import { getAiProvider } from "./ai-provider.js";
import {
  createGeminiAiProvider,
  geminiAiProvider,
} from "./gemini-ai-provider.js";

const validOutput = {
  summary: "Extracted one customer field.",
  fields: [
    {
      key: "customer_name",
      label: "Customer name",
      category: "customer" as const,
      value: "Acme Analytics",
      confidence: 0.9,
      sourceSnippet: "Customer: Acme Analytics",
      ambiguity: null,
    },
    {
      key: "unit_price",
      label: "Unit price",
      category: "pricing" as const,
      value: null,
      confidence: 0.2,
      sourceSnippet: null,
      ambiguity: "Unit price was not supplied.",
    },
  ],
  ambiguities: ["Unit price was not supplied."],
  missingFields: ["Unit price"],
};

describe("Gemini AI provider", () => {
  it("requests structured extraction and validates the model response", async () => {
    const generateImpl = vi.fn(async () => validOutput);
    const provider = createGeminiAiProvider({
      apiKey: "test-api-key",
      model: "gemini-test-model",
      timeoutMs: 1_000,
      generateImpl,
    });

    const result = await provider.extractContractTerms({
      sourceName: "msa.txt",
      sourceText:
        "Customer: Acme Analytics. Commercial terms follow in this agreement.",
    });

    expect(generateImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "test-api-key",
        model: "gemini-test-model",
        system: expect.stringContaining("customer_email"),
        prompt: expect.stringContaining("<contract_source>"),
        abortSignal: expect.any(AbortSignal),
      }),
    );
    expect(result.provider).toBe("gemini");
    expect(result.model).toBe("gemini-test-model");
    expect(result.output).toEqual(validOutput);
    expect(result.confidenceSummary).toEqual({
      overall: 0.55,
      highConfidenceCount: 1,
      lowConfidenceCount: 1,
    });
  });

  it("normalizes common Gemini aliases to canonical apply keys", async () => {
    const provider = createGeminiAiProvider({
      apiKey: "test-api-key",
      generateImpl: vi.fn(async () => ({
        ...validOutput,
        fields: [
          ...validOutput.fields,
          {
            key: "billing_email",
            label: "Billing email",
            category: "customer" as const,
            value: "billing@acme.example",
            confidence: 0.9,
            sourceSnippet: "Billing: billing@acme.example",
            ambiguity: null,
          },
          {
            key: "start_date",
            label: "Start date",
            category: "contract" as const,
            value: "2026-09-01",
            confidence: 0.9,
            sourceSnippet: "Starts September 1, 2026",
            ambiguity: null,
          },
        ],
      })),
    });

    const result = await provider.extractContractTerms({
      sourceText: "Contract source text.",
    });

    expect(result.output.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "customer_email",
          label: "Customer email",
        }),
        expect.objectContaining({
          key: "contract_start_date",
          label: "Contract start date",
        }),
      ]),
    );
    expect(
      result.output.fields.some((field) => field.key === "billing_email"),
    ).toBe(false);
    expect(
      result.output.fields.some((field) => field.key === "start_date"),
    ).toBe(false);
  });

  it("rejects schema-invalid model output", async () => {
    const provider = createGeminiAiProvider({
      apiKey: "test-api-key",
      generateImpl: vi.fn(async () => ({ ...validOutput, fields: "invalid" })),
    });

    await expect(
      provider.extractContractTerms({ sourceText: "Contract source text." }),
    ).rejects.toThrow();
  });

  it("uses the low-latency extraction settings for Gemini 3.6 Flash", async () => {
    const generateImpl = vi.fn(async () => validOutput);
    const provider = createGeminiAiProvider({
      apiKey: "test-api-key",
      model: "gemini-3.6-flash",
      generateImpl,
    });

    await provider.extractContractTerms({
      sourceText: "Contract source text.",
    });

    expect(generateImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-3.6-flash",
        thinkingLevel: "minimal",
      }),
    );
  });

  it("requires an API key and is the default provider", async () => {
    const provider = createGeminiAiProvider({ apiKey: "" });

    expect(getAiProvider("gemini")).toBe(geminiAiProvider);
    expect(getAiProvider()).toBe(geminiAiProvider);
    expect(() => getAiProvider("ollama")).toThrow(
      "Unsupported AI provider: ollama",
    );
    await expect(
      provider.extractContractTerms({ sourceText: "Contract source text." }),
    ).rejects.toThrow("GEMINI_API_KEY is required");
  });

  it("aborts requests that exceed the configured timeout", async () => {
    const provider = createGeminiAiProvider({
      apiKey: "test-api-key",
      timeoutMs: 5,
      generateImpl: ({ abortSignal }) =>
        new Promise((_, reject) => {
          abortSignal.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
    });

    await expect(
      provider.extractContractTerms({ sourceText: "Contract source text." }),
    ).rejects.toThrow("Gemini request timed out after 5ms");
  });
});
