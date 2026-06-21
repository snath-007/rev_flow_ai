import { immediateRecognitionStrategy } from "./strategies/immediate.strategy.js";
import { straightLineRecognitionStrategy } from "./strategies/straight-line.strategy.js";
import { usageBasedRecognitionStrategy } from "./strategies/usage-based.strategy.js";
import type { RecognitionInput, RecognitionStrategy, RevenueRecognitionMethod, RevenueScheduleOutput } from "./revrec.types.js";

const strategies = new Map<RevenueRecognitionMethod, RecognitionStrategy>([
  [immediateRecognitionStrategy.recognitionMethod, immediateRecognitionStrategy],
  [straightLineRecognitionStrategy.recognitionMethod, straightLineRecognitionStrategy],
  [usageBasedRecognitionStrategy.recognitionMethod, usageBasedRecognitionStrategy]
]);

export function getRecognitionStrategy(recognitionMethod: RevenueRecognitionMethod) {
  const strategy = strategies.get(recognitionMethod);

  if (!strategy) {
    throw new Error(`Unsupported revenue recognition method: ${recognitionMethod}`);
  }

  return strategy;
}

export function calculateRevenueSchedule(input: RecognitionInput): RevenueScheduleOutput[] {
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    throw new Error("recognition amount must be a non-negative number");
  }

  const strategy = getRecognitionStrategy(input.recognitionMethod);
  return strategy.calculate(input);
}