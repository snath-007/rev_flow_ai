import { describe, expect, it } from "vitest";

import { calculateInvoiceLineItems, type BillableInvoiceLineInput } from "../invoices/invoice-calculator.js";
import { calculateMoneyTotal, calculatePrice, type CalculatePriceInput } from "./index.js";

const period = {
  start: "2026-06-01",
  end: "2026-06-30"
};

function invoiceLine(overrides: Partial<BillableInvoiceLineInput>): BillableInvoiceLineInput {
  return {
    contract_line_item_id: "contract-line-1",
    price_rule_id: "price-rule-1",
    description: "Usage charges",
    pricing_model: "per_unit",
    unit_price: "0.0100",
    currency: "USD",
    meter_id: "meter-1",
    meter_name: "API calls",
    aggregation_type: "sum",
    unit: "calls",
    event_count: "2",
    total_quantity: "12",
    billable_quantity: "12",
    ...overrides
  };
}

function pricingInput(overrides: Partial<CalculatePriceInput>): CalculatePriceInput {
  return {
    pricingModel: "per_unit",
    config: {},
    usage: {
      billableQuantity: 12,
      eventCount: 2,
      totalQuantity: 12,
      aggregationType: "sum",
      unit: "calls",
      meterId: "meter-1",
      meterName: "API calls"
    },
    period,
    context: {
      priceRuleId: "price-rule-1",
      contractLineItemId: "contract-line-1",
      currency: "USD",
      unitPrice: 0.01
    },
    ...overrides
  };
}

describe("pricing engine", () => {
  it("matches current flat-rate invoice behavior", () => {
    const [invoiceResult] = calculateInvoiceLineItems([
      invoiceLine({
        pricing_model: "flat",
        unit_price: "99.0000",
        meter_id: null,
        meter_name: null,
        aggregation_type: null,
        unit: null,
        event_count: "0",
        total_quantity: null,
        billable_quantity: null
      })
    ]);

    const pricingResult = calculatePrice(
      pricingInput({
        pricingModel: "flat",
        usage: {
          billableQuantity: 0,
          eventCount: 0,
          totalQuantity: 0,
          aggregationType: null,
          unit: null,
          meterId: null,
          meterName: null
        },
        context: {
          priceRuleId: "price-rule-1",
          contractLineItemId: "contract-line-1",
          currency: "USD",
          unitPrice: 99
        }
      })
    );

    expect(pricingResult.quantity).toBe(invoiceResult?.quantity);
    expect(pricingResult.unitPrice).toBe(invoiceResult?.unitPrice);
    expect(pricingResult.amount).toBe(invoiceResult?.amount);
    expect(pricingResult.snapshot.strategy).toBe("flat-rate");
  });

  it("matches current per-unit invoice behavior", () => {
    const [invoiceResult] = calculateInvoiceLineItems([
      invoiceLine({ billable_quantity: "7", unit_price: "0.0100" })
    ]);

    const pricingResult = calculatePrice(
      pricingInput({
        usage: {
          billableQuantity: 7,
          eventCount: 2,
          totalQuantity: 7,
          aggregationType: "sum",
          unit: "calls",
          meterId: "meter-1",
          meterName: "API calls"
        },
        context: {
          priceRuleId: "price-rule-1",
          contractLineItemId: "contract-line-1",
          currency: "USD",
          unitPrice: 0.01
        }
      })
    );

    expect(pricingResult.quantity).toBe(invoiceResult?.quantity);
    expect(pricingResult.unitPrice).toBe(invoiceResult?.unitPrice);
    expect(pricingResult.amount).toBe(invoiceResult?.amount);
    expect(pricingResult.snapshot.strategy).toBe("per-unit");
  });

  it("rounds line amounts and totals to four decimal places", () => {
    const pricingResult = calculatePrice(
      pricingInput({
        usage: {
          billableQuantity: 3,
          eventCount: 3,
          totalQuantity: 3,
          aggregationType: "count",
          unit: "seat",
          meterId: "meter-1",
          meterName: "Seats"
        },
        context: {
          priceRuleId: "price-rule-1",
          contractLineItemId: "contract-line-1",
          currency: "USD",
          unitPrice: 0.333333
        }
      })
    );

    expect(pricingResult.amount).toBe(1);
    expect(calculateMoneyTotal([{ amount: 0.10555 }, { amount: 0.10444 }])).toBe(0.21);
  });

  it("keeps zero-usage per-unit lines deterministic", () => {
    const pricingResult = calculatePrice(
      pricingInput({
        usage: {
          billableQuantity: 0,
          eventCount: 0,
          totalQuantity: 0,
          aggregationType: "sum",
          unit: "calls",
          meterId: "meter-1",
          meterName: "API calls"
        }
      })
    );

    expect(pricingResult.quantity).toBe(0);
    expect(pricingResult.amount).toBe(0);
  });
  it("calculates graduated tiered pricing across thresholds", () => {
    const pricingResult = calculatePrice(
      pricingInput({
        pricingModel: "tiered",
        config: {
          mode: "graduated",
          tiers: [
            { upTo: 10, unitPrice: 1 },
            { upTo: 20, unitPrice: 0.8 },
            { upTo: null, unitPrice: 0.5 }
          ]
        },
        usage: {
          billableQuantity: 25,
          eventCount: 3,
          totalQuantity: 25,
          aggregationType: "sum",
          unit: "calls",
          meterId: "meter-1",
          meterName: "API calls"
        }
      })
    );

    expect(pricingResult.amount).toBe(20.5);
    expect(pricingResult.unitPrice).toBe(0.82);
    expect(pricingResult.snapshot.strategy).toBe("tiered-graduated");
    expect(pricingResult.snapshot.details).toEqual({
      tierCalculations: [
        { from: 0, upTo: 10, quantity: 10, unitPrice: 1, amount: 10 },
        { from: 10, upTo: 20, quantity: 10, unitPrice: 0.8, amount: 8 },
        { from: 20, upTo: null, quantity: 5, unitPrice: 0.5, amount: 2.5 }
      ]
    });
  });

  it("calculates exact threshold usage without spilling into the next graduated tier", () => {
    const pricingResult = calculatePrice(
      pricingInput({
        pricingModel: "tiered",
        config: {
          tiers: [
            { upTo: 10, unitPrice: 1 },
            { upTo: null, unitPrice: 0.5 }
          ]
        },
        usage: {
          billableQuantity: 10,
          eventCount: 1,
          totalQuantity: 10,
          aggregationType: "sum",
          unit: "calls",
          meterId: "meter-1",
          meterName: "API calls"
        }
      })
    );

    expect(pricingResult.amount).toBe(10);
    expect(pricingResult.snapshot.details).toEqual({
      tierCalculations: [{ from: 0, upTo: 10, quantity: 10, unitPrice: 1, amount: 10 }]
    });
  });

  it("calculates volume tiered pricing using the selected tier rate for all units", () => {
    const pricingResult = calculatePrice(
      pricingInput({
        pricingModel: "tiered",
        config: {
          mode: "volume",
          tiers: [
            { upTo: 10, unitPrice: 1 },
            { upTo: 20, unitPrice: 0.8 },
            { upTo: null, unitPrice: 0.5 }
          ]
        },
        usage: {
          billableQuantity: 25,
          eventCount: 3,
          totalQuantity: 25,
          aggregationType: "sum",
          unit: "calls",
          meterId: "meter-1",
          meterName: "API calls"
        }
      })
    );

    expect(pricingResult.amount).toBe(12.5);
    expect(pricingResult.unitPrice).toBe(0.5);
    expect(pricingResult.snapshot.strategy).toBe("tiered-volume");
  });

  it("rounds decimal tier rates deterministically", () => {
    const pricingResult = calculatePrice(
      pricingInput({
        pricingModel: "tiered",
        config: {
          tiers: [{ upTo: null, unitPrice: 0.333333 }]
        },
        usage: {
          billableQuantity: 3,
          eventCount: 3,
          totalQuantity: 3,
          aggregationType: "count",
          unit: "seat",
          meterId: "meter-1",
          meterName: "Seats"
        }
      })
    );

    expect(pricingResult.amount).toBe(1);
    expect(pricingResult.unitPrice).toBe(0.3333);
  });

  it("keeps zero-usage tiered pricing deterministic", () => {
    const pricingResult = calculatePrice(
      pricingInput({
        pricingModel: "tiered",
        config: {
          tiers: [{ upTo: null, unitPrice: 0.5 }]
        },
        usage: {
          billableQuantity: 0,
          eventCount: 0,
          totalQuantity: 0,
          aggregationType: "sum",
          unit: "calls",
          meterId: "meter-1",
          meterName: "API calls"
        }
      })
    );

    expect(pricingResult.quantity).toBe(0);
    expect(pricingResult.unitPrice).toBe(0);
    expect(pricingResult.amount).toBe(0);
    expect(pricingResult.snapshot.details).toEqual({ tierCalculations: [] });
  });

  it("rejects empty tier configs", () => {
    expect(() =>
      calculatePrice(
        pricingInput({
          pricingModel: "tiered",
          config: { tiers: [] }
        })
      )
    ).toThrow("tiers must be a non-empty array");
  });

  it("rejects non-increasing tier thresholds", () => {
    expect(() =>
      calculatePrice(
        pricingInput({
          pricingModel: "tiered",
          config: {
            tiers: [
              { upTo: 10, unitPrice: 1 },
              { upTo: 10, unitPrice: 0.8 }
            ]
          }
        })
      )
    ).toThrow("tier upTo values must increase");
  });
});
