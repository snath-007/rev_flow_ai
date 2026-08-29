import { NextResponse } from "next/server";

import { createContract } from "@/lib/api-client";

export async function POST(request: Request) {
  const body = await request.json();
  const contract = await createContract(body);

  return NextResponse.json({ contract }, { status: 201 });
}
