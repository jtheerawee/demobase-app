import { type NextRequest, NextResponse } from "next/server";

const CARD_API = process.env.EBAY_API_HOST ?? "http://localhost:3002";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params;
  const authorization = request.headers.get("Authorization") ?? "";

  const res = await fetch(`${CARD_API}/api/ebay/${encodeURIComponent(itemId)}`, {
    headers: { Authorization: authorization },
  });

  const body = await res.json();
  return NextResponse.json(body, { status: res.status });
}
