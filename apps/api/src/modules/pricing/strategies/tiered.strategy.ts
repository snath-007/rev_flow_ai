import { roundMoney } from "../money.js";
import type { PriceResult, PricingStrategy, PricingStrategyInput } from "../pricing.types.js";

export type TieredPricingMode = "graduated" | "volume";

export type TieredPricingTier = {
  upTo: number | null;
  unitPrice: number;
};

export type TieredPricingConfig = {
  mode?: TieredPricingMode;
  tiers: TieredPricingTier[];
};

type TierCalculation = {
  from: number;
  upTo: number | null;
  quantity: number;
  unitPrice: number;
  amount: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toFiniteNumber(value: unknown, fieldName: string) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`Invalid tiered pricing config: ${fieldName} must be a finite number`);
  }

  return numberValue;
}

function parseTieredPricingConfig(config: unknown): Required<TieredPricingConfig> {
  if (!isRecord(config)) {
    throw new Error("Invalid tiered pricing config: config must be an object");
  }

  const mode = config.mode === undefined ? "graduated" : config.mode;

  if (mode !== "graduated" && mode !== "volume") {
    throw new Error("Invalid tiered pricing config: mode must be graduated or volume");
  }

  const rawTiers = config.tiers;

  if (!Array.isArray(rawTiers) || rawTiers.length === 0) {
    throw new Error("Invalid tiered pricing config: tiers must be a non-empty array");
  }

  const tiers = rawTiers.map((tier, index) => {
    if (!isRecord(tier)) {
      throw new Error(`Invalid tiered pricing config: tier ${index + 1} must be an object`);
    }

    const upTo = tier.upTo === null ? null : toFiniteNumber(tier.upTo, `tier ${index + 1} upTo`);
    const unitPrice = toFiniteNumber(tier.unitPrice, `tier ${index + 1} unitPrice`);

    if (upTo !== null && upTo <= 0) {
      throw new Error(`Invalid tiered pricing config: tier ${index + 1} upTo must be positive or null`);
    }

    if (unitPrice < 0) {
      throw new Error(`Invalid tiered pricing config: tier ${index + 1} unitPrice must be non-negative`);
    }

    if (upTo === null && index !== rawTiers.length - 1) {
      throw new Error("Invalid tiered pricing config: open-ended tier must be last");
    }

    return { upTo, unitPrice };
  });

  for (let index = 1; index < tiers.length; index += 1) {
    const previous = tiers[index - 1];
    const current = tiers[index];

    if (previous?.upTo === null) {
      throw new Error("Invalid tiered pricing config: open-ended tier must be last");
    }

    if (!previous || !current) {
      throw new Error("Invalid tiered pricing config: tiers must be a non-empty array");
    }

    if (current.upTo !== null && current.upTo <= previous.upTo) {
      throw new Error("Invalid tiered pricing config: tier upTo values must increase");
    }
  }

  return { mode, tiers };
}

function calculateGraduatedAmount(quantity: number, tiers: TieredPricingTier[]) {
  let previousUpperBound = 0;
  let amount = 0;
  const calculations: TierCalculation[] = [];

  for (const tier of tiers) {
    const upperBound = tier.upTo ?? Number.POSITIVE_INFINITY;
    const tierQuantity = Math.max(Math.min(quantity, upperBound) - previousUpperBound, 0);

    if (tierQuantity > 0) {
      const tierAmount = roundMoney(tierQuantity * tier.unitPrice);
      amount += tierAmount;
      calculations.push({
        from: previousUpperBound,
        upTo: tier.upTo,
        quantity: tierQuantity,
        unitPrice: tier.unitPrice,
        amount: tierAmount
      });
    }

    previousUpperBound = upperBound;

    if (quantity <= upperBound) {
      break;
    }
  }

  return {
    amount: roundMoney(amount),
    calculations
  };
}

function calculateVolumeAmount(quantity: number, tiers: TieredPricingTier[]) {
  const selectedTier = tiers.find((tier) => tier.upTo === null || quantity <= tier.upTo) ?? tiers.at(-1);

  if (!selectedTier) {
    throw new Error("Invalid tiered pricing config: tiers must be a non-empty array");
  }

  const amount = roundMoney(quantity * selectedTier.unitPrice);

  return {
    amount,
    calculations: [
      {
        from: 0,
        upTo: selectedTier.upTo,
        quantity,
        unitPrice: selectedTier.unitPrice,
        amount
      }
    ]
  };
}

export const tieredStrategy: PricingStrategy = {
  pricingModel: "tiered",
  calculate(input: PricingStrategyInput): PriceResult {
    const config = parseTieredPricingConfig(input.config);
    const quantity = input.usage.billableQuantity;
    const result =
      config.mode === "volume"
        ? calculateVolumeAmount(quantity, config.tiers)
        : calculateGraduatedAmount(quantity, config.tiers);
    const effectiveUnitPrice = quantity === 0 ? 0 : roundMoney(result.amount / quantity);

    return {
      pricingModel: "tiered",
      quantity,
      unitPrice: effectiveUnitPrice,
      amount: result.amount,
      currency: input.context.currency,
      snapshot: {
        pricingModel: "tiered",
        strategy: `tiered-${config.mode}`,
        period: input.period,
        quantity,
        unitPrice: effectiveUnitPrice,
        amount: result.amount,
        usage: input.usage,
        config,
        details: {
          tierCalculations: result.calculations
        }
      }
    };
  }
};

