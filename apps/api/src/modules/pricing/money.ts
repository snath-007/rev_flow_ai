export function toNumber(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

export function calculateMoneyTotal(lines: Array<Pick<{ amount: number }, "amount">>) {
  return roundMoney(lines.reduce((sum, line) => sum + line.amount, 0));
}
