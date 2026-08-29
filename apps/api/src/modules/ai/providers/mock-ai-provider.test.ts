import { describe, expect, it } from "vitest";

import { getAiProvider } from "./ai-provider.js";
import { mockAiProvider } from "./mock-ai-provider.js";

const completeContract = `
Customer: Acme Analytics
Email: billing@acme.example
Effective date: 2026-07-01
End date: 2027-06-30
Billing frequency: monthly
Payment terms: Net 30
Product: RevFlow Enterprise
Pricing: per-unit
Unit price: $0.25
Currency: USD
The parties agree to straight-line revenue recognition over the service period.
`;

function fieldValue(
  result: Awaited<ReturnType<typeof mockAiProvider.extractContractTerms>>,
  key: string,
) {
  return result.output.fields.find((field) => field.key === key)?.value;
}

describe("mock AI provider", () => {
  it("extracts structured contract terms deterministically", async () => {
    const first = await mockAiProvider.extractContractTerms({
      sourceText: completeContract,
    });
    const second = await mockAiProvider.extractContractTerms({
      sourceText: completeContract,
    });

    expect(first).toEqual(second);
    expect(first.provider).toBe("mock");
    expect(first.model).toBe("deterministic-contract-parser-v1");
    expect(first.promptVersion).toBe("contract-extraction-v2");
    expect(fieldValue(first, "customer_name")).toBe("Acme Analytics");
    expect(fieldValue(first, "contract_start_date")).toBe("2026-07-01");
    expect(fieldValue(first, "billing_frequency")).toBe("monthly");
    expect(fieldValue(first, "payment_terms")).toBe("NET 30");
    expect(fieldValue(first, "pricing_model")).toBe("per_unit");
    expect(fieldValue(first, "unit_price")).toBe(0.25);
    expect(fieldValue(first, "recognition_method")).toBe("straight_line");
    expect(first.output.missingFields).toEqual([]);
    expect(first.confidenceSummary.lowConfidenceCount).toBe(0);
  });

  it("marks missing terms as ambiguous instead of inventing values", async () => {
    const result = await mockAiProvider.extractContractTerms({
      sourceText:
        "Customer: Minimal Co. This agreement intentionally omits commercial terms.",
    });

    expect(fieldValue(result, "customer_name")).toBe("Minimal Co");
    expect(fieldValue(result, "unit_price")).toBeNull();
    expect(result.output.missingFields).toContain("Unit price");
    expect(result.output.ambiguities).toContain(
      "Unit price was not found in the supplied contract text.",
    );
    expect(result.confidenceSummary.lowConfidenceCount).toBeGreaterThan(0);
  });

  it("keeps the mock provider available and rejects unknown providers", () => {
    expect(getAiProvider("mock")).toBe(mockAiProvider);
    expect(() => getAiProvider("unknown")).toThrow(
      "Unsupported AI provider: unknown",
    );
  });
});
