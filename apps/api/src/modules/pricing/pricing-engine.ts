import { flatRateStrategy } from "./strategies/flat-rate.strategy.js";
import { perUnitStrategy } from "./strategies/per-unit.strategy.js";
import { tieredStrategy } from "./strategies/tiered.strategy.js";
import type { PriceResult, PricingModel, PricingStrategy, PricingStrategyInput } from "./pricing.types.js";

const strategies = new Map<PricingModel, PricingStrategy>([
  [flatRateStrategy.pricingModel, flatRateStrategy],
  [perUnitStrategy.pricingModel, perUnitStrategy],
  [tieredStrategy.pricingModel, tieredStrategy]
]);

export type CalculatePriceInput = PricingStrategyInput & {
  pricingModel: PricingModel;
};

export function getPricingStrategy(pricingModel: PricingModel) {
  const strategy = strategies.get(pricingModel);

  if (!strategy) {
    throw new Error(`Unsupported pricing model: ${pricingModel}`);
  }

  return strategy;
}

export function calculatePrice(input: CalculatePriceInput): PriceResult {
  const strategy = getPricingStrategy(input.pricingModel);
  return strategy.calculate(input);
}
