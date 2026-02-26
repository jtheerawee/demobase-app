import { type NextRequest, NextResponse } from "next/server";
import { EBAY_CONFIG } from "@/constants/ebay";

const CARD_API = EBAY_CONFIG.API_HOST;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ itemId: string }> },
) {
    const { itemId } = await params;
    const authorization = request.headers.get("Authorization") ?? "";

    const res = await fetch(
        `${CARD_API}/api/ebay/${encodeURIComponent(itemId)}`,
        {
            headers: { Authorization: authorization },
        },
    );

    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
}
