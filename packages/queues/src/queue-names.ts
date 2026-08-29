export const queueNames = {
  usageAggregation: "usage-aggregation",
  invoiceGeneration: "invoice-generation",
  revenueRecognition: "revenue-recognition"
} as const;

export type QueueName = (typeof queueNames)[keyof typeof queueNames];

