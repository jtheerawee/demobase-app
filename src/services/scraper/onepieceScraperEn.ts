import { APP_CONFIG } from "@/constants/app";
import { saveScrapedCards, saveScrapedCollections } from "@/services/scraper/persistence";
import type { ScraperOptions } from "@/services/scraper/types";

// ==========================================
// ONE PIECE ENGLISH (EN) SCRAPER LOGIC
// ==========================================

export async function scrapeOnepieceCardsEn({ url, context, send, deepScrape, collectionId }: ScraperOptions) {
    const sharedCardList: any[] = [];

    send({ type: "step", message: "Initializing One Piece EN card scraper..." });

    const workerPage = await context.newPage();
    try {
        send({ type: "step", message: `Navigating to: ${url}` });
        await workerPage.goto(url, { waitUntil: "networkidle", timeout: 60000 });

        // Template for extraction
        const pageData = await workerPage.evaluate(() => {
            const cardElements = document.querySelectorAll(".card-list .item"); // PLACEHOLDER SELECTOR
            const items = Array.from(cardElements).map((el) => {
                const img = el.querySelector("img");
                const name = img?.alt || "One Piece Card";
                const imageUrl = img?.src || "";
                const cardUrl = el.querySelector("a")?.href || "";

                return {
                    name,
                    imageUrl,
                    cardUrl,
                    cardNo: "N/A", // To be extracted
                };
            });
            return { items };
        });

        if (pageData.items.length > 0) {
            sharedCardList.push(...pageData.items);
            send({ type: "chunk", items: pageData.items, startIndex: 0 });
            send({ type: "meta", totalItems: sharedCardList.length });
        }

        if (collectionId && sharedCardList.length > 0) {
            send({ type: "step", message: "Saving One Piece EN cards..." });
            const result = await saveScrapedCards(sharedCardList, collectionId);
            if (result) {
                const { added, matched } = result;
                send({ type: "stats", category: "cards", added, matched, missed: 0 });
                send({ type: "step", message: `Saved ${sharedCardList.length} cards — ✅ ${added} new, 🔁 ${matched} matched.` });
            }
        }
    } finally {
        await workerPage.close();
    }
}

export async function scrapeOnepieceCollectionsEn({ url, context, send, franchise, language }: ScraperOptions) {
    send({ type: "step", message: "Discovering One Piece EN collections..." });

    const workerPage = await context.newPage();
    try {
        await workerPage.goto(url, { waitUntil: "networkidle" });

        const collections = await workerPage.evaluate(() => {
            // Skeleton logic for collection discovery
            return [
                {
                    name: "Sample Set",
                    collectionCode: "OP01",
                    imageUrl: "",
                    collectionUrl: window.location.href
                }
            ];
        });

        if (franchise && language && collections.length > 0) {
            send({ type: "chunk", items: collections, startIndex: 0 });
            const result = await saveScrapedCollections(collections, { franchise, language });
            if (result) {
                const { saved, added, matched } = result;
                send({ type: "savedCollections", items: saved });
                send({ type: "stats", category: "collections", added, matched, missed: 0 });
                send({ type: "step", message: `Registered ${collections.length} collections.` });
            }
        }
    } finally {
        await workerPage.close();
    }
}
