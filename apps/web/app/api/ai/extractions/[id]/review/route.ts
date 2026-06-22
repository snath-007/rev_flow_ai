import { NextResponse } from "next/server";

import { reviewAiExtraction } from "@/lib/api-client";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const { id } = await context.params;
  const result = await reviewAiExtraction(id, body);

  return NextResponse.json(result);
}