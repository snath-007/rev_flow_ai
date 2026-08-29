export type RevenueRecognitionMethod = "immediate" | "straight_line" | "usage_based";

export type RecognitionPeriod = {
  periodStart: string;
  periodEnd: string;
  recognitionDate: string;
};

export type RecognitionInput = {
  invoiceId: string;
  invoiceLineItemId: string;
  performanceObligationId?: string | null;
  recognitionMethod: RevenueRecognitionMethod;
  amount: number;
  currency: string;
  serviceStartDate: string;
  serviceEndDate: string;
};

export type RevenueScheduleOutput = RecognitionPeriod & {
  invoiceId: string;
  invoiceLineItemId: string;
  performanceObligationId: string | null;
  recognitionMethod: RevenueRecognitionMethod;
  recognizedAmount: number;
  deferredAmount: number;
  currency: string;
  calculationSnapshot: {
    source: "revrec-engine";
    strategy: string;
    originalAmount: number;
    allocationIndex: number;
    allocationCount: number;
  };
};

export type RecognitionStrategy = {
  recognitionMethod: RevenueRecognitionMethod;
  calculate(input: RecognitionInput): RevenueScheduleOutput[];
};