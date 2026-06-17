import { createSqlClient } from "@revflow/db";
import type { CreateCustomerInput } from "@revflow/shared";

type CustomerRow = {
  id: string;
  name: string;
  email: string;
  billing_address: string | null;
  created_at: Date;
  updated_at: Date;
};

function toCustomer(row: CustomerRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    billingAddress: row.billing_address,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

export async function listCustomers() {
  const sql = createSqlClient();

  try {
    const rows = await sql<CustomerRow[]>`
      select id, name, email, billing_address, created_at, updated_at
      from customers
      order by created_at desc
    `;

    return rows.map(toCustomer);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function getCustomerById(id: string) {
  const sql = createSqlClient();

  try {
    const rows = await sql<CustomerRow[]>`
      select id, name, email, billing_address, created_at, updated_at
      from customers
      where id = ${id}
      limit 1
    `;

    return rows[0] ? toCustomer(rows[0]) : null;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function createCustomer(input: CreateCustomerInput) {
  const sql = createSqlClient();

  try {
    const rows = await sql<CustomerRow[]>`
      insert into customers (name, email, billing_address)
      values (${input.name}, ${input.email}, ${input.billingAddress ?? null})
      returning id, name, email, billing_address, created_at, updated_at
    `;
    const row = rows[0];

    if (!row) {
      throw new Error("Customer insert did not return a row");
    }

    return toCustomer(row);
  } finally {
    await sql.end({ timeout: 5 });
  }
}
