import type { AiProvider } from "../ai.types.js";
import { mockAiProvider } from "./mock-ai-provider.js";
import { ollamaAiProvider } from "./ollama-ai-provider.js";

const providers: Record<string, AiProvider> = {
  mock: mockAiProvider,
  ollama: ollamaAiProvider
};

export function getAiProvider(providerName = process.env.AI_PROVIDER ?? "mock"): AiProvider {
  const provider = providers[providerName.toLowerCase()];

  if (!provider) {
    throw new Error(`Unsupported AI provider: ${providerName}`);
  }

  return provider;
}