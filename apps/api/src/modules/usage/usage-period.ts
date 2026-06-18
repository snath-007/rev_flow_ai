export type UsageAggregationPeriod = {
  periodStart: string;
  periodEnd: string;
};

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getUsageAggregationPeriod(occurredAt: string): UsageAggregationPeriod {
  const occurredAtDate = new Date(occurredAt);

  if (Number.isNaN(occurredAtDate.getTime())) {
    throw new Error("Invalid usage event occurredAt timestamp");
  }

  const year = occurredAtDate.getUTCFullYear();
  const month = occurredAtDate.getUTCMonth();

  return {
    periodStart: formatDate(new Date(Date.UTC(year, month, 1))),
    periodEnd: formatDate(new Date(Date.UTC(year, month + 1, 0)))
  };
}
