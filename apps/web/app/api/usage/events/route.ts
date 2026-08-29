import { NextResponse } from "next/server";

import { ingestUsageEvent } from "@/lib/api-client";

export async function POST(request: Request) {
  const body = await request.json();
  const event = await ingestUsageEvent(body);

  return NextResponse.json({ event }, { status: 201 });
}
