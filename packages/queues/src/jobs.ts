export type UsageAggregationJob = {
  workspaceId: string;
  initiatedByExternalUserId: string;
  contractId: string;
  meterId: string;
  periodStart: string;
  periodEnd: string;
};

export type InvoiceGenerationJob = {
  workspaceId: string;
  initiatedByExternalUserId: string;
  contractId: string;
  periodStart: string;
  periodEnd: string;
};

export type RevenueRecognitionJob = {
  workspaceId: string;
  initiatedByExternalUserId: string;
  invoiceId: string;
};

export type RevFlowJob =
  | { name: "usage.aggregate"; data: UsageAggregationJob }
  | { name: "invoice.generate"; data: InvoiceGenerationJob }
  | { name: "revenue.recognize"; data: RevenueRecognitionJob };

