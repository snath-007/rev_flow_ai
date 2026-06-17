import { NextResponse } from "next/server";

import { createPlan } from "@/lib/api-client";

export async function POST(request: Request) {
  const body = await request.json();
  const plan = await createPlan(body);

  return NextResponse.json({ plan }, { status: 201 });
}
