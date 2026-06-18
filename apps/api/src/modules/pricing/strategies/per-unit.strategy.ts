import { roundMoney } from "../money.js";
import type { PriceResult, PricingStrategy, PricingStrategyInput } from "../pricing.types.js";

export const perUnitStrategy: PricingStrategy = {
  pricingModel: "per_unit",
  calculate(input: PricingStrategyInput): PriceResult {
    const quantity = input.usage.billableQuantity;
    const unitPrice = input.context.unitPrice;
    const amount = roundMoney(quantity * unitPrice);

    return {
      pricingModel: "per_unit",
      quantity,
      unitPrice,
      amount,
      currency: input.context.currency,
      snapshot: {
        pricingModel: "per_unit",
        strategy: "per-unit",
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
