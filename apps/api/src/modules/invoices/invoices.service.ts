import type { GenerateInvoiceInput } from "@revflow/shared";

import { ApiError } from "../../lib/http.js";
import { createAuditLog } from "../audit/audit.service.js";
import * as invoicesRepository from "./invoices.repository.js";

export async function listInvoices() {
  return invoicesRepository.listInvoices();
}

export async function getInvoiceById(id: string) {
  return invoicesRepository.getInvoiceById(id);
}

export async function generateInvoice(input: GenerateInvoiceInput) {
  const invoice = await invoicesRepository.generateInvoice(input);

  if (invoice === "CONTRACT_NOT_FOUND") {
    throw new ApiError(404, "CONTRACT_NOT_FOUND", "Contract not found");
  }

  if (invoice === "CONTRACT_NOT_ACTIVE") {
    throw new ApiError(409, "CONTRACT_NOT_ACTIVE", "Invoices can only be generated for active contracts");
  }

  if (invoice === "INVOICE_ALREADY_EXISTS") {
    throw new ApiError(409, "INVOICE_ALREADY_EXISTS", "An invoice already exists for this contract and period");
  }

  if (invoice === "NO_BILLABLE_LINES") {
    throw new ApiError(422, "NO_BILLABLE_LINES", "Contract has no billable line items");
  }

  await createAuditLog({
    entityType: "invoice",
    entityId: invoice.id,
    action: "invoice.generated",
    afterState: invoice
  });

  return invoice;
}

export async function approveInvoice(id: string) {
  const before = await invoicesRepository.getInvoiceById(id);

  if (!before) {
    throw new ApiError(404, "INVOICE_NOT_FOUND", "Invoice not found");
  }

  if (before.status !== "draft") {
    throw new ApiError(409, "INVOICE_NOT_DRAFT", "Only draft invoices can be approved");
  }

  const invoice = await invoicesRepository.approveInvoice(id);

  if (!invoice) {
    throw new ApiError(409, "INVOICE_NOT_DRAFT", "Only draft invoices can be approved");
  }

  await createAuditLog({
    entityType: "invoice",
    entityId: invoice.id,
    action: "invoice.approved",
    beforeState: before,
    afterState: invoice
  });

  return invoice;
}
