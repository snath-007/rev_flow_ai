import { NextResponse } from "next/server";

import { applyAiExtraction } from "@/lib/api-client";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = await applyAiExtraction(id);

  return NextResponse.json(result, { status: 201 });
}