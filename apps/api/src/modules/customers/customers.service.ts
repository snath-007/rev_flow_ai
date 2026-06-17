import type { CreateCustomerInput } from "@revflow/shared";

import { createAuditLog } from "../audit/audit.service.js";
import * as customersRepository from "./customers.repository.js";

export async function listCustomers() {
  return customersRepository.listCustomers();
}

export async function getCustomerById(id: string) {
  return customersRepository.getCustomerById(id);
}

export async function createCustomer(input: CreateCustomerInput) {
  const customer = await customersRepository.createCustomer(input);

  await createAuditLog({
    entityType: "customer",
    entityId: customer.id,
    action: "customer.created",
    afterState: customer
  });

  return customer;
}
