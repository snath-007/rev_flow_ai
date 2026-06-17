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
  it("calculates per-unit usage lines from billable quantity", () => {
    const [invoiceLine] = calculateInvoiceLineItems([line({ billable_quantity: "7", unit_price: "0.0100" })]);

    expect(invoiceLine?.quantity).toBe(7);
    expect(invoiceLine?.unitPrice).toBe(0.01);
    expect(invoiceLine?.amount).toBe(0.07);
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
  });

  it("rounds invoice totals to four decimal places", () => {
    expect(calculateInvoiceTotal([{ amount: 0.10555 }, { amount: 0.10444 }])).toBe(0.21);
  });
});
