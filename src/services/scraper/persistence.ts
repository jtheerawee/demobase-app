import { createClient } from "@/utils/supabase/server";
import type { ScrapedCard, ScrapedCollection } from "./types";

export async function saveScrapedCollections(
    collections: ScrapedCollection[],
    context: {
        franchise: string;
        language: string;
    },
) {
    if (collections.length === 0)
        return { saved: [], added: 0, matched: 0, missed: 0 };

    const supabase = await createClient();
    const scrapedUrls = new Set(
        collections.map((col) => col.collectionUrl).filter(Boolean),
    );

    // Fetch ALL existing collections for this franchise from DB
    const { data: allExisting } = await supabase
        .from("scraped_collections")
        .select("collection_url")
        .eq("franchise", context.franchise)
        .eq("language", context.language);

    const allExistingUrls = new Set(
        (allExisting || []).map((e: any) => e.collection_url),
    );

    // added: scraped but NOT yet in DB
    const added = collections.filter(
        (c) => !allExistingUrls.has(c.collectionUrl),
    ).length;
    // matched: scraped AND already in DB
    const matched = collections.length - added;
    // missed is calculated after the full scrape run, not per-page
    const missed = 0;

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
    const saved = data.map((d: any) => ({
        ...d,
        collectionUrl: d.collection_url,
        imageUrl: d.image_url,
        collectionCode: d.collection_code,
    }));

    console.log(
        `[Persistence] Saving ${collections.length} collections for ${context.franchise}...`,
        { added, matched, missed },
    );
    return { saved, added, matched, missed };
}

export async function saveScrapedCards(
    cards: ScrapedCard[],
    collectionId: number | string,
) {
    if (cards.length === 0) return { added: 0, matched: 0, missed: 0 };

    const supabase = await createClient();
    const scrapedUrls = new Set(cards.map((c) => c.cardUrl).filter(Boolean));

    const colId =
        typeof collectionId === "string"
            ? parseInt(collectionId, 10)
            : collectionId;

    // Fetch ALL existing cards for this collection from DB
    const { data: allExisting } = await supabase
        .from("scraped_cards")
        .select("card_url, name, card_no")
        .eq("collection_id", colId);

    const existingKeys = new Set(
        (allExisting || [])
            .map((e: any) => {
                // Multi-layered uniqueness: URL OR Name+No
                const urlKey = e.card_url;
                const compositeKey = `${e.name}|${e.card_no}`;
                return [urlKey, compositeKey];
            })
            .flat(),
    );

    // addedCards: the subset that needs deep scraping
    // We only want to upsert cards that are:
    // 1. New to the database
    // 2. OR Exist but we now have rarity information (meaning we just deep-scraped them or found them in legacy view)
    const cardsToUpsert = cards.filter((c) => {
        const urlExists = existingKeys.has(c.cardUrl);
        const nameNoExists = existingKeys.has(`${c.name}|${c.cardNo}`);
        const exists = urlExists || nameNoExists;

        if (!exists) return true; // It's new, definitely save it
        return c.rarity && c.rarity !== ""; // It exists, only save if we have rarity to update/keep
    });

    const addedCardsList = cards.filter((c) => {
        const urlExists = existingKeys.has(c.cardUrl);
        const nameNoExists = existingKeys.has(`${c.name}|${c.cardNo}`);
        return !urlExists && !nameNoExists;
    });
    const added = addedCardsList.length;

    // matched: scraped AND already in DB
    const matched = cards.length - added;
    // missed is calculated after the full scrape run
    const missed = 0;

    if (cardsToUpsert.length > 0) {
        const dataToInsert = cardsToUpsert.map((card) => ({
            collection_id: colId,
            name: card.name,
            image_url: card.imageUrl,
            card_url: card.cardUrl,
            card_no: card.cardNo,
            rarity: card.rarity || "",
        }));

        const { error } = await supabase
            .from("scraped_cards")
            .upsert(dataToInsert, { onConflict: "card_url" });

        if (error) {
            console.error("[Persistence] Error saving cards:", {
                error,
                dataToInsert,
            });
            throw error;
        }
    }

    console.log(
        `[Persistence] Processed ${cards.length} cards for collection ${collectionId}. (Upserted ${cardsToUpsert.length})`,
        { added, matched, missed },
    );
    return { added, matched, missed, addedCards: addedCardsList };
}

/** Call once after all pages scraped to get real missed count for collections */
export async function computeMissedCollections(
    allScrapedUrls: Set<string>,
    context: { franchise: string; language: string },
): Promise<number> {
    const supabase = await createClient();
    const { data } = await supabase
        .from("scraped_collections")
        .select("collection_url")
        .eq("franchise", context.franchise)
        .eq("language", context.language);
    const dbUrls = (data || []).map((e: any) => e.collection_url);
    return dbUrls.filter((u: string) => !allScrapedUrls.has(u)).length;
}

/** Call once after all cards scraped to get real missed count for a collection */
export async function computeMissedCards(
    allScrapedUrls: Set<string>,
    collectionId: number | string,
): Promise<number> {
    const supabase = await createClient();
    const colId =
        typeof collectionId === "string"
            ? parseInt(collectionId, 10)
            : collectionId;
    const { data } = await supabase
        .from("scraped_cards")
        .select("card_url")
        .eq("collection_id", colId);
    const dbUrls = (data || []).map((e: any) => e.card_url);
    return dbUrls.filter((u: string) => !allScrapedUrls.has(u)).length;
}
