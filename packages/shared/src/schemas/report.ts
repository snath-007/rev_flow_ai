import { z } from "zod";

export const reportDataCompletenessSchema = z.enum(["complete", "partial", "unavailable"]);

export const reportExceptionSchema = z.object({
  code: z.string(),
  message: z.string(),
  source: z.string().optional(),
  count: z.number().int().nonnegative().optional()
});

export const reportMetadataSchema = z.object({
  workspaceId: z.string().uuid(),
  asOf: z.string(),
  currency: z.string().nullable(),
  definitionVersion: z.literal("phase6-v1"),
  generatedAt: z.string(),
  dataCompleteness: reportDataCompletenessSchema,
  assumptions: z.array(z.string()),
  exceptions: z.array(reportExceptionSchema)
});

export const currencyAmountSchema = z.object({
  currency: z.string(),
  amount: z.number()
});




export const recurringRevenueIncludedLineSchema = z.object({
  customerId: z.string().uuid(),
  customerName: z.string(),
  contractId: z.string().uuid(),
  contractLineItemId: z.string().uuid(),
  lineItemName: z.string(),
  productName: z.string(),
  planName: z.string(),
  billingInterval: z.enum(["monthly", "annual"]),
  currency: z.string(),
  committedAmount: z.number(),
  mrr: z.number(),
  arr: z.number()
});

export const recurringRevenueExcludedLineSchema = z.object({
  customerId: z.string().uuid(),
  customerName: z.string(),
  contractId: z.string().uuid(),
  contractLineItemId: z.string().uuid(),
  lineItemName: z.string(),
  productName: z.string(),
  planName: z.string(),
  pricingModel: z.enum(["flat", "per_unit", "tiered"]),
  currency: z.string(),
  reason: z.string()
});

export const recurringRevenueCurrencyTotalSchema = z.object({
  currency: z.string(),
  mrr: z.number(),
  arr: z.number(),
  includedLineCount: z.number().int().nonnegative(),
  excludedLineCount: z.number().int().nonnegative()
});

export const recurringRevenueReportSchema = z.object({
  metadata: reportMetadataSchema,
  totals: z.array(recurringRevenueCurrencyTotalSchema),
  includedLines: z.array(recurringRevenueIncludedLineSchema),
  excludedLines: z.array(recurringRevenueExcludedLineSchema),
  currencies: z.array(z.string())
});
export const arAgingBucketSchema = z.enum(["current", "1-30", "31-60", "61-90", "90+"]);

export const arAgingBucketTotalSchema = z.object({
  bucket: arAgingBucketSchema,
  currency: z.string(),
  amount: z.number(),
  invoiceCount: z.number().int().nonnegative()
});

export const arAgingCreditSchema = z.object({
  currency: z.string(),
  amount: z.number(),
  invoiceCount: z.number().int().nonnegative()
});

export const arAgingReportSchema = z.object({
  metadata: reportMetadataSchema,
  buckets: z.array(arAgingBucketTotalSchema),
  credits: z.array(arAgingCreditSchema),
  currencies: z.array(z.string())
});

export const dsoMetricSchema = z.object({
  currency: z.string(),
  dsoDays: z.number().nullable(),
  openingAr: z.number(),
  closingAr: z.number(),
  averageAr: z.number(),
  creditSales: z.number(),
  windowDays: z.number().int().positive(),
  status: z.enum(["available", "unavailable"])
});

export const dsoReportSchema = z.object({
  metadata: reportMetadataSchema,
  metrics: z.array(dsoMetricSchema),
  currencies: z.array(z.string())
});
export const revenueWaterfallPeriodSchema = z.object({
  period: z.string(),
  currency: z.string(),
  openingDeferred: z.number(),
  scheduleAdditions: z.number(),
  recognizedRevenue: z.number(),
  closingDeferred: z.number(),
  generatedAmount: z.number(),
  postedAmount: z.number(),
  scheduleCount: z.number().int().nonnegative()
});

export const revenueWaterfallReportSchema = z.object({
  metadata: reportMetadataSchema,
  periods: z.array(revenueWaterfallPeriodSchema),
  currencies: z.array(z.string())
});
export const reportOverviewSchema = z.object({
  metadata: reportMetadataSchema,
  kpis: z.object({
    openAr: z.array(currencyAmountSchema),
    cashReceived: z.array(currencyAmountSchema),
    recognizedRevenue: z.array(currencyAmountSchema),
    deferredRevenue: z.array(currencyAmountSchema),
    activeContracts: z.number().int().nonnegative(),
    payableInvoices: z.number().int().nonnegative(),
    reportingCurrencies: z.array(z.string())
  })
});

export type ArAgingBucket = z.infer<typeof arAgingBucketSchema>;
export type ArAgingBucketTotal = z.infer<typeof arAgingBucketTotalSchema>;
export type ArAgingCredit = z.infer<typeof arAgingCreditSchema>;
export type ArAgingReport = z.infer<typeof arAgingReportSchema>;
export type CurrencyAmount = z.infer<typeof currencyAmountSchema>;
export type DsoMetric = z.infer<typeof dsoMetricSchema>;
export type DsoReport = z.infer<typeof dsoReportSchema>;
export type RecurringRevenueCurrencyTotal = z.infer<typeof recurringRevenueCurrencyTotalSchema>;
export type RecurringRevenueExcludedLine = z.infer<typeof recurringRevenueExcludedLineSchema>;
export type RecurringRevenueIncludedLine = z.infer<typeof recurringRevenueIncludedLineSchema>;
export type RecurringRevenueReport = z.infer<typeof recurringRevenueReportSchema>;
export type ReportDataCompleteness = z.infer<typeof reportDataCompletenessSchema>;
export type ReportException = z.infer<typeof reportExceptionSchema>;
export type ReportMetadata = z.infer<typeof reportMetadataSchema>;
export type ReportOverview = z.infer<typeof reportOverviewSchema>;
export type RevenueWaterfallPeriod = z.infer<typeof revenueWaterfallPeriodSchema>;
export type RevenueWaterfallReport = z.infer<typeof revenueWaterfallReportSchema>;