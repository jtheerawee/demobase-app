import { type NextRequest, NextResponse } from "next/server";
import { searchEbay } from "@/services/ebayService";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "charizard 050";
    const psa = searchParams.get("psa");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const type = searchParams.get("type"); // AUCTION | FIXED_PRICE
    const offset = searchParams.get("offset");

    try {
        const results = await searchEbay({
            q,
            psaGrade: psa ? parseInt(psa, 10) : undefined,
            minPrice: minPrice ? parseFloat(minPrice) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
            listingType: type as any,
            offset: offset ? parseInt(offset, 10) : undefined,
        });
        return NextResponse.json(results);
    } catch (error: any) {
        console.error("eBay Search API Route Error:", error);
        return NextResponse.json({ error: error.message || "Failed to search eBay" }, { status: 500 });
    }
}
