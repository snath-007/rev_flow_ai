import { describe, expect, it } from "vitest";

import { calculateInvoiceLineItems, calculateInvoiceTotal, type BillableInvoiceLineInput } from "./invoice-calculator.js";

function line(overrides: Partial<BillableInvoiceLineInput>): BillableInvoiceLineInput {
  return {
    contract_line_item_id: "contract-line-1",
    price_rule_id: "price-rule-1",
    description: "Usage charges",
    pricing_model: "per_unit",
    unit_price: "0.0100",
    currency: "USD",
    config: {},
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

describe("invoice calculator", () => {
  it("calculates per-unit usage lines from billable quantity through the pricing engine", () => {
    const [invoiceLine] = calculateInvoiceLineItems([line({ billable_quantity: "7", unit_price: "0.0100" })]);

    expect(invoiceLine?.quantity).toBe(7);
    expect(invoiceLine?.unitPrice).toBe(0.01);
    expect(invoiceLine?.amount).toBe(0.07);
    expect(invoiceLine?.calculationSnapshot.pricing.strategy).toBe("per-unit");
  });

  it("uses one unit for flat fees even when no meter is present", () => {
    const [invoiceLine] = calculateInvoiceLineItems([
      line({
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

    expect(invoiceLine?.quantity).toBe(1);
    expect(invoiceLine?.amount).toBe(99);
    expect(invoiceLine?.calculationSnapshot.pricing.strategy).toBe("flat-rate");
  });

  it("calculates tiered lines through the pricing engine", () => {
    const [invoiceLine] = calculateInvoiceLineItems(
      [
        line({
          pricing_model: "tiered",
          unit_price: "0.0000",
          config: {
            tiers: [
              { upTo: 10, unitPrice: 1 },
              { upTo: null, unitPrice: 0.5 }
            ]
          },
          billable_quantity: "15",
          total_quantity: "15"
        })
      ],
      {
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30"
      }
    );

    expect(invoiceLine?.quantity).toBe(15);
    expect(invoiceLine?.unitPrice).toBe(0.8333);
    expect(invoiceLine?.amount).toBe(12.5);
    expect(invoiceLine?.calculationSnapshot.pricing.strategy).toBe("tiered-graduated");
    expect(invoiceLine?.calculationSnapshot.pricing.period).toEqual({
      start: "2026-06-01",
      end: "2026-06-30"
    });
  });

  it("calculates mixed flat, per-unit, and tiered totals", () => {
    const invoiceLines = calculateInvoiceLineItems([
      line({
        pricing_model: "flat",
        unit_price: "100.0000",
        meter_id: null,
        meter_name: null,
        aggregation_type: null,
        unit: null,
        event_count: "0",
        total_quantity: null,
        billable_quantity: null
      }),
      line({ billable_quantity: "7", unit_price: "0.0100" }),
      line({
        pricing_model: "tiered",
        unit_price: "0.0000",
        config: {
          mode: "volume",
          tiers: [
            { upTo: 10, unitPrice: 1 },
            { upTo: null, unitPrice: 0.5 }
          ]
        },
        billable_quantity: "15",
        total_quantity: "15"
      })
    ]);

    expect(calculateInvoiceTotal(invoiceLines)).toBe(107.57);
  });

  it("rounds invoice totals to four decimal places", () => {
    expect(calculateInvoiceTotal([{ amount: 0.10555 }, { amount: 0.10444 }])).toBe(0.21);
  });
  it("records persisted aggregate source metadata in calculation snapshots", () => {
    const [invoiceLine] = calculateInvoiceLineItems([
      line({
        usage_source: "aggregate",
        usage_aggregate_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        event_count: "4",
        total_quantity: "20",
        billable_quantity: "20"
      })
    ]);

    expect(invoiceLine?.calculationSnapshot.usageSource).toBe("aggregate");
    expect(invoiceLine?.calculationSnapshot.usageAggregateId).toBe("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    expect(invoiceLine?.calculationSnapshot.eventCount).toBe(4);
    expect(invoiceLine?.calculationSnapshot.totalQuantity).toBe(20);
  });

  it("defaults metered lines to raw-event fallback metadata when no aggregate source is supplied", () => {
    const [invoiceLine] = calculateInvoiceLineItems([line({ usage_source: undefined })]);

    expect(invoiceLine?.calculationSnapshot.usageSource).toBe("raw_events");
    expect(invoiceLine?.calculationSnapshot.usageAggregateId).toBeNull();
  });
});
