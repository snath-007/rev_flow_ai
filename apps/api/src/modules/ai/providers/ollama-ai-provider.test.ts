import { describe, expect, it, vi } from "vitest";

import { getAiProvider } from "./ai-provider.js";
import { createOllamaAiProvider, ollamaAiProvider } from "./ollama-ai-provider.js";

const validOutput = {
  summary: "Extracted one customer field.",
  fields: [
    {
      key: "customer_name",
      label: "Customer name",
      category: "customer",
      value: "Acme Analytics",
      confidence: 0.9,
      sourceSnippet: "Customer: Acme Analytics",
      ambiguity: null
    },
    {
      key: "unit_price",
      label: "Unit price",
      category: "pricing",
      value: null,
      confidence: 0.2,
      sourceSnippet: null,
      ambiguity: "Unit price was not supplied."
    }
  ],
  ambiguities: ["Unit price was not supplied."],
  missingFields: ["Unit price"]
};

describe("Ollama AI provider", () => {
  it("requests structured output and validates the model response", async () => {
    let requestedInput: RequestInfo | URL | undefined;
    let requestedInit: RequestInit | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      requestedInput = input;
      requestedInit = init;
      return new Response(JSON.stringify({
        model: "qwen2.5:7b",
        message: { content: JSON.stringify(validOutput) }
      }), { status: 200, headers: { "content-type": "application/json" } });
    };
    const provider = createOllamaAiProvider({
      baseUrl: "http://ollama.test/",
      model: "qwen2.5:7b",
      timeoutMs: 1_000,
      fetchImpl
    });

    const result = await provider.extractContractTerms({
      sourceName: "msa.txt",
      sourceText: "Customer: Acme Analytics. Commercial terms follow in this agreement."
    });

    expect(requestedInput).toBe("http://ollama.test/api/chat");
    const request = JSON.parse(String(requestedInit?.body));
    expect(request.model).toBe("qwen2.5:7b");
    expect(request.stream).toBe(false);
    expect(request.format.type).toBe("object");
    expect(request.messages[1].content).toContain("<contract_source>");
    expect(result.provider).toBe("ollama");
    expect(result.model).toBe("qwen2.5:7b");
    expect(result.output).toEqual(validOutput);
    expect(result.confidenceSummary).toEqual({
      overall: 0.55,
      highConfidenceCount: 1,
      lowConfidenceCount: 1
    });
  });

  it("surfaces Ollama HTTP errors", async () => {
    const provider = createOllamaAiProvider({
      model: "qwen2.5:7b",
      fetchImpl: vi.fn(async () => new Response("model not found", { status: 404 }))
    });

    await expect(provider.extractContractTerms({ sourceText: "A sufficiently long contract source." }))
      .rejects.toThrow("Ollama request failed with 404: model not found");
  });

  it("rejects malformed or schema-invalid model output", async () => {
    const malformedProvider = createOllamaAiProvider({
      model: "qwen2.5:7b",
      fetchImpl: vi.fn(async () => new Response(JSON.stringify({
        message: { content: "not-json" }
      })))
    });
    const invalidProvider = createOllamaAiProvider({
      model: "qwen2.5:7b",
      fetchImpl: vi.fn(async () => new Response(JSON.stringify({
        message: { content: JSON.stringify({ ...validOutput, fields: "invalid" }) }
      })))
    });

    await expect(malformedProvider.extractContractTerms({ sourceText: "Contract source text." }))
      .rejects.toThrow("Ollama returned invalid JSON");
    await expect(invalidProvider.extractContractTerms({ sourceText: "Contract source text." }))
      .rejects.toThrow();
  });

  it("requires a configured model and is available through the provider registry", async () => {
    const provider = createOllamaAiProvider({
      model: "",
      fetchImpl: vi.fn()
    });

    expect(getAiProvider("ollama")).toBe(ollamaAiProvider);
    await expect(provider.extractContractTerms({ sourceText: "Contract source text." }))
      .rejects.toThrow("OLLAMA_MODEL is required");
  });
});
