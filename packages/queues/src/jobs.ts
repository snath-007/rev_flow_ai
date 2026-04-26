export type UsageAggregationJob = {
  contractId: string;
  meterId: string;
  periodStart: string;
  periodEnd: string;
};

export type InvoiceGenerationJob = {
  contractId: string;
  periodStart: string;
  periodEnd: string;
};

export type RevenueRecognitionJob = {
  invoiceId: string;
};

export type RevFlowJob =
  | { name: "usage.aggregate"; data: UsageAggregationJob }
  | { name: "invoice.generate"; data: InvoiceGenerationJob }
  | { name: "revenue.recognize"; data: RevenueRecognitionJob };

