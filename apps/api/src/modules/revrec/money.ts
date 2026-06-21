export function roundRevenueAmount(value: number) {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

export function allocateRevenueEvenly(amount: number, periods: number) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("recognition amount must be a non-negative number");
  }

  if (!Number.isInteger(periods) || periods <= 0) {
    throw new Error("allocation periods must be a positive integer");
  }

  const baseAmount = roundRevenueAmount(amount / periods);
  const allocations = Array.from({ length: periods }, () => baseAmount);
  const allocatedBeforeFinal = roundRevenueAmount(baseAmount * (periods - 1));
  allocations[periods - 1] = roundRevenueAmount(amount - allocatedBeforeFinal);

  return allocations;
}