import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { APP_CONFIG } from "@/constants/app";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < APP_CONFIG.SEARCH_MIN_CHARS) {
        return NextResponse.json({ success: true, cards: [] });
    }

    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("scraped_cards")
            .select(`
                id, 
                name, 
                image_url, 
                card_url, 
                card_no, 
                rarity,
                collection_id,
                scraped_collections (
                    name,
                    collection_code
                )
            `)
            .ilike("name", `%${query}%`)
            .limit(50);

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
