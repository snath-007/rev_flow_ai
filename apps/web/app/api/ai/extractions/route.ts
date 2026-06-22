import { NextResponse } from "next/server";

import { createAiExtraction } from "@/lib/api-client";

export async function POST(request: Request) {
  const body = await request.json();
  const extraction = await createAiExtraction(body);

  return NextResponse.json({ extraction }, { status: 201 });
}