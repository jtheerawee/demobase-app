import { APP_CONFIG } from "@/constants/app";
import { saveScrapedCards } from "@/services/scraper/persistence";
import type { ScraperOptions } from "@/services/scraper/types";

// ==========================================
// LORCANA CARD SCRAPER LOGIC (TCGPlayer)
// ==========================================

export async function scrapeLorcanaCards({
    url,
    context,
    send,
    deepScrape,
    collectionId,
    cardLimit,
}: ScraperOptions) {
    const limit = cardLimit ?? APP_CONFIG.NUM_SCRAPED_CARDS_PER_COLLECTION;
    const sharedCardList: any[] = [];
    let totalPages = Infinity;
    let nextPageIndex = 1;
    let shouldAbort = false;

    const getTargetUrl = (p: number) => {
        if (url.includes("page=")) {
            return url.replace(/page=\d+/, `page=${p}`);
        }
        return url.includes("?") ? `${url}&page=${p}` : `${url}?page=${p}`;
    };

    const concurrency = 2; // Keep it low for TCGPlayer to avoid bot detection
    const updateWorkers = (delta: number) => {
        // Implementation if needed for worker tracking in UI
    };

    const rarityMap = APP_CONFIG.LORCANA_RARITY_MAP;
    const paginationWorker = async (workerId: number) => {
        const workerPage = await context.newPage();
        try {
            while (true) {
                if (shouldAbort) break;
                const p = nextPageIndex++;
                if (p > totalPages || p > 500) break; // Hard limit 500 pages safety

                const targetPageUrl = getTargetUrl(p);
                try {
                    send({
                        type: "step",
                        message: `Worker ${workerId} scraping page ${p}: ${targetPageUrl}`,
                    });

                    // Use a slightly longer timeout and wait for network idle to be safe
                    await workerPage.goto(targetPageUrl, {
                        waitUntil: "domcontentloaded",
                        timeout: 60000,
                    });

                    if (shouldAbort) break;

                    // Verify set filter is applied if we are looking for a specific set
                    if (targetPageUrl.includes("setName=")) {
                        await workerPage.waitForSelector('.tcg-standard-button--border.hfb-popover__button', { timeout: 10000 })
                            .catch(() => console.warn(`[Lorcana Scraper] Filter chip not detected for page ${p}.`));
                    }

                    // Wait for results or empty state
                    await workerPage.waitForSelector('.product-card, .search-results__no-results', { timeout: 20000 }).catch(() => { });

                    // Extract total pages on first page
                    if (p === 1 && totalPages === Infinity) {
                        const totalResults = await workerPage.evaluate(() => {
                            const resultsText = document.querySelector('.search-results-count')?.textContent || "";
                            // Match numbers with commas, e.g., "1,238 results"
                            const match = resultsText.replace(/,/g, '').match(/(\d+)\s+results/i);
                            return match ? parseInt(match[1], 10) : 0;
                        });

                        if (totalResults > 0) {
                            // TCGPlayer usually has 24 results per page in grid view
                            totalPages = Math.ceil(totalResults / 24);
                            send({ type: "meta", totalPages, totalCards: totalResults });
                        }
                    }

                    const pageData = await workerPage.evaluate((map: Record<string, string>) => {
                        const items: any[] = [];
                        const cardElements = document.querySelectorAll('.product-card');

                        cardElements.forEach(el => {
                            const nameEl = el.querySelector('.product-card__title');
                            const imageEl = el.querySelector('.product-card__image img');
                            const rarityEl = el.querySelector('.product-card__rarity span:nth-child(1)');
                            const numberEl = el.querySelector('.product-card__rarity span:nth-child(2)');
                            const setEl = el.querySelector('.product-card__set-name, h4');
                            const linkEl = el.closest('a') || el.querySelector('a');

                            const name = nameEl?.textContent?.trim() || "Unknown Lorcana Card";
                            // Ensure absolute URLs (browser resolved)
                            const cardUrl = (linkEl as HTMLAnchorElement)?.href || "";
                            const imageUrl = (imageEl as HTMLImageElement)?.src || "";
                            const setName = setEl?.textContent?.trim() || "";

                            // Lorcana numbers are usually like #1/204
                            const rawNo = numberEl?.textContent?.trim() || "";
                            const cardNo = rawNo.replace('#', '').split('/')[0].trim();

                            const rarityRaw = rarityEl?.textContent?.trim() || "";
                            const rarity = map[rarityRaw] || rarityRaw;

                            if (cardUrl && cardUrl.startsWith('http')) {
                                items.push({
                                    name,
                                    cardUrl,
                                    imageUrl,
                                    cardNo,
                                    rarity,
                                    setName,
                                });
                            }
                        });
                        return items;
                    }, rarityMap);

                    if (pageData.length === 0) {
                        // If we get 0 cards on a page that we expected to have cards, 
                        // it might be a block or the end of results
                        if (totalPages === Infinity || p <= totalPages) {
                            totalPages = p - 1;
                        }
                        break;
                    }

                    const beforeCount = sharedCardList.length;
                    const canAdd = limit - beforeCount;
                    if (canAdd <= 0) {
                        shouldAbort = true;
                        break;
                    }

                    const cardsToAdd = pageData.slice(0, canAdd);
                    sharedCardList.push(...cardsToAdd);

                    send({
                        type: "chunk",
                        items: cardsToAdd,
                        startIndex: beforeCount,
                    });

                    if (sharedCardList.length >= limit) {
                        shouldAbort = true;
                        break;
                    }

                } catch (err) {
                    console.error(`Worker ${workerId} failed on page ${p}:`, err);
                    // If page 1 fails, we might as well stop
                    if (p === 1) {
                        shouldAbort = true;
                        break;
                    }
                }
            }
        } finally {
            await workerPage.close();
        }
    };

    const workers = Array.from({ length: concurrency }, (_, i) => paginationWorker(i + 1));
    await Promise.all(workers);

    if (collectionId && sharedCardList.length > 0) {
        send({
            type: "step",
            message: `Scraped ${sharedCardList.length} cards. Registering...`,
        });

        try {
            const result = await saveScrapedCards(sharedCardList, collectionId);
            if (result) {
                const { added, matched } = result;
                send({
                    type: "stats",
                    category: "cards",
                    added,
                    matched,
                    missed: 0,
                });
                send({
                    type: "step",
                    message: `Successfully registered ${sharedCardList.length} Lorcana cards — ✅ ${added} new, 🔁 ${matched} matched.`,
                });
            }
        } catch (error) {
            console.error("Failed to save Lorcana cards:", error);
            send({
                type: "step",
                message: "Error: Could not register cards.",
            });
        }
    }

    send({
        type: "complete",
        success: true,
    });
}
