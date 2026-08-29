import type { AiProvider } from "../ai.types.js";
import { geminiAiProvider } from "./gemini-ai-provider.js";
import { mockAiProvider } from "./mock-ai-provider.js";

const providers: Record<string, AiProvider> = {
  gemini: geminiAiProvider,
  mock: mockAiProvider,
};

export function getAiProvider(
  providerName = process.env.AI_PROVIDER ?? "gemini",
): AiProvider {
  const provider = providers[providerName.toLowerCase()];

  if (!provider) {
    throw new Error(`Unsupported AI provider: ${providerName}`);
  }

  return provider;
}
