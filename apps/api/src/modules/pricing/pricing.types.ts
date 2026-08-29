export type PricingModel = "flat" | "per_unit" | "tiered";

export type BillingPeriod = {
  start: string;
  end: string;
};

export type PricingUsage = {
  billableQuantity: number;
  eventCount: number;
  totalQuantity: number;
  aggregationType: "sum" | "count" | null;
  unit: string | null;
  meterId: string | null;
  meterName: string | null;
};

export type PricingContext = {
  priceRuleId: string;
  contractLineItemId?: string;
  currency: string;
  unitPrice: number;
};

export type PricingCalculationSnapshot = {
  pricingModel: PricingModel;
  strategy: string;
  period: BillingPeriod;
  quantity: number;
  unitPrice: number;
  amount: number;
  usage: PricingUsage;
  config: unknown;
  details?: unknown;
};

export type PriceResult = {
  pricingModel: PricingModel;
  quantity: number;
  unitPrice: number;
  amount: number;
  currency: string;
  snapshot: PricingCalculationSnapshot;
};

export type PricingStrategyInput<TConfig = Record<string, unknown>, TUsage extends PricingUsage = PricingUsage> = {
  config: TConfig;
  usage: TUsage;
  period: BillingPeriod;
  context: PricingContext;
};

export type PricingStrategy<TConfig = Record<string, unknown>, TUsage extends PricingUsage = PricingUsage> = {
  pricingModel: PricingModel;
  calculate(input: PricingStrategyInput<TConfig, TUsage>): PriceResult;
};
