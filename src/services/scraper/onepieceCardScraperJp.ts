import { APP_CONFIG } from "@/constants/app";
import { saveScrapedCards } from "@/services/scraper/persistence";
import type { ScraperOptions } from "@/services/scraper/types";

// ==========================================
// ONE PIECE JAPANESE (JP) CARD SCRAPER LOGIC
// ==========================================

export async function scrapeOnepieceCardsJp({ url, context, send, deepScrape, collectionId }: ScraperOptions) {
    const sharedCardList: any[] = [];

    send({ type: "step", message: "Initializing One Piece JP card scraper..." });

    const workerPage = await context.newPage();
    try {
        send({ type: "step", message: `Navigating to: ${url}` });
        await workerPage.goto(url, { waitUntil: "networkidle", timeout: 60000 });

        // Wait a bit for any secondary dynamic content
        await workerPage.waitForTimeout(2000);

        send({ type: "step", message: "Searching for cards on the page..." });

        const pageData = await workerPage.evaluate(() => {
            // Find cards: try traditional DLs first, then fallback to lazy images
            let targets: Element[] = Array.from(document.querySelectorAll("dl"));
            let isImageOnly = false;

            if (targets.length === 0) {
                // Fallback: If no DLs, try finding images directly (special layouts)
                targets = Array.from(document.querySelectorAll("img.lazy, img[data-src]"));
                isImageOnly = true;
            }

            if (targets.length === 0) return { items: [], status: "No card elements (dl or img.lazy) found" };

            const items = targets.map((el) => {
                const img = (isImageOnly ? el : el.querySelector("img")) as HTMLImageElement;
                const nameLabel = isImageOnly ? null : el.querySelector('.cardName, .name');
                const name = nameLabel?.textContent?.trim() || img?.alt || "One Piece Card JP";

                // Get image URL (data-src fallback)
                let rawImageUrl = img?.getAttribute('data-src') || img?.getAttribute('src') || "";
                let imageUrl = "";
                if (rawImageUrl) {
                    try {
                        imageUrl = new URL(rawImageUrl, window.location.href).href;
                        // Normalize to clean format: remove _p1 suffix and query params
                        imageUrl = imageUrl.split('?')[0].replace(/_p\d+\./, '.');
                    } catch (e) {
                        imageUrl = rawImageUrl;
                    }
                }

                // Extract Card Number (e.g., OP07-001)
                let cardNo = "N/A";
                if (imageUrl) {
                    const filename = imageUrl.split('/').pop()?.split('?')[0] || "";
                    const match = filename.match(/([A-Z0-9]+-[A-Z0-9]+)/i);
                    if (match) {
                        cardNo = match[1].toUpperCase();
                    }
                }

                const anchor = (isImageOnly ? el.closest("a") : el.querySelector("a")) as HTMLAnchorElement;
                const detailId = anchor?.getAttribute("data-src") || "";

                // Construct card URL using hash format
                const pageUrl = window.location.origin + window.location.pathname + window.location.search;
                let cardUrl = "";
                if (detailId && detailId.startsWith('#')) {
                    cardUrl = `${pageUrl.split('#')[0]}${detailId}`;
                } else if (anchor?.href && !anchor.href.startsWith('javascript')) {
                    cardUrl = anchor.href;
                } else {
                    // Fallback to hash based on card number
                    cardUrl = `${pageUrl.split('#')[0]}#${cardNo}`;
                }

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
            return { items, status: items.length > 0 ? "Success" : "Empty list" };
        });

        if (pageData.items.length > 0) {
            sharedCardList.push(...pageData.items);
            send({ type: "step", message: `✅ Successfully extracted ${pageData.items.length} cards from the list.` });
            send({ type: "chunk", items: pageData.items, startIndex: 0 });
            send({ type: "meta", totalItems: sharedCardList.length });
        } else {
            send({ type: "step", message: `⚠️ No cards found. Status: ${pageData.status}` });
        }

        // Deep Scrape Phase (JP) - Modal Interaction
        if (deepScrape && sharedCardList.length > 0) {
            const totalCards = sharedCardList.length;
            send({ type: "step", message: `Starting deep scrape for ${totalCards} cards via modals (Parallel Workers)...` });

            const deepWorker = async (workerId: number) => {
                const deepPage = await context.newPage();
                try {
                    await deepPage.goto(url, { waitUntil: "networkidle", timeout: 60000 });
                    // Wait for the card list to be interactive
                    await deepPage.waitForSelector('a[data-src]', { timeout: 15000 });

                    while (true) {
                        const cardIndex = sharedCardList.findIndex((c) => c.detailId && !c.isDeepScraped && !c.isBeingScraped);
                        if (cardIndex === -1) break;

                        const card = sharedCardList[cardIndex];
                        card.isBeingScraped = true;

                        try {
                            const selector = `a[data-src="${card.detailId}"]`;
                            const clickTarget = await deepPage.$(selector);

                            if (!clickTarget) {
                                send({ type: "step", message: `[Worker ${workerId}] ⚠️ Could not find click target for ${card.cardNo}. Skipping details.` });
                                continue;
                            }

                            await clickTarget.click();

                            const modalSelector = `.fancybox-content, .fancybox-inner, .cardDetail, ${card.detailId}`;
                            await deepPage.waitForSelector(modalSelector, { timeout: 10000 });

                            // 1. Wait until metadata is actually rendered
                            try {
                                await deepPage.waitForFunction(() => {
                                    const info = document.querySelector('.infoCol') || document.querySelector('.info_col');
                                    const text = info?.textContent || "";
                                    return text.includes('|');
                                }, { timeout: 7000 });
                            } catch (e) {
                                // Continue
                            }

                            const details = await deepPage.evaluate((cid: string) => {
                                // Find visible/active modal
                                const modals = Array.from(document.querySelectorAll('.fancybox-content, .fancybox-inner, .cardDetail, .fancybox-container'));
                                const modal = modals.find(m => (m as HTMLElement).offsetParent !== null) ||
                                    modals.find(m => m.classList.contains('fancybox-is-open')) ||
                                    document.querySelector(cid) ||
                                    modals[0];

                                if (!modal) return null;

                                const getText = (sel: string) => modal.querySelector(sel)?.textContent?.trim() || "";
                                const name = getText('.cardName, .name, h2, h3');

                                // --- RARITY EXTRACTION ---
                                let rarity = "";
                                let debugRawText = "";
                                let debugStrategy = "None";
                                const infoCol = modal.querySelector('.infoCol') || modal.querySelector('.info_col');

                                if (infoCol) {
                                    debugRawText = infoCol.textContent?.trim() || "EMPTY";
                                    const parts = debugRawText.split('|').map((p: string) => p.trim());
                                    if (parts.length >= 2) {
                                        rarity = parts[1];
                                        debugStrategy = "PipeSplit";
                                    }
                                }

                                if (!rarity || rarity.length > 8) {
                                    const allText = modal.textContent || "";
                                    const match = allText.match(/\b(L|SEC|SR|R|UC|C|P)\b/);
                                    if (match) {
                                        rarity = match[1];
                                        debugStrategy = "RegexFallback";
                                    }
                                }

                                // --- IMAGE EXTRACTION ---
                                const imgEl = modal.querySelector('.cardDetail img, .card_detail img, img') as HTMLImageElement;
                                let imageUrl = imgEl?.src || "";
                                if (imageUrl) {
                                    imageUrl = imageUrl.split('?')[0].replace(/_p\d+\./, '.');
                                }

                                return {
                                    name,
                                    rarity,
                                    imageUrl,
                                    isDeepScraped: true,
                                    debug: { raw: debugRawText, strategy: debugStrategy }
                                };
                            }, card.detailId);

                            if (details) {
                                const { debug, ...actualDetails } = details;
                                Object.assign(card, actualDetails);
                                send({ type: "step", message: `[Worker ${workerId}] ${card.cardNo}: Rarity="${card.rarity}" | Strategy=${debug.strategy}` });
                                send({ type: "cardUpdate", index: cardIndex, details: actualDetails });
                            } else {
                                send({ type: "step", message: `[Worker ${workerId}] ❌ Failed to extract details for ${card.cardNo}` });
                            }

                            const closeBtn = await deepPage.$('.fancybox-close-small, .fancybox-button--close');
                            if (closeBtn) await closeBtn.click();
                            await deepPage.waitForTimeout(300);

                        } catch (e) {
                            send({ type: "step", message: `[Worker ${workerId}] Error on ${card.cardNo}: ${e instanceof Error ? e.message : 'Unknown error'}` });
                        } finally {
                            card.isBeingScraped = false;
                        }
                    }
                } finally {
                    await deepPage.close();
                }
            };

            const concurrency = Math.min(APP_CONFIG.CARD_CONCURRENCY_LIMIT, 3);
            const workers = Array.from({ length: concurrency }, (_, i) => deepWorker(i + 1));
            await Promise.all(workers);
            send({ type: "step", message: "Deep scrape phase completed." });
        }

        if (collectionId && sharedCardList.length > 0) {
            // Deduplicate cards by cardNo
            const uniqueCards = Array.from(new Map(sharedCardList.map(c => [c.cardNo, c])).values());

            send({ type: "step", message: `Final Step: Persisting ${uniqueCards.length} unique cards to database...` });
            const result = await saveScrapedCards(uniqueCards, collectionId);
            if (result) {
                const { added, matched } = result;
                send({ type: "stats", category: "cards", added, matched, missed: 0 });
                send({ type: "step", message: `✨ Scrape Complete! Saved ${uniqueCards.length} cards — ✅ ${added} new, 🔁 ${matched} matched.` });
            }
        } else if (sharedCardList.length === 0) {
            send({ type: "step", message: "Scrape finished with 0 cards found for this series." });
        }
    } finally {
        await workerPage.close();
    }
}
