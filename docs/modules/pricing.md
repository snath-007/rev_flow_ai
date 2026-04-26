# Pricing Module Plan

## Purpose

Calculate invoice charges from pricing configuration, usage aggregates, and contract context.

## Responsibilities

- Provide a deterministic pricing engine
- Support multiple pricing strategies
- Return calculation breakdowns
- Keep pricing logic independent from HTTP and database code

## Planned Strategies

- Flat rate
- Seat-based
- Pay-as-you-go usage
- Tiered usage
- Volume pricing
- Included units plus overage
- Minimum commitment
- Prepaid credit burn-down
- Hybrid subscription plus usage

## Core Interface

```ts
interface PricingStrategy<TConfig, TUsage> {
  calculate(input: {
    config: TConfig;
    usage: TUsage;
    period: BillingPeriod;
    contractContext: ContractContext;
  }): PriceResult;
}
```

## Testing Plan

- Unit tests for every strategy
- Boundary tests for tiers
- Zero usage tests
- Included unit tests
- Minimum commitment tests
- Rounding tests

