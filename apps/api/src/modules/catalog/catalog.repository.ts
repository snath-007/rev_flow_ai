import { createSqlClient } from "@revflow/db";
import type {
  CreateMeterInput,
  CreatePlanInput,
  CreatePriceRuleInput,
  CreateProductInput
} from "@revflow/shared";

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "archived";
  created_at: Date;
  updated_at: Date;
};

type MeterRow = {
  id: string;
  product_id: string;
  name: string;
  event_name: string;
  aggregation_type: "sum" | "count";
  unit: string;
  created_at: Date;
  updated_at: Date;
};

type PlanRow = {
  id: string;
  product_id: string;
  name: string;
  billing_interval: "monthly" | "annual";
  status: "active" | "archived";
  created_at: Date;
  updated_at: Date;
};

type PriceRuleRow = {
  id: string;
  plan_id: string;
  meter_id: string | null;
  pricing_model: "flat" | "per_unit" | "tiered";
  unit_price: string;
  currency: string;
  config: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
};

function toProduct(row: ProductRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function toMeter(row: MeterRow) {
  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    eventName: row.event_name,
    aggregationType: row.aggregation_type,
    unit: row.unit,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function toPlan(row: PlanRow) {
  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    billingInterval: row.billing_interval,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function toPriceRule(row: PriceRuleRow) {
  return {
    id: row.id,
    planId: row.plan_id,
    meterId: row.meter_id,
    pricingModel: row.pricing_model,
    unitPrice: Number(row.unit_price),
    currency: row.currency,
    config: row.config,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

export async function listProducts() {
  const sql = createSqlClient();

  try {
    const rows = await sql<ProductRow[]>`
      select id, name, description, status, created_at, updated_at
      from products
      order by created_at desc
    `;

    return rows.map(toProduct);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function getProductById(id: string) {
  const sql = createSqlClient();

  try {
    const rows = await sql<ProductRow[]>`
      select id, name, description, status, created_at, updated_at
      from products
      where id = ${id}
      limit 1
    `;

    return rows[0] ? toProduct(rows[0]) : null;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function createProduct(input: CreateProductInput) {
  const sql = createSqlClient();

  try {
    const rows = await sql<ProductRow[]>`
      insert into products (name, description, status)
      values (${input.name}, ${input.description ?? null}, ${input.status ?? "active"})
      returning id, name, description, status, created_at, updated_at
    `;
    const row = rows[0];

    if (!row) {
      throw new Error("Product insert did not return a row");
    }

    return toProduct(row);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function listMeters() {
  const sql = createSqlClient();

  try {
    const rows = await sql<MeterRow[]>`
      select id, product_id, name, event_name, aggregation_type, unit, created_at, updated_at
      from meters
      order by created_at desc
    `;

    return rows.map(toMeter);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function createMeter(input: CreateMeterInput) {
  const sql = createSqlClient();

  try {
    const rows = await sql<MeterRow[]>`
      insert into meters (product_id, name, event_name, aggregation_type, unit)
      values (${input.productId}, ${input.name}, ${input.eventName}, ${input.aggregationType}, ${input.unit})
      returning id, product_id, name, event_name, aggregation_type, unit, created_at, updated_at
    `;
    const row = rows[0];

    if (!row) {
      throw new Error("Meter insert did not return a row");
    }

    return toMeter(row);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function listPlans() {
  const sql = createSqlClient();

  try {
    const rows = await sql<PlanRow[]>`
      select id, product_id, name, billing_interval, status, created_at, updated_at
      from plans
      order by created_at desc
    `;

    return rows.map(toPlan);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function createPlan(input: CreatePlanInput) {
  const sql = createSqlClient();

  try {
    const rows = await sql<PlanRow[]>`
      insert into plans (product_id, name, billing_interval, status)
      values (${input.productId}, ${input.name}, ${input.billingInterval}, ${input.status ?? "active"})
      returning id, product_id, name, billing_interval, status, created_at, updated_at
    `;
    const row = rows[0];

    if (!row) {
      throw new Error("Plan insert did not return a row");
    }

    return toPlan(row);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function listPriceRules() {
  const sql = createSqlClient();

  try {
    const rows = await sql<PriceRuleRow[]>`
      select id, plan_id, meter_id, pricing_model, unit_price, currency, config, created_at, updated_at
      from price_rules
      order by created_at desc
    `;

    return rows.map(toPriceRule);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function createPriceRule(input: CreatePriceRuleInput) {
  const sql = createSqlClient();

  try {
    const rows = await sql<PriceRuleRow[]>`
      insert into price_rules (plan_id, meter_id, pricing_model, unit_price, currency, config)
      values (
        ${input.planId},
        ${input.meterId ?? null},
        ${input.pricingModel},
        ${input.unitPrice},
        ${input.currency},
        ${sql.json((input.config ?? {}) as never)}
      )
      returning id, plan_id, meter_id, pricing_model, unit_price, currency, config, created_at, updated_at
    `;
    const row = rows[0];

    if (!row) {
      throw new Error("Price rule insert did not return a row");
    }

    return toPriceRule(row);
  } finally {
    await sql.end({ timeout: 5 });
  }
}
