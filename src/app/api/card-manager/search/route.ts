import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { APP_CONFIG } from "@/constants/app";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const franchise = searchParams.get("franchise");
    const language = searchParams.get("language");

    if (!query || query.length < APP_CONFIG.SEARCH_MIN_CHARS) {
        return NextResponse.json({ success: true, cards: [] });
    }

    try {
        const supabase = await createClient();
        const terms = query.trim().split(/\s+/).filter(t => t.length > 0);

        let supabaseQuery = supabase
            .from("scraped_cards")
            .select(`
                id, 
                name, 
                image_url, 
                card_url, 
                card_no, 
                rarity,
                collection_id,
                scraped_collections!inner (
                    name,
                    collection_code,
                    franchise,
                    language
                )
            `);

        if (franchise && franchise !== "all") {
            supabaseQuery = supabaseQuery.eq("scraped_collections.franchise", franchise);
        }
        if (language && language !== "all") {
            supabaseQuery = supabaseQuery.eq("scraped_collections.language", language);
        }

        // Apply AND logic for each term: (name ILIKE %term% OR card_no ILIKE %term%)
        terms.forEach(term => {
            supabaseQuery = supabaseQuery.or(`name.ilike.%${term}%,card_no.ilike.%${term}%`);
        });

        const { data, error } = await supabaseQuery.limit(100);

        if (error) {
            console.error("[API Search] Error fetching cards:", error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        const cards = data.map((card: any) => ({
            id: card.id,
            name: card.name,
            imageUrl: card.image_url,
            cardUrl: card.card_url,
            cardNo: card.card_no,
            rarity: card.rarity,
            collectionName: card.scraped_collections?.name,
            collectionCode: card.scraped_collections?.collection_code,
        }));

        return NextResponse.json({
            success: true,
            cards,
        });
    } catch (err: any) {
        console.error("[API Search] Unexpected error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
