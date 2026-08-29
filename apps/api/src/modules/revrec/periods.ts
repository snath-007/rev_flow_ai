import type { RecognitionPeriod } from "./revrec.types.js";

function parseDateOnly(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return date;
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function monthEnd(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function addMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

export function buildMonthlyRecognitionPeriods(serviceStartDate: string, serviceEndDate: string): RecognitionPeriod[] {
  const start = parseDateOnly(serviceStartDate);
  const end = parseDateOnly(serviceEndDate);

  if (end < start) {
    throw new Error("serviceEndDate must be on or after serviceStartDate");
  }

  const periods: RecognitionPeriod[] = [];
  let cursor = monthStart(start);

  while (cursor <= end) {
    const currentMonthEnd = monthEnd(cursor);
    const periodStart = cursor < start ? start : cursor;
    const periodEnd = currentMonthEnd > end ? end : currentMonthEnd;

    periods.push({
      periodStart: formatDateOnly(periodStart),
      periodEnd: formatDateOnly(periodEnd),
      recognitionDate: formatDateOnly(periodEnd)
    });

    cursor = addMonths(cursor, 1);
  }

  return periods;
}