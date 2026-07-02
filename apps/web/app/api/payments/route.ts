import { NextResponse } from "next/server";

import { receivePayment } from "@/lib/api-client";

export async function POST(request: Request) {
  const body = await request.json();
  const payment = await receivePayment(body);

  return NextResponse.json({ payment }, { status: 201 });
}