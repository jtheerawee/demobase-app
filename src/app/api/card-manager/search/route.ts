import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { APP_CONFIG } from "@/constants/app";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const scanIds = searchParams.get("scan_ids"); // New param for direct OCR results
    const franchise = searchParams.get("franchise");
    const language = searchParams.get("language");

    if ((!query || query.length < APP_CONFIG.SEARCH_MIN_CHARS) && !scanIds) {
        return NextResponse.json({ success: true, cards: [] });
    }

    try {
        const supabase = await createClient();
        let supabaseQuery = supabase.from("scraped_cards").select(`
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
            supabaseQuery = supabaseQuery.eq(
                "scraped_collections.franchise",
                franchise,
            );
        }
        if (language && language !== "all") {
            supabaseQuery = supabaseQuery.eq(
                "scraped_collections.language",
                language,
            );
        }

        if (scanIds) {
            // Handle direct match from OCR: "SET:NO" format
            const idPairs = scanIds
                .split(",")
                .filter((id) => id.length > 0)
                .map((id) => {
                    const [set, no] = id.split(":");
                    return { set: set.toLowerCase(), no };
                });
            console.log("[API Search] Target Pairs:", idPairs);

            const cardNumbers = idPairs.map((p) => p.no);
            supabaseQuery = supabaseQuery.in("card_no", cardNumbers);

            const { data, error } = await supabaseQuery.limit(100);
            if (error) {
                console.error("[API Search] Supabase Error:", error);
                return NextResponse.json(
                    { success: false, error: error.message },
                    { status: 500 },
                );
            }

            // Filter results to ensure both Set and No match
            const filteredCards = (data || []).filter((card: any) => {
                const cardSet =
                    card.scraped_collections?.collection_code?.toLowerCase();
                const cardNo = card.card_no;
                return idPairs.some(
                    (p) => p.set === cardSet && p.no === cardNo,
                );
            });

            console.log(
                `[API Search] Scan result: ${filteredCards.length} matches found after set verification.`,
            );

            const cards = filteredCards.map((card: any) => ({
                id: card.id,
                name: card.name,
                imageUrl: card.image_url,
                cardUrl: card.card_url,
                cardNo: card.card_no,
                rarity: card.rarity,
                collectionName: card.scraped_collections?.name,
                collectionCode: card.scraped_collections?.collection_code,
                franchise: card.scraped_collections?.franchise,
            }));

            return NextResponse.json({ success: true, cards });
        } else if (query) {
            // Normal text search logic
            const terms = query
                .toLowerCase()
                .trim()
                .split(/\s+/)
                .filter((t) => t.length > 0);
            terms.forEach((term) => {
                supabaseQuery = supabaseQuery.or(
                    `name.ilike.%${term}%,card_no.ilike.%${term}%`,
                );
            });
        }

        const { data, error } = await supabaseQuery.limit(100);

        if (error) {
            console.error("[API Search] Error fetching cards:", error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 },
            );
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
            franchise: card.scraped_collections?.franchise,
        }));

        return NextResponse.json({
            success: true,
            cards,
        });
    } catch (err: any) {
        console.error("[API Search] Unexpected error:", err);
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 },
        );
    }
}
