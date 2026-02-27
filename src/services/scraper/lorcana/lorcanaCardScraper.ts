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
                        message: `Worker ${workerId} scraping page ${p}`,
                    });

                    await workerPage.goto(targetPageUrl, {
                        waitUntil: "domcontentloaded",
                        timeout: 60000,
                    });

                    if (shouldAbort) break;

                    // 1. Redirect Check: If TCGPlayer redirects to a generic search, stop.
                    const currentUrl = workerPage.url();
                    const isLorcana = currentUrl.includes("lorcana-tcg") || currentUrl.includes("productLineName=lorcana-tcg");
                    // If we expected a set but the URL no longer has setName, we likely hit a redirect
                    const expectedSetSlug = url.match(/setName=([^&]+)/)?.[1];
                    const stillHasSet = expectedSetSlug ? currentUrl.includes(`setName=${expectedSetSlug}`) : true;

                    if (!isLorcana || !stillHasSet) {
                        console.warn(`[Lorcana Scraper] Worker ${workerId} detected redirect or set loss on page ${p}. Stopping.`);
                        if (totalPages === Infinity) totalPages = p - 1;
                        break;
                    }

                    // Wait for results or empty state
                    await workerPage.waitForSelector('.product-card, .search-results__no-results, .search-results-count', { timeout: 15000 }).catch(() => { });

                    // 2. Total Results Consistency Check
                    const currentTotalResults = await workerPage.evaluate(() => {
                        const el = document.querySelector('.search-results-count') ||
                            document.querySelector('.search-results__summary');
                        const text = el?.textContent || "";
                        const match = text.replace(/,/g, '').match(/(\d+)\s+results/i);
                        return match ? parseInt(match[1], 10) : 0;
                    });

                    // If we already detected totalPages and the count suddenly changed (e.g. 200 -> 400,000), it's a redirect
                    if (totalPages !== Infinity && currentTotalResults > 0) {
                        const currentTotalPages = Math.ceil(currentTotalResults / 24);
                        // Allow a small margin for TCGPlayer weirdness, but if it jumps significantly, stop
                        if (currentTotalPages > totalPages + 10) {
                            console.warn(`[Lorcana Scraper] Result count jump detected on page ${p}. Stopping.`);
                            break;
                        }
                    }

                    // Extract total pages on first page if not already done
                    if (p === 1 && totalPages === Infinity && currentTotalResults > 0) {
                        totalPages = Math.ceil(currentTotalResults / 24);
                        send({ type: "meta", totalPages, totalCards: currentTotalResults });
                    }

                    const pageData = await workerPage.evaluate(({ map, reqSet }: { map: Record<string, string>, reqSet: string | undefined }) => {
                        const items: any[] = [];
                        const cardElements = document.querySelectorAll('.product-card');

                        cardElements.forEach(el => {
                            const nameEl = el.querySelector('.product-card__title');
                            const imageEl = el.querySelector('.product-card__image img');
                            const rarityEl = el.querySelector('.product-card__rarity span:nth-child(1)');
                            const numberEl = el.querySelector('.product-card__rarity span:nth-child(2)');
                            const setEl = el.querySelector('.product-card__set-name, h4');
                            const linkEl = el.closest('a') || el.querySelector('a');

                            const name = nameEl?.textContent?.trim() || "";
                            const cardUrl = (linkEl as HTMLAnchorElement)?.href || "";

                            // Basic validation: must have name and URL
                            if (!name || !cardUrl) return;

                            const imageUrl = (imageEl as HTMLImageElement)?.src || "";
                            const setName = setEl?.textContent?.trim() || "";

                            // If we filtered by a specific set, verify the card's set name (case-insensitive check)
                            // This stops us from scraping Pokemon cards if we redirected but stayed in a valid-looking URL
                            if (reqSet) {
                                const slugify = (s: string) => s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                                if (slugify(setName) !== reqSet && !setName.toLowerCase().includes(reqSet.replace(/-/g, ' '))) {
                                    return; // Skip this card
                                }
                            }

                            const rawNo = numberEl?.textContent?.trim() || "";
                            const cardNo = rawNo.replace('#', '').split('/')[0].trim();

                            // Normalize rarity: remove commas, trim, and handle case lookup
                            const rarityRaw = rarityEl?.textContent?.trim().replace(/[,]$/, '') || "";

                            // Try exact match, then case-insensitive match
                            let rarity = map[rarityRaw];
                            if (!rarity) {
                                const lowerRaw = rarityRaw.toLowerCase();
                                const foundKey = Object.keys(map).find(k => k.toLowerCase() === lowerRaw);
                                rarity = foundKey ? map[foundKey] : rarityRaw;
                            }

                            items.push({ name, cardUrl, imageUrl, cardNo, rarity, setName });
                        });
                        return items;
                    }, { map: rarityMap, reqSet: expectedSetSlug });

                    if (pageData.length === 0) {
                        // End of results reached
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
