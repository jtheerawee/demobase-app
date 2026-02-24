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

        const pageData = await workerPage.evaluate(() => {
            // Common selectors for One Piece official card lists (DLs inside resultArea)
            const cardElements = document.querySelectorAll(".resultArea dl");
            const items = Array.from(cardElements).map((el) => {
                const img = el.querySelector("img") as HTMLImageElement;
                const name = img?.alt || "One Piece Card";

                // Get image URL (handle lazy loading data-src)
                let imageUrl = img?.getAttribute('data-src') || img?.src || "";
                if (imageUrl && !imageUrl.startsWith('http')) {
                    const baseUrl = window.location.origin;
                    if (imageUrl.startsWith('..')) {
                        // Handle relative paths like ../images/...
                        const currentPath = window.location.pathname.split('/').slice(0, -1).join('/');
                        imageUrl = baseUrl + currentPath + '/' + imageUrl;
                    } else {
                        imageUrl = baseUrl + (imageUrl.startsWith('/') ? '' : '/') + imageUrl;
                    }
                }

                // Extract Card Number from filename (e.g., OP07-001 from .../OP07-001.png)
                let cardNo = "N/A";
                if (imageUrl) {
                    const filename = imageUrl.split('/').pop()?.split('?')[0] || "";
                    const match = filename.match(/([A-Z0-9]+-[A-Z0-9]+)/i);
                    if (match) {
                        cardNo = match[1].toUpperCase();
                    } else {
                        // Fallback: try search in alt text if it contains the ID
                        const altMatch = name.match(/\[([A-Z0-9]+-[A-Z0-9]+)\]/i);
                        if (altMatch) cardNo = altMatch[1].toUpperCase();
                    }
                }

                // Get card detail URL or Modal ID
                const anchor = el.querySelector("a") as HTMLAnchorElement;
                const detailId = anchor?.getAttribute("data-src") || ""; // e.g., #OP07-001
                let cardUrl = anchor?.href || imageUrl;

                return {
                    name,
                    imageUrl,
                    cardUrl,
                    cardNo,
                    detailId,
                    isDeepScraped: false,
                    isBeingScraped: false
                };
            });
            return { items };
        });

        if (pageData.items.length > 0) {
            sharedCardList.push(...pageData.items);
            send({ type: "chunk", items: pageData.items, startIndex: 0 });
            send({ type: "meta", totalItems: sharedCardList.length });
        }

        // Deep Scrape Phase (English) - Modal Interaction
        if (deepScrape && sharedCardList.length > 0) {
            const totalCards = sharedCardList.length;
            send({ type: "step", message: `Starting deep scrape for ${totalCards} cards via modals...` });

            // Since it's a modal on the same page, we use workers to click through them.
            // Note: Parallel workers on the SAME URL is fine in Playwright.
            const deepWorker = async (workerId: number) => {
                const deepPage = await context.newPage();
                try {
                    await deepPage.goto(url, { waitUntil: "networkidle", timeout: 60000 });

                    while (true) {
                        const cardIndex = sharedCardList.findIndex((c) => c.detailId && !c.isDeepScraped && !c.isBeingScraped);
                        if (cardIndex === -1) break;

                        const card = sharedCardList[cardIndex];
                        card.isBeingScraped = true;
                        send({ type: "step", message: `[Worker ${workerId}] Opening modal for card ${cardIndex + 1}/${totalCards}: ${card.name}` });

                        try {
                            // Click the specific card anchor to open modal
                            const selector = `a[data-src="${card.detailId}"]`;
                            await deepPage.click(selector);

                            // Wait for modal content to appear
                            const modalSelector = `.fancybox-content ${card.detailId}, .fancybox-inner`;
                            await deepPage.waitForSelector(modalSelector, { timeout: 10000 });

                            const details = await deepPage.evaluate((cid: string) => {
                                const modal = document.querySelector('.fancybox-content') || document.querySelector(cid);
                                if (!modal) return null;

                                const getText = (sel: string) => modal.querySelector(sel)?.textContent?.trim() || "";

                                // One Piece specific modal structure
                                const name = getText('.cardName, .name');
                                const cardNo = getText('.cardNumber, .number');
                                const rarity = getText('.rarity');

                                return { name, cardNo, rarity, isDeepScraped: true };
                            }, card.detailId);

                            if (details) {
                                Object.assign(card, details);
                                send({ type: "cardUpdate", index: cardIndex, details });
                            }

                            // Close modal to reset state
                            const closeBtn = await deepPage.$('.fancybox-close-small, .fancybox-button--close');
                            if (closeBtn) await closeBtn.click();
                            await deepPage.waitForTimeout(500);

                        } catch (e) {
                            console.error(`Failed to deep scrape card ${cardIndex}:`, e);
                        } finally {
                            card.isBeingScraped = false;
                        }
                    }
                } finally {
                    await deepPage.close();
                }
            };

            const concurrency = Math.min(APP_CONFIG.CARD_CONCURRENCY_LIMIT, 3); // Keep it lower for modal clicking efficiency
            const workers = Array.from({ length: concurrency }, (_, i) => deepWorker(i + 1));
            await Promise.all(workers);
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
        send({ type: "step", message: `Navigating to: ${url}` });
        await workerPage.goto(url, { waitUntil: "networkidle", timeout: 60000 });

        send({ type: "step", message: "Opening series selector modal..." });
        // Match the button provided by the user
        await workerPage.click('button[data-selmodalbtn="series"]');

        // Wait for list items that actually have content (avoiding empty placeholders)
        // Using state: 'attached' because visibility checks on modals can be flaky during animations
        await workerPage.waitForSelector('li.selModalClose[data-value]:not([data-value=""])', {
            state: 'attached',
            timeout: 15000
        });

        // Small sleep to ensure the modal content is fully populated/rendered
        await workerPage.waitForTimeout(1000);

        const collections = await workerPage.evaluate(() => {
            const listItems = document.querySelectorAll('li.selModalClose[data-value]:not([data-value=""])');
            return Array.from(listItems).map((el) => {
                const li = el as HTMLLIElement;
                const value = li.getAttribute('data-value') || "";
                const name = li.textContent?.trim().replace(/\s+/g, " ") || "Unknown Set";

                // Construct URL
                const baseUrl = window.location.origin + window.location.pathname;
                const collectionUrl = `${baseUrl}?series=${value}`;

                return {
                    name,
                    collectionCode: value,
                    imageUrl: "",
                    collectionUrl,
                };
            }).filter(c => c.collectionCode && c.name.toUpperCase() !== "ALL");
        });

        if (franchise && language && collections.length > 0) {
            send({ type: "step", message: `Found ${collections.length} One Piece EN collections.` });
            send({ type: "chunk", items: collections, startIndex: 0 });
            const result = await saveScrapedCollections(collections, { franchise, language });
            if (result) {
                const { saved, added, matched } = result;
                send({ type: "savedCollections", items: saved });
                send({ type: "stats", category: "collections", added, matched, missed: 0 });
                send({ type: "step", message: `Successfully registered ${collections.length} One Piece EN collections — ✅ ${added} new, 🔁 ${matched} matched.` });
            }
        } else {
            send({ type: "step", message: "No collections found in the series modal." });
        }
    } finally {
        await workerPage.close();
    }
}
