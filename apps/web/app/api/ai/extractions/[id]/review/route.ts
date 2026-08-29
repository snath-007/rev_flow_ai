import { NextResponse } from "next/server";

import { ApiClientError, reviewAiExtraction } from "@/lib/api-client";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const body = await request.json();
    const { id } = await context.params;
    const result = await reviewAiExtraction(id, body);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json(
        { code: error.code, message: error.message, details: error.details },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { message: "Could not review extraction" },
      { status: 500 },
    );
  }
}
