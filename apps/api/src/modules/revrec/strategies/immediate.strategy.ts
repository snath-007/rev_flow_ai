import { roundRevenueAmount } from "../money.js";
import type { RecognitionInput, RecognitionStrategy, RevenueScheduleOutput } from "../revrec.types.js";

export const immediateRecognitionStrategy: RecognitionStrategy = {
  recognitionMethod: "immediate",
  calculate(input: RecognitionInput): RevenueScheduleOutput[] {
    const recognizedAmount = roundRevenueAmount(input.amount);

    return [
      {
        invoiceId: input.invoiceId,
        invoiceLineItemId: input.invoiceLineItemId,
        performanceObligationId: input.performanceObligationId ?? null,
        recognitionMethod: "immediate",
        periodStart: input.serviceStartDate,
        periodEnd: input.serviceEndDate,
        recognitionDate: input.serviceStartDate,
        recognizedAmount,
        deferredAmount: 0,
        currency: input.currency,
        calculationSnapshot: {
          source: "revrec-engine",
          strategy: "immediate",
          originalAmount: input.amount,
          allocationIndex: 1,
          allocationCount: 1
        }
      }
    ];
  }
};