import { ApiError } from "../../lib/http.js";
import { createAuditLog } from "../audit/audit.service.js";
import * as revrecRepository from "./revrec.repository.js";

export async function listRevenueSchedules() {
  return revrecRepository.listRevenueSchedules();
}

export async function listJournalEntries() {
  return revrecRepository.listJournalEntries();
}

export async function generateRevenueSchedulesForInvoice(invoiceId: string) {
  const result = await revrecRepository.generateRevenueSchedulesForInvoice(invoiceId);

  if (result === "INVOICE_NOT_FOUND") {
    throw new ApiError(404, "INVOICE_NOT_FOUND", "Invoice not found");
  }

  if (result === "INVOICE_NOT_APPROVED") {
    throw new ApiError(409, "INVOICE_NOT_APPROVED", "Revenue schedules can only be generated for approved invoices");
  }

  if (result === "REVENUE_SCHEDULES_ALREADY_EXIST") {
    throw new ApiError(409, "REVENUE_SCHEDULES_ALREADY_EXIST", "Revenue schedules already exist for this invoice");
  }

  if (result === "NO_INVOICE_LINES") {
    throw new ApiError(422, "NO_INVOICE_LINES", "Invoice has no line items to recognize");
  }

  if (result === "INVOICE_LINE_MISSING_CONTRACT_LINE") {
    throw new ApiError(
      422,
      "INVOICE_LINE_MISSING_CONTRACT_LINE",
      "Every invoice line item must reference a contract line item before revenue schedules can be generated"
    );
  }

  await createAuditLog({
    entityType: "invoice",
    entityId: result.invoiceId,
    action: "revenue_schedules.generated",
    afterState: {
      invoiceId: result.invoiceId,
      performanceObligationCount: result.performanceObligations.length,
      scheduleCount: result.schedules.length,
      journalEntryCount: result.journalEntries.length,
      recognizedAmount: result.schedules.reduce((sum, schedule) => sum + schedule.recognizedAmount, 0),
      deferredAmount: result.schedules.reduce((sum, schedule) => sum + schedule.deferredAmount, 0)
    }
  });

  return result;
}