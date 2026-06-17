export type BillableInvoiceLineInput = {
  contract_line_item_id: string;
  price_rule_id: string;
  description: string;
  pricing_model: "flat" | "per_unit" | "tiered";
  unit_price: string;
  currency: string;
  meter_id: string | null;
  meter_name: string | null;
  aggregation_type: "sum" | "count" | null;
  unit: string | null;
  event_count: string | number;
  total_quantity: string | null;
  billable_quantity: string | null;
};

export type CalculatedInvoiceLine = {
  contractLineItemId: string;
  priceRuleId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  currency: string;
  calculationSnapshot: {
    pricingModel: "flat" | "per_unit" | "tiered";
    meterId: string | null;
    meterName: string | null;
    aggregationType: "sum" | "count" | null;
    eventCount: number;
    totalQuantity: number;
    unit: string | null;
  };
};

function toNumber(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

export function calculateInvoiceLineItems(lines: BillableInvoiceLineInput[]): CalculatedInvoiceLine[] {
  return lines.map((line) => {
    const quantity = line.pricing_model === "flat" ? 1 : toNumber(line.billable_quantity);
    const unitPrice = toNumber(line.unit_price);
    const amount = roundMoney(quantity * unitPrice);

    return {
      contractLineItemId: line.contract_line_item_id,
      priceRuleId: line.price_rule_id,
      description: line.description,
      quantity,
      unitPrice,
      amount,
      currency: line.currency,
      calculationSnapshot: {
        pricingModel: line.pricing_model,
        meterId: line.meter_id,
        meterName: line.meter_name,
        aggregationType: line.aggregation_type,
        eventCount: toNumber(line.event_count),
        totalQuantity: toNumber(line.total_quantity),
        unit: line.unit
      }
    };
  });
}

export function calculateInvoiceTotal(lines: Pick<CalculatedInvoiceLine, "amount">[]) {
  return roundMoney(lines.reduce((sum, line) => sum + line.amount, 0));
}
