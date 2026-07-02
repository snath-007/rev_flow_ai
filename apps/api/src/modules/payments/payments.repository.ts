import { createSqlClient } from "@revflow/db";
import type { ReceivePaymentInput } from "@revflow/shared";

import { getRequiredWorkspaceId } from "../../lib/request-context.js";

type DateLike = Date | string;

type PaymentRow = {
  id: string;
  customer_id: string;
  customer_name: string | null;
  invoice_id: string | null;
  invoice_total: string | null;
  amount: string;
  allocated_amount: string | null;
  unapplied_amount: string | null;
  currency: string;
  received_at: DateLike;
  reference: string | null;
  status: "received" | "void";
  allocation_status: "unapplied" | "partial" | "applied" | "overpayment";
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
};

type PaymentAllocationRow = {
  id: string;
  payment_id: string;
  invoice_id: string;
  amount: string;
  currency: string;
  created_at: Date;
};

type InvoicePaymentTargetRow = {
  id: string;
  customer_id: string;
  status: "draft" | "approved" | "issued" | "paid" | "void" | "credited";
  total: string;
  currency: string;
  amount_paid: string;
};

function formatDate(value: DateLike) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function toPaymentAllocation(row: PaymentAllocationRow) {
  return {
    id: row.id,
    paymentId: row.payment_id,
    invoiceId: row.invoice_id,
    amount: Number(row.amount),
    currency: row.currency,
    createdAt: row.created_at.toISOString()
  };
}

function toPayment(row: PaymentRow, allocations?: ReturnType<typeof toPaymentAllocation>[]) {
  const amount = Number(row.amount);
  const allocatedAmount = Number(row.allocated_amount ?? 0);
  const unappliedAmount = Number(row.unapplied_amount ?? Math.max(amount - allocatedAmount, 0));

  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    invoiceId: row.invoice_id,
    invoiceTotal: row.invoice_total === null ? null : Number(row.invoice_total),
    amount,
    allocatedAmount,
    unappliedAmount,
    currency: row.currency,
    receivedAt: formatDate(row.received_at),
    reference: row.reference,
    status: row.status,
    allocationStatus: row.allocation_status,
    metadata: row.metadata,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    ...(allocations ? { allocations } : {})
  };
}

async function getPaymentAllocations(sql: ReturnType<typeof createSqlClient>, workspaceId: string, paymentId: string) {
  const rows = await sql<PaymentAllocationRow[]>`
    select id, payment_id, invoice_id, amount, currency, created_at
    from payment_allocations
    where workspace_id = ${workspaceId}
      and payment_id = ${paymentId}
    order by created_at asc
  `;

  return rows.map(toPaymentAllocation);
}

export async function listPayments() {
  const workspaceId = getRequiredWorkspaceId();
  const sql = createSqlClient();

  try {
    const rows = await sql<PaymentRow[]>`
      select
        p.id,
        p.customer_id,
        c.name as customer_name,
        p.invoice_id,
        i.total as invoice_total,
        p.amount,
        coalesce(allocations.allocated_amount, 0) as allocated_amount,
        greatest(p.amount - coalesce(allocations.allocated_amount, 0), 0) as unapplied_amount,
        p.currency,
        p.received_at,
        p.reference,
        p.status,
        p.allocation_status,
        p.metadata,
        p.created_at,
        p.updated_at
      from payments p
      join customers c on c.workspace_id = p.workspace_id and c.id = p.customer_id
      left join invoices i on i.workspace_id = p.workspace_id and i.id = p.invoice_id
      left join lateral (
        select coalesce(sum(pa.amount), 0) as allocated_amount
        from payment_allocations pa
        where pa.workspace_id = p.workspace_id
          and pa.payment_id = p.id
      ) allocations on true
      where p.workspace_id = ${workspaceId}
      order by p.received_at desc, p.created_at desc
    `;

    return rows.map((row) => toPayment(row));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function receivePayment(input: ReceivePaymentInput) {
  const workspaceId = getRequiredWorkspaceId();
  const sql = createSqlClient();

  try {
    return await sql.begin(async (tx) => {
      const invoiceRows = await tx<InvoicePaymentTargetRow[]>`
        select
          i.id,
          i.customer_id,
          i.status,
          i.total,
          i.currency,
          coalesce(sum(pa.amount), 0) as amount_paid
        from invoices i
        left join payment_allocations pa on pa.workspace_id = i.workspace_id and pa.invoice_id = i.id
        where i.workspace_id = ${workspaceId}
          and i.id = ${input.invoiceId}
        group by i.id, i.customer_id, i.status, i.total, i.currency
        limit 1
      `;
      const invoice = invoiceRows[0];

      if (!invoice) return "INVOICE_NOT_FOUND" as const;
      if (["draft", "void", "credited"].includes(invoice.status)) return "INVOICE_NOT_PAYABLE" as const;
      if (invoice.status === "paid") return "INVOICE_ALREADY_PAID" as const;

      const total = Number(invoice.total);
      const amountPaid = Number(invoice.amount_paid);
      const balanceDue = Math.max(total - amountPaid, 0);
      const allocationAmount = Math.min(input.amount, balanceDue);
      const allocationStatus = allocationAmount <= 0 ? "unapplied" : input.amount > allocationAmount ? "overpayment" : allocationAmount < balanceDue ? "partial" : "applied";

      const paymentRows = await tx<PaymentRow[]>`
        insert into payments (workspace_id, customer_id, invoice_id, amount, currency, received_at, reference, allocation_status, metadata)
        values (
          ${workspaceId},
          ${invoice.customer_id},
          ${invoice.id},
          ${input.amount},
          ${invoice.currency},
          ${input.receivedAt},
          ${input.reference ?? null},
          ${allocationStatus},
          ${tx.json({ deterministicMatch: "single_invoice", invoiceBalanceBefore: balanceDue } as never)}
        )
        returning id, customer_id, null::text as customer_name, invoice_id, null::numeric as invoice_total, amount, 0::numeric as allocated_amount, amount as unapplied_amount, currency, received_at, reference, status, allocation_status, metadata, created_at, updated_at
      `;
      const paymentRow = paymentRows[0];
      if (!paymentRow) throw new Error("Payment insert did not return a row");

      const insertedAllocations: ReturnType<typeof toPaymentAllocation>[] = [];
      if (allocationAmount > 0) {
        const allocationRows = await tx<PaymentAllocationRow[]>`
          insert into payment_allocations (workspace_id, payment_id, invoice_id, amount, currency)
          values (${workspaceId}, ${paymentRow.id}, ${invoice.id}, ${allocationAmount}, ${invoice.currency})
          returning id, payment_id, invoice_id, amount, currency, created_at
        `;
        const allocationRow = allocationRows[0];
        if (!allocationRow) throw new Error("Payment allocation insert did not return a row");
        insertedAllocations.push(toPaymentAllocation(allocationRow));
      }

      const paidAfter = amountPaid + allocationAmount;
      const nextStatus = paidAfter >= total ? "paid" : invoice.status === "approved" ? "issued" : invoice.status;
      await tx`
        update invoices
        set status = ${nextStatus}, updated_at = now()
        where workspace_id = ${workspaceId}
          and id = ${invoice.id}
      `;

      return toPayment(
        {
          ...paymentRow,
          invoice_total: invoice.total,
          allocated_amount: String(allocationAmount),
          unapplied_amount: String(Math.max(input.amount - allocationAmount, 0))
        },
        insertedAllocations
      );
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}