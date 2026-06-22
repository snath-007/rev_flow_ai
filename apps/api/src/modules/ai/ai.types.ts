import type { AiConfidenceSummary, AiExtractionOutput } from "@revflow/shared";

export type ContractExtractionInput = {
  sourceText: string;
  sourceName?: string | null;
};

export type ContractExtractionResult = {
  provider: string;
  model: string | null;
  promptVersion: string;
  output: AiExtractionOutput;
  confidenceSummary: AiConfidenceSummary;
};

export type AiProvider = {
  name: string;
  extractContractTerms(input: ContractExtractionInput): Promise<ContractExtractionResult>;
};