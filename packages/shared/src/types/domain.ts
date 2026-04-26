export type BillingPeriod = {
  startDate: string;
  endDate: string;
};

export type PriceResult = {
  subtotal: number;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    metadata?: Record<string, unknown>;
  }>;
};

export type ContractContext = {
  contractId: string;
  customerId: string;
};

