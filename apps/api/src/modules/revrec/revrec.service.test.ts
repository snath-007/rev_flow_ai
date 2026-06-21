import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAuditLog } from "../audit/audit.service.js";
import * as revrecRepository from "./revrec.repository.js";
import { generateRevenueSchedulesForInvoice } from "./revrec.service.js";

vi.mock("./revrec.repository.js", () => ({
  listRevenueSchedules: vi.fn(),
  listJournalEntries: vi.fn(),
  generateRevenueSchedulesForInvoice: vi.fn()
}));

vi.mock("../audit/audit.service.js", () => ({
  createAuditLog: vi.fn()
}));

const mockedRepository = vi.mocked(revrecRepository);
const mockedCreateAuditLog = vi.mocked(createAuditLog);

describe("revenue recognition service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("maps missing invoices to a not found API error", async () => {
    mockedRepository.generateRevenueSchedulesForInvoice.mockResolvedValue("INVOICE_NOT_FOUND");

    await expect(generateRevenueSchedulesForInvoice("invoice-1")).rejects.toMatchObject({
      statusCode: 404,
      code: "INVOICE_NOT_FOUND"
    });
    expect(mockedCreateAuditLog).not.toHaveBeenCalled();
  });

  it("rejects invoices that are not approved", async () => {
    mockedRepository.generateRevenueSchedulesForInvoice.mockResolvedValue("INVOICE_NOT_APPROVED");

    await expect(generateRevenueSchedulesForInvoice("invoice-1")).rejects.toMatchObject({
      statusCode: 409,
      code: "INVOICE_NOT_APPROVED"
    });
    expect(mockedCreateAuditLog).not.toHaveBeenCalled();
  });

  it("rejects duplicate schedule generation", async () => {
    mockedRepository.generateRevenueSchedulesForInvoice.mockResolvedValue("REVENUE_SCHEDULES_ALREADY_EXIST");

    await expect(generateRevenueSchedulesForInvoice("invoice-1")).rejects.toMatchObject({
      statusCode: 409,
      code: "REVENUE_SCHEDULES_ALREADY_EXIST"
    });
    expect(mockedCreateAuditLog).not.toHaveBeenCalled();
  });

  it("writes an audit log after schedules and journal entries are generated", async () => {
    mockedRepository.generateRevenueSchedulesForInvoice.mockResolvedValue({
      invoiceId: "invoice-1",
      performanceObligations: [
        {
          id: "po-1",
          contractLineItemId: "contract-line-1",
          name: "Subscription",
          recognitionMethod: "straight_line",
          serviceStartDate: "2026-01-01",
          serviceEndDate: "2026-01-31",
          allocationAmount: 100,
          currency: "USD",
          config: {},
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z"
        }
      ],
      schedules: [
        {
          id: "schedule-1",
          invoiceId: "invoice-1",
          invoiceLineItemId: "invoice-line-1",
          performanceObligationId: "po-1",
          recognitionMethod: "straight_line",
          status: "generated",
          periodStart: "2026-01-01",
          periodEnd: "2026-01-31",
          recognitionDate: "2026-01-31",
          recognizedAmount: 100,
          deferredAmount: 0,
          currency: "USD",
          calculationSnapshot: {},
          customerName: "Acme Corp",
          invoicePeriodStart: "2026-01-01",
          invoicePeriodEnd: "2026-01-31",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z"
        }
      ],
      journalEntries: [
        {
          id: "journal-entry-1",
          revenueScheduleId: "schedule-1",
          invoiceId: "invoice-1",
          status: "draft",
          entryDate: "2026-01-31",
          debitAccount: "deferred_revenue",
          creditAccount: "revenue",
          amount: 100,
          currency: "USD",
          memo: "Recognize revenue for schedule schedule-1",
          metadata: {},
          customerName: "Acme Corp",
          postedAt: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z"
        }
      ]
    });

    const result = await generateRevenueSchedulesForInvoice("invoice-1");

    expect(result.schedules).toHaveLength(1);
    expect(result.journalEntries).toHaveLength(1);
    expect(mockedCreateAuditLog).toHaveBeenCalledWith({
      entityType: "invoice",
      entityId: "invoice-1",
      action: "revenue_schedules.generated",
      afterState: {
        invoiceId: "invoice-1",
        performanceObligationCount: 1,
        scheduleCount: 1,
        journalEntryCount: 1,
        recognizedAmount: 100,
        deferredAmount: 0
      }
    });
  });
});