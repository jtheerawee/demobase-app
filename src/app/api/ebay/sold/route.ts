import { type NextRequest, NextResponse } from "next/server";

const CARD_API = process.env.EBAY_API_HOST ?? "http://localhost:3002";

export async function GET(request: NextRequest) {
    const authorization = request.headers.get("Authorization") ?? "";
    const searchParams = request.nextUrl.searchParams;

    // Extract keyword from `q`, forward remaining params as-is to card-api
    const q = searchParams.get("q") ?? "";
    const forwardParams = new URLSearchParams(searchParams);
    forwardParams.delete("q");

    const qs = forwardParams.toString() ? `?${forwardParams.toString()}` : "";

    const res = await fetch(
        `${CARD_API}/api/ebay/sold/${encodeURIComponent(q)}${qs}`,
        { headers: { Authorization: authorization } },
    );

    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
}
