import { createClient } from "@/utils/supabase/server";
import type { ScrapedCard, ScrapedCollection } from "./types";

export async function saveScrapedCollections(
    collections: ScrapedCollection[],
    context: {
        franchise: string;
        language: string;
    }
) {
    if (collections.length === 0) return;

    const supabase = await createClient();
    const dataToInsert = collections.map((col) => ({
        name: col.name,
        collection_code: col.collectionCode,
        image_url: col.imageUrl,
        collection_url: col.collectionUrl,
        franchise: context.franchise,
        language: context.language,
    }));

    const { data, error } = await supabase
        .from("scraped_collections")
        .upsert(dataToInsert, { onConflict: "collection_url" })
        .select();

    if (error) {
        console.error("[Persistence] Error saving collections:", error);
        throw error;
    }

    // Map back to camelCase for frontend consistency
    return data.map((d: any) => ({
        ...d,
        collectionUrl: d.collection_url,
        imageUrl: d.image_url,
        collectionCode: d.collection_code,
    }));
}

export async function saveScrapedCards(cards: ScrapedCard[], collectionId: number | string) {
    if (cards.length === 0) return;

    const supabase = await createClient();
    const dataToInsert = cards.map((card) => ({
        collection_id: collectionId,
        name: card.name,
        image_url: card.imageUrl,
        card_url: card.cardUrl,
        card_no: card.cardNo,
        rarity: card.rarity,
    }));

    const { error } = await supabase.from("scraped_cards").upsert(dataToInsert, { onConflict: "card_url" });

    if (error) {
        console.error("[Persistence] Error saving cards:", { error, dataToInsert });
        throw error;
    }
}
