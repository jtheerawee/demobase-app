import { type NextRequest, NextResponse } from "next/server";
import { EBAY_ASSISTANCE_CONFIG } from "@/constants/ebay_assistance";

const CARD_API = EBAY_ASSISTANCE_CONFIG.API_HOST;

export async function GET(request: NextRequest) {
    const authorization = request.headers.get("Authorization") ?? "";
    const sp = request.nextUrl.searchParams;

    // Translate demobase params → card-api params
    const forward = new URLSearchParams();

    const q = sp.get("q") ?? "";
    if (q) forward.set("keyword", q);

    if (sp.has("grade")) forward.set("grade", sp.get("grade")!);
    if (sp.has("service")) forward.set("service", sp.get("service")!);
    if (sp.has("page")) forward.set("page", sp.get("page")!);
    if (sp.has("minPrice")) forward.set("minPrice", sp.get("minPrice")!);
    if (sp.has("maxPrice")) forward.set("maxPrice", sp.get("maxPrice")!);

    // camelCase → snake_case for exclude/us flags
    if (sp.get("excludeJp") === "true" || sp.get("exclude_jp") === "true") forward.set("exclude_jp", "true");
    if (sp.get("onlyUs") === "true" || sp.get("only_us") === "true") forward.set("only_us", "true");

    const res = await fetch(`${CARD_API}/api/ebay/sold?${forward.toString()}`, {
        headers: { Authorization: authorization },
    });

    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
}
