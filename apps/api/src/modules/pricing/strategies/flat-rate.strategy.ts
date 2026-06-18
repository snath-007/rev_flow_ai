import { roundMoney } from "../money.js";
import type { PriceResult, PricingStrategy, PricingStrategyInput } from "../pricing.types.js";

export const flatRateStrategy: PricingStrategy = {
  pricingModel: "flat",
  calculate(input: PricingStrategyInput): PriceResult {
    const quantity = 1;
    const unitPrice = input.context.unitPrice;
    const amount = roundMoney(quantity * unitPrice);

    return {
      pricingModel: "flat",
      quantity,
      unitPrice,
      amount,
      currency: input.context.currency,
      snapshot: {
        pricingModel: "flat",
        strategy: "flat-rate",
        period: input.period,
        quantity,
        unitPrice,
        amount,
        usage: input.usage,
        config: input.config
      }
    };
  }
};
