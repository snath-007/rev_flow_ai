import type { RecognitionInput, RecognitionStrategy, RevenueScheduleOutput } from "../revrec.types.js";

export const usageBasedRecognitionStrategy: RecognitionStrategy = {
  recognitionMethod: "usage_based",
  calculate(_input: RecognitionInput): RevenueScheduleOutput[] {
    throw new Error("usage-based revenue recognition is not implemented in the Phase 4 skeleton");
  }
};