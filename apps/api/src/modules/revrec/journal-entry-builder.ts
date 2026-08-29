import { roundRevenueAmount } from "./money.js";

export type JournalEntryInput = {
  revenueScheduleId: string;
  invoiceId: string;
  entryDate: string;
  amount: number;
  currency: string;
  memo?: string | null;
  metadata?: Record<string, unknown>;
};

export type CalculatedJournalEntry = {
  revenueScheduleId: string;
  invoiceId: string;
  status: "draft";
  entryDate: string;
  debitAccount: "deferred_revenue";
  creditAccount: "revenue";
  amount: number;
  currency: string;
  memo: string;
  metadata: Record<string, unknown>;
};

export function calculateJournalEntry(input: JournalEntryInput): CalculatedJournalEntry {
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    throw new Error("journal entry amount must be a non-negative number");
  }

  return {
    revenueScheduleId: input.revenueScheduleId,
    invoiceId: input.invoiceId,
    status: "draft",
    entryDate: input.entryDate,
    debitAccount: "deferred_revenue",
    creditAccount: "revenue",
    amount: roundRevenueAmount(input.amount),
    currency: input.currency,
    memo: input.memo ?? "Recognize deferred revenue",
    metadata: {
      source: "revrec-journal-entry-builder",
      balanced: true,
      ...input.metadata
    }
  };
}