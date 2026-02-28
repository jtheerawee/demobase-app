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

        // Ensure user exists in public.users and user_statuses (fallback for session mismatch after DB reset)
        await supabase.from("users").upsert({
            id: user.id,
            email: user.email,
            avatar_url: user.user_metadata?.avatar_url || null,
            last_login: user.last_sign_in_at,
        });

        await supabase
            .from("user_statuses")
            .insert({ user_id: user.id })
            .select()
            .single()
            .then(({ error: e }) => {
                // Ignore error if already exists
            });

        const { data, error } = await supabase
            .from("ebay_searches")
            .upsert(
                {
                    user_id: user.id,
                    keyword: query,
                    service: service && service !== "---" ? service : "---",
                    grade: psaGrade && service !== "---" ? parseInt(psaGrade, 10) : null,
                    min_price: minPrice ? parseFloat(String(minPrice)) : null,
                    max_price: maxPrice ? parseFloat(String(maxPrice)) : null,
                    listing_type: listingType || "auction",
                    exclude_jp: excludeJp ?? false,
                    only_us: onlyUs ?? false,
                    updated_at: new Date().toISOString(),
                },
                {
                    onConflict: "user_id,keyword,service,grade",
                },
            )
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Save Search Error:", error);
        return NextResponse.json(
            {
                error: error.message || "Failed to save search",
            },
            { status: 500 },
        );
    }
}
