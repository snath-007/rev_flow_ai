import { NextResponse } from "next/server";

import { approveContract } from "@/lib/api-client";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contract = await approveContract(id);

  return NextResponse.json({ contract }, { status: 200 });
}
