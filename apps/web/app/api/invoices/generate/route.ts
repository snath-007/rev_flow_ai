import { NextResponse } from "next/server";

import { generateInvoice } from "@/lib/api-client";

export async function POST(request: Request) {
  const body = await request.json();
  const invoice = await generateInvoice(body);

  return NextResponse.json({ invoice }, { status: 201 });
}
