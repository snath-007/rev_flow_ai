import { NextResponse } from "next/server";

import { generateRevenueSchedules } from "@/lib/api-client";

export async function POST(request: Request) {
  const body = await request.json();
  const result = await generateRevenueSchedules(String(body.invoiceId ?? ""));

  return NextResponse.json(result, { status: 201 });
}