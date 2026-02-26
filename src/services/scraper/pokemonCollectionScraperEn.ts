import { saveScrapedCollections } from "@/services/scraper/persistence";
import type { ScraperOptions } from "@/services/scraper/types";

// ==========================================
// ENGLISH (EN) COLLECTION SCRAPER LOGIC
// ==========================================

export async function scrapePokemonCollectionsEn({
    url,
    context,
    send,
    franchise,
    language,
}: ScraperOptions) {
    send({
        type: "step",
        message:
            "Extracting sets directly from English Search URL (no browser scraping)...",
    });
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    const sharedCollectionList: any[] = [];

    for (const [key, value] of params.entries()) {
        if (value === "on") {
            sharedCollectionList.push({
                name: key.toUpperCase(),
                collectionCode: key.toUpperCase(),
                imageUrl: "",
                collectionUrl: `https://www.pokemon.com/us/pokemon-tcg/pokemon-cards/?${key}=on&advancedSubmit=`,
            });
        }
    }

    if (franchise && language && sharedCollectionList.length > 0) {
        // Send to UI immediately for feedback
        send({ type: "chunk", items: sharedCollectionList, startIndex: 0 });

        send({
            type: "step",
            message: `Found ${sharedCollectionList.length} set keys in URL parameters. Registering...`,
        });
        try {
            const result = await saveScrapedCollections(sharedCollectionList, {
                franchise,
                language,
            });
            if (result) {
                const { saved, added, matched } = result;
                send({ type: "savedCollections", items: saved });
                send({
                    type: "stats",
                    category: "collections",
                    added,
                    matched,
                    missed: 0,
                });
                send({
                    type: "step",
                    message: `Successfully registered ${sharedCollectionList.length} English collections — ✅ ${added} new, 🔁 ${matched} matched.`,
                });
            }
        } catch (error) {
            console.error("Failed to save English sets:", error);
            send({
                type: "step",
                message: "Error: Could not register virtual collections.",
            });
        }
    } else {
        send({
            type: "step",
            message:
                "No 'on' parameters found in URL. Check your English search URL.",
        });
    }
}
