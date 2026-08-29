import { NextResponse } from "next/server";

import { ApiClientError, applyAiExtraction } from "@/lib/api-client";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const result = await applyAiExtraction(id);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json(
        { code: error.code, message: error.message, details: error.details },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { message: "Could not apply extraction" },
      { status: 500 },
    );
  }
}
