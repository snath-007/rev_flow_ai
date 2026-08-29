import { allocateRevenueEvenly, roundRevenueAmount } from "../money.js";
import { buildMonthlyRecognitionPeriods } from "../periods.js";
import type { RecognitionInput, RecognitionStrategy, RevenueScheduleOutput } from "../revrec.types.js";

export const straightLineRecognitionStrategy: RecognitionStrategy = {
  recognitionMethod: "straight_line",
  calculate(input: RecognitionInput): RevenueScheduleOutput[] {
    const periods = buildMonthlyRecognitionPeriods(input.serviceStartDate, input.serviceEndDate);
    const allocations = allocateRevenueEvenly(input.amount, periods.length);
    let recognizedToDate = 0;

    return periods.map((period, index) => {
      const recognizedAmount = allocations[index] ?? 0;
      recognizedToDate = roundRevenueAmount(recognizedToDate + recognizedAmount);

      return {
        invoiceId: input.invoiceId,
        invoiceLineItemId: input.invoiceLineItemId,
        performanceObligationId: input.performanceObligationId ?? null,
        recognitionMethod: "straight_line",
        ...period,
        recognizedAmount,
        deferredAmount: roundRevenueAmount(input.amount - recognizedToDate),
        currency: input.currency,
        calculationSnapshot: {
          source: "revrec-engine",
          strategy: "straight-line-monthly",
          originalAmount: input.amount,
          allocationIndex: index + 1,
          allocationCount: periods.length
        }
      };
    });
  }
};