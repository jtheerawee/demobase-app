import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { query, service, psaGrade, minPrice, maxPrice, listingType, excludeJp, onlyUs } = body;

        if (!query) {
            return NextResponse.json({ error: "Query is required" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("ebay_searches")
            .insert({
                user_id: user.id,
                keyword: query,
                service: service && service !== "---" ? service : "---",
                grade: psaGrade && service !== "---" ? parseInt(psaGrade, 10) : null,
                min_price: minPrice ? parseFloat(String(minPrice)) : null,
                max_price: maxPrice ? parseFloat(String(maxPrice)) : null,
                listing_type: listingType || "auction",
                exclude_jp: excludeJp ?? false,
                only_us: onlyUs ?? false,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Save Search Error:", error);
        return NextResponse.json({ error: error.message || "Failed to save search" }, { status: 500 });
    }
}
