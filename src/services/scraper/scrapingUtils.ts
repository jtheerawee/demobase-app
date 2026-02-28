import { SCRAPER_MESSAGE_TYPE } from "./types";
import { computeMissedCards, saveScrapedCards } from "./persistence";
import { reportScraperStats } from "./utils";

interface DeepScraperOptions {
    items: any[];
    context: any;
    send: (msg: any) => void;
    logStep: (msg: string) => void;
    updateWorkers: (delta: number) => void;
    concurrency: number;
    timeout: number;
    extractFn: () => any;
    onResult?: (result: any, card: any) => void;
    franchiseLabel?: string;
}

/**
 * Shared utility for running parallel deep-scraping workers with automatic retry and UI synchronization.
 */
export async function runDeepScraperWorkers({
    items,
    context,
    send,
    logStep,
    updateWorkers,
    concurrency,
    timeout,
    extractFn,
    onResult,
    franchiseLabel = "Franchise",
}: DeepScraperOptions) {
    const deepWorker = async (workerId: number) => {
        updateWorkers(1);
        const workerPage = await context.newPage();
        try {
            while (true) {
                const cardIndex = items.findIndex((c) => c.cardUrl && !c.isDeepScraped && !c.isBeingScraped);
                if (cardIndex === -1) break;

                const card = items[cardIndex];
                card.isBeingScraped = true;

                try {
                    logStep(`Deep scraping card ${cardIndex + 1}/${items.length}: ${card.name}`);

                    let success = false;
                    for (let attempt = 1; attempt <= 2; attempt++) {
                        try {
                            await workerPage.goto(card.cardUrl, {
                                waitUntil: "domcontentloaded",
                                timeout: timeout,
                            });
                            success = true;
                            break;
                        } catch (gotoErr) {
                            if (attempt === 2) throw gotoErr;
                            logStep(`Worker ${workerId} timeout on card ${cardIndex + 1}. Retrying...`);
                            await workerPage.waitForTimeout(2000);
                        }
                    }

                    if (!success) throw new Error("Failed to navigate after retries");

                    const details = await workerPage.evaluate(extractFn);

                    // Call the custom result handler if provided (e.g., for rarity lookup)
                    if (onResult) {
                        onResult(details, card);
                    }

                    Object.assign(card, details);
                    card.isBeingScraped = false;

                    send({
                        type: SCRAPER_MESSAGE_TYPE.CARD_UPDATE,
                        index: cardIndex,
                        details,
                    });
                } catch (e) {
                    card.isBeingScraped = false;
                    console.error(`[Scraper ${franchiseLabel}] Worker ${workerId} failed on card ${cardIndex}:`, e);
                }
            }
        } finally {
            await workerPage.close();
            updateWorkers(-1);
        }
    };

    const workers = Array.from({ length: concurrency }, async (_, i) => {
        const workerId = i + 1;
        if (i > 0) await new Promise((r) => setTimeout(r, i * 150));
        return deepWorker(workerId);
    });

    await Promise.all(workers);
}

interface FinalizeScraperOptions {
    allCards: any[];
    collectionId: number | string | null | undefined;
    franchise: string | undefined;
    send: (msg: any) => void;
    logStep: (msg: string) => void;
    updateWorkers: (delta: number) => void;
    discardedCount?: number;
}

/**
 * Shared utility to handle Step 3: Finalizing.
 * Persists all cards, computes missed cards, sends final meta/stats, and resets workers.
 */
export async function finalizeScraper({
    allCards,
    collectionId,
    franchise = "Franchise",
    send,
    logStep,
    updateWorkers
}: FinalizeScraperOptions) {
    if (collectionId && allCards.length > 0) {
        logStep(`Step 3: ${franchise}. Finalizing ${allCards.length} cards in database...`);
        try {
            const result = await saveScrapedCards(allCards, collectionId);
            if (result) {
                const { addedItems, matchedItems } = result;
                logStep(`Successfully saved ${franchise} cards — ✅ ${addedItems?.length || 0} new, 🔁 ${matchedItems?.length || 0} matched.`);

                const allCardUrls = new Set(allCards.map((c: any) => c.cardUrl).filter(Boolean));
                const missedResult = await computeMissedCards(allCardUrls, collectionId);
                if (missedResult.count > 0) {
                    logStep(`⚠️ ${missedResult.count} cards are in DB but were not found in this scrape.`);
                }
                reportScraperStats(send, "cards", {
                    addedItems: [],
                    matchedItems: [],
                    missedItems: missedResult.items,
                });
            }
        } catch (error) {
            console.error(`[Scraper ${franchise}] Final save failed:`, error);
            logStep("Warning: Failed to persist cards to database.");
        }
    }

    updateWorkers(0);
}
