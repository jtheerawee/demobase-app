import { type NextRequest, NextResponse } from "next/server";

const CARD_API = process.env.EBAY_API_HOST ?? "http://localhost:3002";

export async function GET(request: NextRequest) {
    const authorization = request.headers.get("Authorization") ?? "";
    const searchParams = request.nextUrl.searchParams.toString();
    const qs = searchParams ? `?${searchParams}` : "";

    try {
        const res = await fetch(
            `${CARD_API}/api/ebay/active${qs}`,
            { headers: { Authorization: authorization } },
        );

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return NextResponse.json(
                { error: errorData.error || "Failed to fetch from card-api" },
                { status: res.status }
            );
        }

        const body = await res.json();
        return NextResponse.json(body);
    } catch (error: any) {
        console.error("Proxy Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error during proxy" },
            { status: 500 }
        );
    }
}
