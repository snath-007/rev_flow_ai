import { NextResponse } from "next/server";

import { addContractLineItem } from "@/lib/api-client";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const { id } = await params;
  const lineItem = await addContractLineItem(id, body);

  return NextResponse.json({ lineItem }, { status: 201 });
}
