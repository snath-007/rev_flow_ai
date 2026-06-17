import { NextResponse } from "next/server";

import { approveInvoice } from "@/lib/api-client";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await approveInvoice(id);

  return NextResponse.json({ invoice }, { status: 200 });
}
