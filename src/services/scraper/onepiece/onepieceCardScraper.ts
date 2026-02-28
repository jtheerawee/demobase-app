import { CARD_SCRAPER_CONFIG } from "@/constants/card_scraper";
import { saveScrapedCards } from "@/services/scraper/persistence";
import { type ScraperOptions } from "@/services/scraper/types";
import { createStepLogger, reportScraperStats, reportScraperChunk } from "@/services/scraper/utils";

export async function scrapeOnepieceCards({ url, context, collectionId, send, cardLimit }: ScraperOptions) {
    const logStep = createStepLogger(send);
    const limit = cardLimit ?? CARD_SCRAPER_CONFIG.NUM_SCRAPED_CARDS_PER_COLLECTION;
    const cards: any[] = [];
    const baseUrl = url.split("#")[0];

    logStep("Initializing One Piece card scraper...");

    const page = await context.newPage();
    try {
        logStep(`Loading: ${baseUrl}`);
        await page.goto(baseUrl, {
            waitUntil: "networkidle",
            timeout: CARD_SCRAPER_CONFIG.PAGE_LOAD_TIMEOUT,
        });
        await page.waitForTimeout(2000);

        // Discover total card count using a cascade of fancybox selector patterns
        const totalAnchors = await page.evaluate(() => {
            const candidates: [string, number][] = [
                ["a[data-fancybox]", document.querySelectorAll("a[data-fancybox]").length],
                ['a[data-src^="#"]', document.querySelectorAll('a[data-src^="#"]').length],
                ["dl a", document.querySelectorAll("dl a").length],
            ];
            const [, count] = candidates.find(([, n]) => n > 0) ?? ["", 0];
            return count;
        });

        if (totalAnchors === 0) {
            logStep("⚠️ No card anchors found on page.");
            return;
        }

        logStep(`Found ${totalAnchors} cards. Scraping...`);

        for (let N = 1; N <= totalAnchors; N++) {
            const cardUrl = `${baseUrl}#group_1-${N}`;

            // Click the Nth anchor to trigger fancybox
            const clicked = await page.evaluate(
                ({ idx, candidates }: { idx: number; candidates: string[] }) => {
                    for (const sel of candidates) {
                        const anchors = document.querySelectorAll(sel);
                        const el = anchors[idx] as HTMLElement | undefined;
                        if (el) {
                            el.click();
                            return true;
                        }
                    }
                    return false;
                },
                {
                    idx: N - 1,
                    candidates: ["a[data-fancybox]", 'a[data-src^="#"]', "dl a"],
                },
            );

            if (!clicked) {
                logStep(`[${N}] Could not click anchor — stopping.`);
                break;
            }

            // Wait for modal to be visible
            try {
                await page.waitForSelector(".fancybox-slide--current .cardDetail, .fancybox-content, .fancybox-inner", {
                    state: "visible",
                    timeout: 10000,
                });
            } catch {
                logStep(`[${N}] No modal appeared — stopping.`);
                break;
            }

            // Wait until infoCol has pipe-separated rarity data
            try {
                await page.waitForFunction(
                    () => {
                        const info = document.querySelector(
                            ".fancybox-slide--current .infoCol, .fancybox-slide--current .info_col," +
                                ".fancybox-content .infoCol, .fancybox-content .info_col",
                        );
                        return !!info?.textContent?.includes("|");
                    },
                    { timeout: 5000 },
                );
            } catch {
                /* some cards may not have infoCol — continue */
            }

            // Scrape card data from the open modal
            const details = await page.evaluate(() => {
                const modal =
                    document.querySelector(".fancybox-slide--current .cardDetail") ||
                    document.querySelector(".fancybox-content") ||
                    document.querySelector(".fancybox-inner");
                if (!modal) return null;

                const name = modal.querySelector(".cardName, .name, h2, h3")?.textContent?.trim() || "";

                // Rarity from pipe-separated infoCol
                let rarity = "";
                const infoCol = modal.querySelector(".infoCol, .info_col");
                if (infoCol) {
                    const parts = (infoCol.textContent || "").split("|").map((p: string) => p.trim());
                    if (parts.length >= 2) rarity = parts[1];
                }
                if (!rarity) {
                    const m = (modal.textContent || "").match(/\b(L|SEC|SR|R|UC|C|P)\b/);
                    if (m) rarity = m[1];
                }

                // Image URL → cardNo
                const imgEl = modal.querySelector("img") as HTMLImageElement | null;
                const rawSrc = imgEl?.getAttribute("data-src") || imgEl?.src || "";
                let imageUrl = "";
                if (rawSrc) {
                    try {
                        imageUrl = new URL(rawSrc, window.location.href).href;
                    } catch {
                        imageUrl = rawSrc;
                    }
                    imageUrl = imageUrl.split("?")[0].replace(/_p\d+\./, ".");
                }

                let cardNo = "N/A";
                const filename = imageUrl ? imageUrl.split("/").pop()?.split("?")[0] || "" : "";
                if (filename) {
                    const m = filename.match(/[A-Z]{1,4}\d*-(\d+)/i);
                    if (m) cardNo = m[1];
                }

                return {
                    name,
                    cardNo,
                    rarity,
                    imageUrl,
                    debugFilename: filename,
                };
            });

            // Stop when modal has no valid card data
            if (!details || details.cardNo === "N/A" || !details.rarity) {
                logStep(
                    `[${N}] Invalid data — stopping. (cardNo="${details?.cardNo}", rarity="${details?.rarity}", file="${details?.debugFilename}")`,
                );
                break;
            }

            const { debugFilename, ...cardDetails } = details;
            cards.push({
                ...cardDetails,
                cardUrl,
                isDeepScraped: true,
                isBeingScraped: false,
            });
            logStep(`[${N}/${totalAnchors}] ${details.cardNo}: ${details.name} | Rarity="${details.rarity}"`);

            if (cards.length >= limit) {
                logStep(`Reached card limit (${limit}). Stopping...`);
                break;
            }
            // Close modal before clicking next card
            const closed = await page.evaluate(() => {
                const btn = document.querySelector(
                    ".fancybox-close-small, .fancybox-button--close, [data-fancybox-close]",
                ) as HTMLElement | null;
                if (btn) {
                    btn.click();
                    return true;
                }
                return false;
            });
            if (!closed) await page.keyboard.press("Escape");
            await page.waitForTimeout(CARD_SCRAPER_CONFIG.PAGE_LOAD_DELAY_MS);
        }

        // Dedup by cardNo — variants share the same cardNo as the base card
        const seenNos = new Set<string>();
        const uniqueCards = cards.filter((c) => {
            if (seenNos.has(c.cardNo)) return false;
            seenNos.add(c.cardNo);
            return true;
        });
        const variants = cards.length - uniqueCards.length;

        logStep(`✅ Scraped ${cards.length} cards (${variants} variants skipped).`);
        reportScraperChunk(send, uniqueCards, 0);

        if (collectionId && uniqueCards.length > 0) {
            logStep(`Final Step: Persisting ${uniqueCards.length} cards to database...`);
            const result = await saveScrapedCards(uniqueCards, collectionId);
            if (result) {
                const { addedItems, matchedItems } = result;
                reportScraperStats(send, "cards", result);
                logStep(
                    `✨ Scrape Complete! Saved ${uniqueCards.length} cards — ✅ ${addedItems.length} new, 🔁 ${matchedItems.length} matched.`,
                );
            }
        } else if (cards.length === 0) {
            logStep("Scrape finished with 0 cards.");
        }
    } finally {
        await page.close();
    }
}
