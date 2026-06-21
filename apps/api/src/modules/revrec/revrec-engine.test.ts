import { describe, expect, it } from "vitest";

import { calculateRevenueSchedule } from "./revrec-engine.js";
import type { RecognitionInput } from "./revrec.types.js";

function recognitionInput(overrides: Partial<RecognitionInput> = {}): RecognitionInput {
  return {
    invoiceId: "invoice-1",
    invoiceLineItemId: "invoice-line-1",
    performanceObligationId: "performance-obligation-1",
    recognitionMethod: "straight_line",
    amount: 120,
    currency: "USD",
    serviceStartDate: "2026-01-01",
    serviceEndDate: "2026-03-31",
    ...overrides
  };
}

describe("revenue recognition engine", () => {
  it("recognizes the full amount immediately on the service start date", () => {
    const schedule = calculateRevenueSchedule(
      recognitionInput({
        recognitionMethod: "immediate",
        amount: 99,
        serviceStartDate: "2026-06-01",
        serviceEndDate: "2026-06-30"
      })
    );

    expect(schedule).toEqual([
      {
        invoiceId: "invoice-1",
        invoiceLineItemId: "invoice-line-1",
        performanceObligationId: "performance-obligation-1",
        recognitionMethod: "immediate",
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        recognitionDate: "2026-06-01",
        recognizedAmount: 99,
        deferredAmount: 0,
        currency: "USD",
        calculationSnapshot: {
          source: "revrec-engine",
          strategy: "immediate",
          originalAmount: 99,
          allocationIndex: 1,
          allocationCount: 1
        }
      }
    ]);
  });

  it("rounds immediate recognition to four decimal places", () => {
    const [scheduleLine] = calculateRevenueSchedule(
      recognitionInput({
        recognitionMethod: "immediate",
        amount: 10.123456
      })
    );

    expect(scheduleLine?.recognizedAmount).toBe(10.1235);
    expect(scheduleLine?.deferredAmount).toBe(0);
  });

  it("allows generated schedules before a performance obligation has been persisted", () => {
    const [scheduleLine] = calculateRevenueSchedule(
      recognitionInput({
        recognitionMethod: "immediate",
        performanceObligationId: null
      })
    );

    expect(scheduleLine?.performanceObligationId).toBeNull();
  });

  it("spreads straight-line revenue across monthly service periods", () => {
    const schedule = calculateRevenueSchedule(recognitionInput());

    expect(schedule).toMatchObject([
      {
        periodStart: "2026-01-01",
        periodEnd: "2026-01-31",
        recognitionDate: "2026-01-31",
        recognizedAmount: 40,
        deferredAmount: 80
      },
      {
        periodStart: "2026-02-01",
        periodEnd: "2026-02-28",
        recognitionDate: "2026-02-28",
        recognizedAmount: 40,
        deferredAmount: 40
      },
      {
        periodStart: "2026-03-01",
        periodEnd: "2026-03-31",
        recognitionDate: "2026-03-31",
        recognizedAmount: 40,
        deferredAmount: 0
      }
    ]);
  });

  it("uses calendar months touched by the service period for the ASC 606-lite straight-line simplification", () => {
    const schedule = calculateRevenueSchedule(
      recognitionInput({
        amount: 90,
        serviceStartDate: "2026-01-15",
        serviceEndDate: "2026-03-14"
      })
    );

    expect(schedule).toMatchObject([
      {
        periodStart: "2026-01-15",
        periodEnd: "2026-01-31",
        recognizedAmount: 30,
        deferredAmount: 60
      },
      {
        periodStart: "2026-02-01",
        periodEnd: "2026-02-28",
        recognizedAmount: 30,
        deferredAmount: 30
      },
      {
        periodStart: "2026-03-01",
        periodEnd: "2026-03-14",
        recognizedAmount: 30,
        deferredAmount: 0
      }
    ]);
  });

  it("creates one straight-line period for short service windows inside one month", () => {
    const schedule = calculateRevenueSchedule(
      recognitionInput({
        amount: 15,
        serviceStartDate: "2026-02-10",
        serviceEndDate: "2026-02-12"
      })
    );

    expect(schedule).toMatchObject([
      {
        periodStart: "2026-02-10",
        periodEnd: "2026-02-12",
        recognitionDate: "2026-02-12",
        recognizedAmount: 15,
        deferredAmount: 0
      }
    ]);
  });

  it("creates one straight-line period for a one-day service window", () => {
    const schedule = calculateRevenueSchedule(
      recognitionInput({
        amount: 5,
        serviceStartDate: "2026-02-10",
        serviceEndDate: "2026-02-10"
      })
    );

    expect(schedule).toHaveLength(1);
    expect(schedule[0]).toMatchObject({
      periodStart: "2026-02-10",
      periodEnd: "2026-02-10",
      recognitionDate: "2026-02-10",
      recognizedAmount: 5,
      deferredAmount: 0
    });
  });

  it("lands straight-line rounding residuals in the final period", () => {
    const schedule = calculateRevenueSchedule(
      recognitionInput({
        amount: 100,
        serviceStartDate: "2026-01-15",
        serviceEndDate: "2026-03-14"
      })
    );

    expect(schedule.map((line) => line.recognizedAmount)).toEqual([33.3333, 33.3333, 33.3334]);
    expect(schedule.map((line) => line.deferredAmount)).toEqual([66.6667, 33.3334, 0]);
    expect(schedule.at(-1)?.periodEnd).toBe("2026-03-14");
  });

  it("keeps zero-amount straight-line recognition deterministic", () => {
    const schedule = calculateRevenueSchedule(recognitionInput({ amount: 0 }));

    expect(schedule.map((line) => line.recognizedAmount)).toEqual([0, 0, 0]);
    expect(schedule.map((line) => line.deferredAmount)).toEqual([0, 0, 0]);
  });

  it("rejects invalid service periods", () => {
    expect(() =>
      calculateRevenueSchedule(
        recognitionInput({
          serviceStartDate: "2026-04-01",
          serviceEndDate: "2026-03-31"
        })
      )
    ).toThrow("serviceEndDate must be on or after serviceStartDate");
  });

  it("rejects invalid service dates", () => {
    expect(() =>
      calculateRevenueSchedule(
        recognitionInput({
          serviceStartDate: "not-a-date"
        })
      )
    ).toThrow("Invalid date: not-a-date");
  });

  it("rejects negative recognition amounts", () => {
    expect(() => calculateRevenueSchedule(recognitionInput({ amount: -1 }))).toThrow(
      "recognition amount must be a non-negative number"
    );
  });

  it("keeps usage-based recognition explicit until the MVP behavior is chosen", () => {
    expect(() =>
      calculateRevenueSchedule(
        recognitionInput({
          recognitionMethod: "usage_based"
        })
      )
    ).toThrow("usage-based revenue recognition is not implemented in the Phase 4 skeleton");
  });
});