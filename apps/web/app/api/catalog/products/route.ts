import { NextResponse } from "next/server";

import { createProduct } from "@/lib/api-client";

export async function POST(request: Request) {
  const body = await request.json();
  const product = await createProduct(body);

  return NextResponse.json({ product }, { status: 201 });
}
