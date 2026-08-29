import { NextResponse } from "next/server";

import { onboardWorkspace } from "@/lib/api-client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const context = await onboardWorkspace(body);
    return NextResponse.json(context, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Workspace onboarding failed" },
      { status: 400 }
    );
  }
}
