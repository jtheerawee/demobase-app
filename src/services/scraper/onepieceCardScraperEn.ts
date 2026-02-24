import { APP_CONFIG } from "@/constants/app";
import { saveScrapedCards } from "@/services/scraper/persistence";
import type { ScraperOptions } from "@/services/scraper/types";

// ==========================================
// ONE PIECE ENGLISH (EN) CARD SCRAPER LOGIC
// ==========================================

export async function scrapeOnepieceCardsEn({ url, context, send, deepScrape, collectionId }: ScraperOptions) {
    const sharedCardList: any[] = [];

    send({ type: "step", message: "Initializing One Piece EN card scraper..." });

    const workerPage = await context.newPage();
    try {
        send({ type: "step", message: `Navigating to: ${url}` });
        await workerPage.goto(url, { waitUntil: "networkidle", timeout: 60000 });

        // Wait a bit for any secondary dynamic content or animations
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

            if (targets.length === 0) return { items: [], status: "No card elements (dl or img.lazy) found", nameLabelsFound: 0 };

            let nameLabelsFound = 0;
            const items = targets.map((el) => {
                const img = (isImageOnly ? el : el.querySelector("img")) as HTMLImageElement;
                const nameLabel = isImageOnly ? null : el.querySelector('.cardName, .name');
                if (nameLabel) nameLabelsFound++;

                const name = nameLabel?.textContent?.trim() || img?.alt || "One Piece Card";

                // Get image URL (handle lazy loading data-src)
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

                // Extract Card Number from filename (e.g., OP07-001)
                let cardNo = "N/A";
                if (imageUrl) {
                    const filename = imageUrl.split('/').pop()?.split('?')[0] || "";
                    const match = filename.match(/([A-Z0-9]+-[A-Z0-9]+)/i);
                    if (match) {
                        cardNo = match[1].toUpperCase();
                    } else {
                        const altMatch = name.match(/\[([A-Z0-9]+-[A-Z0-9]+)\]/i);
                        if (altMatch) cardNo = altMatch[1].toUpperCase();
                    }
                }

                const anchor = (isImageOnly ? el.closest("a") : el.querySelector("a")) as HTMLAnchorElement;
                const detailId = anchor?.getAttribute("data-src") || "";

                // Use cardNo as the unique URL fragment — the #group_1-1 hash is only set
                // by fancybox JS at click time and is not readable via static scraping.
                const pageUrl = window.location.origin + window.location.pathname + window.location.search;
                const cardUrl = `${pageUrl.split('#')[0]}#${cardNo}`;

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
            const nameLabelsFoundFinal = items.filter(i => !i.name.includes("One Piece Card")).length;
            return { items, status: items.length > 0 ? "Success" : "Empty list", nameLabelsFound: nameLabelsFoundFinal };
        });

        if (pageData.items.length > 0) {
            sharedCardList.push(...pageData.items);
            const samples = pageData.items.slice(0, 3).map((i: any) => i.name).join(", ");
            send({ type: "step", message: `✅ Extracted ${pageData.items.length} cards. Name detection check: ${pageData.nameLabelsFound} names identified. Samples: [${samples}]` });
            send({ type: "chunk", items: pageData.items, startIndex: 0 });
            send({ type: "meta", totalItems: sharedCardList.length });
        } else {
            send({ type: "step", message: `⚠️ No cards found. Status: ${pageData.status}` });
        }

        // Deep Scrape Phase (English) - Direct DOM Read (no fancybox click needed)
        // The dl.modalCol elements are already in the DOM with all card data.
        if (deepScrape && sharedCardList.length > 0) {
            const totalCards = sharedCardList.length;
            send({ type: "step", message: `Starting deep scrape for ${totalCards} cards (direct DOM read)...` });

            const deepPage = await context.newPage();
            try {
                await deepPage.goto(url, { waitUntil: "networkidle", timeout: 60000 });
                // Wait for the modal data elements to be present
                await deepPage.waitForSelector('dl[id]', { state: 'attached', timeout: 15000 });

                send({ type: "step", message: `Page loaded. Reading all card details from DOM...` });

                const allCardDetails = await deepPage.evaluate(() => {
                    // All card data is embedded as hidden dl.modalCol elements with id = cardNo
                    const dlElements = Array.from(document.querySelectorAll('dl[id]'));
                    return dlElements.map(dl => {
                        const cardNo = dl.id.toUpperCase();
                        const infoCol = dl.querySelector('.infoCol') || dl.querySelector('.info_col');
                        const rawInfo = infoCol?.textContent?.trim() || "";
                        const parts = rawInfo.split('|').map((p: string) => p.trim());

                        // parts[0] = cardNo, parts[1] = rarity, parts[2] = type
                        const rarity = parts.length >= 2 ? parts[1] : "";
                        const name = dl.querySelector('.cardName, .name')?.textContent?.trim() || "";

                        const imgEl = dl.querySelector('img') as HTMLImageElement;
                        let imageUrl = imgEl?.getAttribute('data-src') || imgEl?.src || "";
                        if (imageUrl) {
                            try {
                                imageUrl = new URL(imageUrl, window.location.href).href;
                            } catch (e) { /* ignore */ }
                            imageUrl = imageUrl.split('?')[0].replace(/_p\d+\./, '.');
                        }

                        return { cardNo, rarity, name, imageUrl, rawInfo };
                    });
                });

                send({ type: "step", message: `Found ${allCardDetails.length} card detail entries in DOM.` });

                // Map details back into sharedCardList by direct cardNo match
                let updated = 0;
                for (const detail of allCardDetails) {
                    const matches = sharedCardList
                        .map((c, i) => ({ c, i }))
                        .filter(({ c }) => c.cardNo === detail.cardNo);

                    if (matches.length === 0) continue;

                    send({ type: "step", message: `${detail.cardNo}: Rarity="${detail.rarity}" | RawInfo="${detail.rawInfo}"` });

                    for (const { c: card, i: idx } of matches) {
                        if (detail.rarity) card.rarity = detail.rarity;
                        if (detail.name && detail.name !== "One Piece Card") card.name = detail.name;
                        if (detail.imageUrl) card.imageUrl = detail.imageUrl;
                        card.isDeepScraped = true;
                        send({ type: "cardUpdate", index: idx, details: { rarity: card.rarity, name: card.name, imageUrl: card.imageUrl, cardUrl: card.cardUrl, isDeepScraped: true } });
                    }
                    updated++;
                }

                const noRarity = sharedCardList.filter(c => !c.rarity).length;
                send({ type: "step", message: `✅ Deep scrape complete. Updated ${updated} card numbers. Cards still missing rarity: ${noRarity}` });
            } finally {
                await deepPage.close();
            }

            send({ type: "step", message: "Deep scrape phase completed." });
        }

        if (collectionId && sharedCardList.length > 0) {
            // Dedup by cardNo keeping first occurrence (base card), then drop cards without rarity
            const seenNos = new Set<string>();
            const uniqueCards = sharedCardList.filter(c => {
                if (seenNos.has(c.cardNo)) return false;
                seenNos.add(c.cardNo);
                return true;
            });
            const cardsToSave = uniqueCards.filter(c => c.rarity && c.rarity !== "");
            const skipped = uniqueCards.length - cardsToSave.length;

            send({ type: "step", message: `Final Step: Persisting ${cardsToSave.length} cards${skipped > 0 ? ` (${skipped} skipped — no rarity)` : ""} to database...` });
            const result = await saveScrapedCards(cardsToSave, collectionId);
            if (result) {
                const { added, matched } = result;
                send({ type: "stats", category: "cards", added, matched, missed: 0 });
                send({ type: "step", message: `✨ Scrape Complete! Saved ${cardsToSave.length} cards — ✅ ${added} new, 🔁 ${matched} matched.` });
            }
        } else if (sharedCardList.length === 0) {
            send({ type: "step", message: "Scrape finished with 0 cards found for this series." });
        }
    } finally {
        await workerPage.close();
    }
}
