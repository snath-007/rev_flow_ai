import { describe, expect, it } from "vitest";

import { getUsageAggregationPeriod } from "./usage-period.js";

describe("usage aggregation period", () => {
  it("derives calendar month boundaries in UTC", () => {
    expect(getUsageAggregationPeriod("2026-06-18T14:30:00.000Z")).toEqual({
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30"
    });
  });

  it("handles leap years", () => {
    expect(getUsageAggregationPeriod("2028-02-10T00:00:00.000Z")).toEqual({
      periodStart: "2028-02-01",
      periodEnd: "2028-02-29"
    });
  });

  it("uses UTC rather than local timezone boundaries", () => {
    expect(getUsageAggregationPeriod("2026-07-01T00:30:00.000+05:30")).toEqual({
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30"
    });
  });
});
