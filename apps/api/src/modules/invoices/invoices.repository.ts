import { createSqlClient } from "@revflow/db";
import type { GenerateInvoiceInput } from "@revflow/shared";
import { calculateInvoiceLineItems, calculateInvoiceTotal } from "./invoice-calculator.js";

type DateLike = Date | string;

type InvoiceRow = {
  id: string;
  customer_id: string;
  contract_id: string;
  customer_name: string | null;
  status: "draft" | "approved" | "issued" | "paid" | "void" | "credited";
  period_start: DateLike;
  period_end: DateLike;
  currency: string;
  subtotal: string;
  total: string;
  calculation_snapshot: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
};

type InvoiceLineItemRow = {
  id: string;
  invoice_id: string;
  contract_line_item_id: string | null;
  price_rule_id: string;
  description: string;
  quantity: string;
  unit_price: string;
  amount: string;
  currency: string;
  calculation_snapshot: Record<string, unknown>;
  created_at: Date;
};

type ContractRow = {
  id: string;
  customer_id: string;
  status: "draft" | "active";
};

type BillableLineRow = {
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

function formatDate(value: DateLike) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function toInvoice(row: InvoiceRow, lineItems?: ReturnType<typeof toInvoiceLineItem>[]) {
  return {
    id: row.id,
    customerId: row.customer_id,
    contractId: row.contract_id,
    customerName: row.customer_name,
    status: row.status,
    periodStart: formatDate(row.period_start),
    periodEnd: formatDate(row.period_end),
    currency: row.currency,
    subtotal: Number(row.subtotal),
    total: Number(row.total),
    calculationSnapshot: row.calculation_snapshot,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    ...(lineItems ? { lineItems } : {})
  };
}

function toInvoiceLineItem(row: InvoiceLineItemRow) {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    contractLineItemId: row.contract_line_item_id,
    priceRuleId: row.price_rule_id,
    description: row.description,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    amount: Number(row.amount),
    currency: row.currency,
    calculationSnapshot: row.calculation_snapshot,
    createdAt: row.created_at.toISOString()
  };
}

async function getInvoiceLineItems(sql: ReturnType<typeof createSqlClient>, invoiceId: string) {
  const rows = await sql<InvoiceLineItemRow[]>`
    select id, invoice_id, contract_line_item_id, price_rule_id, description, quantity, unit_price, amount, currency, calculation_snapshot, created_at
    from invoice_line_items
    where invoice_id = ${invoiceId}
    order by created_at asc
  `;

  return rows.map(toInvoiceLineItem);
}

export async function listInvoices() {
  const sql = createSqlClient();

  try {
    const rows = await sql<InvoiceRow[]>`
      select
        i.id,
        i.customer_id,
        i.contract_id,
        c.name as customer_name,
        i.status,
        i.period_start,
        i.period_end,
        i.currency,
        i.subtotal,
        i.total,
        i.calculation_snapshot,
        i.created_at,
        i.updated_at
      from invoices i
      join customers c on c.id = i.customer_id
      order by i.created_at desc
    `;

    return rows.map((row) => toInvoice(row));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function getInvoiceById(id: string) {
  const sql = createSqlClient();

  try {
    const rows = await sql<InvoiceRow[]>`
      select
        i.id,
        i.customer_id,
        i.contract_id,
        c.name as customer_name,
        i.status,
        i.period_start,
        i.period_end,
        i.currency,
        i.subtotal,
        i.total,
        i.calculation_snapshot,
        i.created_at,
        i.updated_at
      from invoices i
      join customers c on c.id = i.customer_id
      where i.id = ${id}
      limit 1
    `;
    const row = rows[0];

    if (!row) {
      return null;
    }

    const lineItems = await getInvoiceLineItems(sql, id);
    return toInvoice(row, lineItems);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function generateInvoice(input: GenerateInvoiceInput) {
  const sql = createSqlClient();

  try {
    return await sql.begin(async (tx) => {
      const contractRows = await tx<ContractRow[]>`
        select id, customer_id, status
        from contracts
        where id = ${input.contractId}
        limit 1
      `;
      const contract = contractRows[0];

      if (!contract) {
        return "CONTRACT_NOT_FOUND" as const;
      }

      if (contract.status !== "active") {
        return "CONTRACT_NOT_ACTIVE" as const;
      }

      const existingInvoiceRows = await tx<{ id: string }[]>`
        select id
        from invoices
        where contract_id = ${input.contractId}
          and period_start = ${input.periodStart}
          and period_end = ${input.periodEnd}
          and status in ('draft', 'approved', 'issued', 'paid')
        limit 1
      `;

      if (existingInvoiceRows[0]) {
        return "INVOICE_ALREADY_EXISTS" as const;
      }

      const billableRows = await tx<BillableLineRow[]>`
        select
          cli.id as contract_line_item_id,
          pr.id as price_rule_id,
          cli.name as description,
          pr.pricing_model,
          pr.unit_price,
          pr.currency,
          pr.meter_id,
          m.name as meter_name,
          m.aggregation_type,
          m.unit,
          count(ue.id) as event_count,
          coalesce(sum(ue.quantity), 0) as total_quantity,
          case
            when pr.meter_id is null then 1
            when m.aggregation_type = 'count' then count(ue.id)::numeric
            else coalesce(sum(ue.quantity), 0)
          end as billable_quantity
        from contract_versions cv
        join contract_line_items cli on cli.contract_version_id = cv.id
        join price_rules pr on pr.id = cli.price_rule_id
        left join meters m on m.id = pr.meter_id
        left join usage_events ue on ue.contract_id = cv.contract_id
          and ue.meter_id = pr.meter_id
          and ue.occurred_at >= ${input.periodStart}
          and ue.occurred_at < (${input.periodEnd}::date + interval '1 day')
        where cv.contract_id = ${input.contractId}
          and cv.version_number = (
            select max(version_number)
            from contract_versions
            where contract_id = ${input.contractId}
          )
        group by cli.id, pr.id, cli.name, pr.pricing_model, pr.unit_price, pr.currency, pr.meter_id, m.name, m.aggregation_type, m.unit
        order by cli.created_at asc
      `;

      if (billableRows.length === 0) {
        return "NO_BILLABLE_LINES" as const;
      }

      const lineItems = calculateInvoiceLineItems(billableRows);
      const subtotal = calculateInvoiceTotal(lineItems);
      const currency = lineItems[0]?.currency ?? "USD";

      const invoiceRows = await tx<InvoiceRow[]>`
        insert into invoices (customer_id, contract_id, status, period_start, period_end, currency, subtotal, total, calculation_snapshot)
        values (
          ${contract.customer_id},
          ${contract.id},
          'draft',
          ${input.periodStart},
          ${input.periodEnd},
          ${currency},
          ${subtotal},
          ${subtotal},
          ${tx.json({ generatedFrom: "usage_events", lineCount: lineItems.length } as never)}
        )
        returning id, customer_id, contract_id, null::text as customer_name, status, period_start, period_end, currency, subtotal, total, calculation_snapshot, created_at, updated_at
      `;
      const invoice = invoiceRows[0];

      if (!invoice) {
        throw new Error("Invoice insert did not return a row");
      }

      const insertedLineItems: ReturnType<typeof toInvoiceLineItem>[] = [];

      for (const line of lineItems) {
        const rows = await tx<InvoiceLineItemRow[]>`
          insert into invoice_line_items (invoice_id, contract_line_item_id, price_rule_id, description, quantity, unit_price, amount, currency, calculation_snapshot)
          values (
            ${invoice.id},
            ${line.contractLineItemId},
            ${line.priceRuleId},
            ${line.description},
            ${line.quantity},
            ${line.unitPrice},
            ${line.amount},
            ${line.currency},
            ${tx.json(line.calculationSnapshot as never)}
          )
          returning id, invoice_id, contract_line_item_id, price_rule_id, description, quantity, unit_price, amount, currency, calculation_snapshot, created_at
        `;
        const row = rows[0];

        if (!row) {
          throw new Error("Invoice line item insert did not return a row");
        }

        insertedLineItems.push(toInvoiceLineItem(row));
      }

      return toInvoice(invoice, insertedLineItems);
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function approveInvoice(id: string) {
  const sql = createSqlClient();

  try {
    const rows = await sql<InvoiceRow[]>`
      update invoices
      set status = 'approved', updated_at = now()
      where id = ${id}
        and status = 'draft'
      returning id, customer_id, contract_id, null::text as customer_name, status, period_start, period_end, currency, subtotal, total, calculation_snapshot, created_at, updated_at
    `;

    return rows[0] ? toInvoice(rows[0]) : null;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

