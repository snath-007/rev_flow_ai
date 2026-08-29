import { NextResponse } from "next/server";

import { createPriceRule } from "@/lib/api-client";

export async function POST(request: Request) {
  const body = await request.json();
  const priceRule = await createPriceRule(body);

  return NextResponse.json({ priceRule }, { status: 201 });
}
