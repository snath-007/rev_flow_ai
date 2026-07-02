import type { ReceivePaymentInput } from "@revflow/shared";

import { ApiError } from "../../lib/http.js";
import { createAuditLog } from "../audit/audit.service.js";
import * as paymentsRepository from "./payments.repository.js";

export async function listPayments() {
  return paymentsRepository.listPayments();
}

export async function receivePayment(input: ReceivePaymentInput) {
  const payment = await paymentsRepository.receivePayment(input);

  if (payment === "INVOICE_NOT_FOUND") {
    throw new ApiError(404, "INVOICE_NOT_FOUND", "Invoice not found");
  }

  if (payment === "INVOICE_NOT_PAYABLE") {
    throw new ApiError(409, "INVOICE_NOT_PAYABLE", "Payments can only be recorded for approved or issued invoices");
  }

  if (payment === "INVOICE_ALREADY_PAID") {
    throw new ApiError(409, "INVOICE_ALREADY_PAID", "This invoice is already paid");
  }

  await createAuditLog({
    entityType: "payment",
    entityId: payment.id,
    action: "payment.received",
    afterState: payment
  });

  return payment;
}