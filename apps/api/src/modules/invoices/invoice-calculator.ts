import { calculateMoneyTotal, calculatePrice, toNumber } from "../pricing/index.js";

export type BillableInvoiceLineInput = {
  contract_line_item_id: string;
  price_rule_id: string;
  description: string;
  pricing_model: "flat" | "per_unit" | "tiered";
  unit_price: string;
  currency: string;
  config?: Record<string, unknown> | null;
  meter_id: string | null;
  meter_name: string | null;
  aggregation_type: "sum" | "count" | null;
  unit: string | null;
  usage_source?: "aggregate" | "raw_events" | "none";
  usage_aggregate_id?: string | null;
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
    usageSource: "aggregate" | "raw_events" | "none";
    usageAggregateId: string | null;
    eventCount: number;
    totalQuantity: number;
    unit: string | null;
    pricing: ReturnType<typeof calculatePrice>["snapshot"];
  };
};

export type InvoiceCalculationPeriod = {
  periodStart: string;
  periodEnd: string;
};

const defaultPeriod: InvoiceCalculationPeriod = {
  periodStart: "unknown",
  periodEnd: "unknown"
};

export function calculateInvoiceLineItems(
  lines: BillableInvoiceLineInput[],
  period: InvoiceCalculationPeriod = defaultPeriod
): CalculatedInvoiceLine[] {
  return lines.map((line) => {
    const eventCount = toNumber(line.event_count);
    const totalQuantity = toNumber(line.total_quantity);
    const usageSource = line.usage_source ?? (line.meter_id ? "raw_events" : "none");
    const pricingResult = calculatePrice({
      pricingModel: line.pricing_model,
      config: line.config ?? {},
      usage: {
        billableQuantity: line.pricing_model === "flat" ? 1 : toNumber(line.billable_quantity),
        eventCount,
        totalQuantity,
        aggregationType: line.aggregation_type,
        unit: line.unit,
        meterId: line.meter_id,
        meterName: line.meter_name
      },
      period: {
        start: period.periodStart,
        end: period.periodEnd
      },
      context: {
        priceRuleId: line.price_rule_id,
        contractLineItemId: line.contract_line_item_id,
        currency: line.currency,
        unitPrice: toNumber(line.unit_price)
      }
    });

    return {
      contractLineItemId: line.contract_line_item_id,
      priceRuleId: line.price_rule_id,
      description: line.description,
      quantity: pricingResult.quantity,
      unitPrice: pricingResult.unitPrice,
      amount: pricingResult.amount,
      currency: pricingResult.currency,
      calculationSnapshot: {
        pricingModel: line.pricing_model,
        meterId: line.meter_id,
        meterName: line.meter_name,
        aggregationType: line.aggregation_type,
        usageSource,
        usageAggregateId: line.usage_aggregate_id ?? null,
        eventCount,
        totalQuantity,
        unit: line.unit,
        pricing: pricingResult.snapshot
      }
    };
  });
}

export function calculateInvoiceTotal(lines: Pick<CalculatedInvoiceLine, "amount">[]) {
  return calculateMoneyTotal(lines);
}
