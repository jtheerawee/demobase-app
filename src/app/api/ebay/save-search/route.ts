import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
    const supabase = await createClient();

    // Check if user is authenticated
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { query, psaGrade, minPrice, maxPrice, listingType } = body;

        if (!query) {
            return NextResponse.json({ error: "Query is required" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("ebay_searches")
            .insert({
                user_id: user.id,
                query,
                psa_grade: psaGrade ? parseInt(psaGrade, 10) : null,
                min_price: minPrice ? parseFloat(minPrice) : null,
                max_price: maxPrice ? parseFloat(maxPrice) : null,
                listing_type: listingType || "AUCTION",
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
