import { describe, expect, it } from "vitest";

import { calculateJournalEntry } from "./journal-entry-builder.js";

describe("journal entry builder", () => {
  it("creates a balanced deferred revenue to revenue journal entry", () => {
    const entry = calculateJournalEntry({
      revenueScheduleId: "schedule-1",
      invoiceId: "invoice-1",
      entryDate: "2026-01-31",
      amount: 33.33334,
      currency: "USD"
    });

    expect(entry).toEqual({
      revenueScheduleId: "schedule-1",
      invoiceId: "invoice-1",
      status: "draft",
      entryDate: "2026-01-31",
      debitAccount: "deferred_revenue",
      creditAccount: "revenue",
      amount: 33.3333,
      currency: "USD",
      memo: "Recognize deferred revenue",
      metadata: {
        source: "revrec-journal-entry-builder",
        balanced: true
      }
    });
  });

  it("rejects negative journal entry amounts", () => {
    expect(() =>
      calculateJournalEntry({
        revenueScheduleId: "schedule-1",
        invoiceId: "invoice-1",
        entryDate: "2026-01-31",
        amount: -1,
        currency: "USD"
      })
    ).toThrow("journal entry amount must be a non-negative number");
  });
});