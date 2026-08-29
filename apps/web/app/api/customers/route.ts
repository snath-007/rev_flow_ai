import { NextResponse } from "next/server";

import { createCustomer } from "@/lib/api-client";

export async function POST(request: Request) {
  const body = await request.json();
  const customer = await createCustomer(body);

  return NextResponse.json({ customer }, { status: 201 });
}
