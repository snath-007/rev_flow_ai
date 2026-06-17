import { NextResponse } from "next/server";

import { createMeter } from "@/lib/api-client";

export async function POST(request: Request) {
  const body = await request.json();
  const meter = await createMeter(body);

  return NextResponse.json({ meter }, { status: 201 });
}
