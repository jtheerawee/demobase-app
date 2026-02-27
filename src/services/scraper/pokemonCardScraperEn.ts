import { APP_CONFIG } from "@/constants/app";
import { saveScrapedCards } from "@/services/scraper/persistence";
import type { ScraperOptions } from "@/services/scraper/types";

// ==========================================
// ENGLISH (EN) CARD SCRAPER LOGIC
// ==========================================

export async function scrapePokemonCardsEn({
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

    const getTargetUrl = (p: number) => {
        if (url.includes("page=")) return url.replace(/page=\d+/, `page=${p}`);
        return url.includes("?") ? `${url}&page=${p}` : `${url}?page=${p}`;
    };

    let shouldAbort = false;
    const concurrency = APP_CONFIG.CARD_CONCURRENCY_LIMIT;

    send({
        type: "step",
        message: `Initializing ${concurrency} parallel pagination workers for English site...`,
    });

    let activeWorkers = 0;
    const updateWorkers = (delta: number) => {
        activeWorkers += delta;
        send({ type: "workers", count: activeWorkers });
    };

    const paginationWorker = async (workerId: number) => {
        updateWorkers(1);
        const workerPage = await context.newPage();
        try {
            while (true) {
                if (shouldAbort) break;
                const p = nextPageIndex++;
                if (p > totalPages) break;

                const targetPageUrl = getTargetUrl(p);
                try {
                    send({
                        type: "step",
                        message: `Worker ${workerId} scraping page ${p}: ${targetPageUrl}`,
                    });
                    await workerPage.goto(targetPageUrl, {
                        waitUntil: "networkidle",
                        timeout: 45000,
                    });
                    if (shouldAbort || p > totalPages) break;

                    await workerPage.evaluate(() =>
                        window.scrollTo(0, document.body.scrollHeight),
                    );
                    await workerPage.waitForTimeout(2000);

                    // Extraction with retry for navigation/destruction errors
                    let pageData: any;
                    const extractFn = () => {
                        const selectors = [
                            "ul.cards-gallery li",
                            ".card-list li",
                            "section.results li",
                            ".card-gallery li",
                        ];
                        let cardElements: Element[] = [];

                        for (const sel of selectors) {
                            const found = document.querySelectorAll(sel);
                            if (found.length > 0) {
                                cardElements = Array.from(found);
                                break;
                            }
                        }

                        if (cardElements.length === 0) {
                            const allLinks = Array.from(
                                document.querySelectorAll("a"),
                            );
                            cardElements = allLinks.filter(
                                (a) =>
                                    a.querySelector("img") &&
                                    a.href.includes("/pokemon-cards/"),
                            );
                        }

                        const items = cardElements.map((el) => {
                            const img = el.querySelector("img");
                            const anchor = (
                                el.tagName === "A" ? el : el.querySelector("a")
                            ) as HTMLAnchorElement;
                            const imageUrl = img?.src || "";
                            const absoluteImageUrl = imageUrl.startsWith("http")
                                ? imageUrl
                                : window.location.origin +
                                (imageUrl.startsWith("/") ? "" : "/") +
                                imageUrl;
                            const link = anchor?.getAttribute("href") || "";
                            const absoluteLink = link.startsWith("http")
                                ? link
                                : window.location.origin +
                                (link.startsWith("/") ? "" : "/") +
                                link;

                            // Extract set/number from URL: .../series/ex1/13/
                            let cardNo = "";
                            const urlMatch = absoluteLink.match(
                                /\/series\/(.+?)\/(.+?)\//,
                            );
                            if (urlMatch) {
                                cardNo = urlMatch[2];
                            } else {
                                // Fallback: try extract from filename if e.g. EX1_EN_1.png
                                const fileMatch =
                                    absoluteImageUrl.match(/_(\d+)\.png$/);
                                if (fileMatch) cardNo = fileMatch[1];
                            }

                            return {
                                imageUrl: absoluteImageUrl,
                                alt: img?.alt || "Pokemon Card",
                                name: img?.alt || "Pokemon Card",
                                cardUrl: absoluteLink,
                                cardNo,
                            };
                        });

                        let discoveredTotal = 0;
                        const pageText = document.body.innerText;

                        if (items.length === 0) {
                            if (
                                pageText.includes("Request unsuccessful") ||
                                document.title.includes("Access Denied")
                            ) {
                                return {
                                    items: [],
                                    discoveredTotal: 0,
                                    error: "Bot detection block detected (Incapsula/Access Denied).",
                                };
                            }
                        }

                        const match =
                            pageText.match(/Page \d+ of (\d+)/i) ||
                            pageText.match(/of (\d+) results/i);
                        if (match) discoveredTotal = parseInt(match[1], 10);

                        return { items, discoveredTotal };
                    };

                    try {
                        pageData = await workerPage.evaluate(extractFn);
                    } catch (evalErr: any) {
                        if (
                            evalErr.message.includes(
                                "Execution context was destroyed",
                            )
                        ) {
                            send({
                                type: "step",
                                message: `Worker ${workerId} context destroyed. Retrying...`,
                            });
                            await workerPage.waitForTimeout(2000);
                            pageData = await workerPage.evaluate(extractFn);
                        } else {
                            throw evalErr;
                        }
                    }

                    if (pageData.error) {
                        send({
                            type: "step",
                            message: `ERROR: ${pageData.error}`,
                        });
                        shouldAbort = true;
                        break;
                    }

                    if (pageData.items.length === 0) {
                        if (p === 1) {
                            shouldAbort = true;
                            totalPages = 0;
                            send({
                                type: "meta",
                                totalPages: 0,
                                totalCards: 0,
                            });
                        } else if (p < totalPages) {
                            totalPages = p - 1;
                            send({ type: "meta", totalPages });
                        }
                        break;
                    }

                    if (
                        pageData.discoveredTotal > 0 &&
                        totalPages === Infinity
                    ) {
                        totalPages = pageData.discoveredTotal;
                        send({ type: "meta", totalPages });
                    }

                    const beforeCount = sharedCardList.length;
                    const canAdd = limit - beforeCount;

                    if (canAdd <= 0) {
                        shouldAbort = true;
                        break;
                    }

                    const cardsToAdd = pageData.items.slice(0, canAdd);
                    const startIndex = beforeCount;
                    sharedCardList.push(...cardsToAdd);

                    send({
                        type: "step",
                        message: `Worker ${workerId} found ${cardsToAdd.length} cards on page ${p}.`,
                    });

                    if (sharedCardList.length >= limit) {
                        send({
                            type: "step",
                            message: `Reached card limit (${limit}). Stopping all workers...`,
                        });
                        shouldAbort = true;
                    }
                    send({ type: "chunk", items: cardsToAdd, startIndex });
                } catch (pageErr) {
                    console.error(
                        `[Scraper En] Worker ${workerId} failed at page ${p}:`,
                        pageErr,
                    );
                    send({
                        type: "step",
                        message: `Worker ${workerId} failed at page ${p}. Retrying...`,
                    });
                }
            }
        } finally {
            await workerPage.close();
            updateWorkers(-1);
        }
    };

    const paginationWorkers = Array.from(
        { length: concurrency },
        async (_, i) => {
            const workerId = i + 1;
            if (i > 0) await new Promise((r) => setTimeout(r, i * 150));
            if (shouldAbort) return;
            return paginationWorker(workerId);
        },
    );
    await Promise.all(paginationWorkers);

    // Deep Scrape Phase (English)
    if (deepScrape && sharedCardList.length > 0) {
        const totalCards = sharedCardList.length;
        send({
            type: "step",
            message: `Starting deep scrape for ${totalCards} English cards...`,
        });

        const deepWorker = async (workerId: number) => {
            updateWorkers(1);
            const workerPage = await context.newPage();
            try {
                while (true) {
                    const cardIndex = sharedCardList.findIndex(
                        (c) =>
                            c.cardUrl && !c.isDeepScraped && !c.isBeingScraped,
                    );
                    if (cardIndex === -1) break;

                    const card = sharedCardList[cardIndex];
                    card.isBeingScraped = true;

                    try {
                        send({
                            type: "step",
                            message: `Deep scraping card ${cardIndex + 1}/${totalCards}: ${card.name}`,
                        });

                        // Robust goto with retry for English detail pages
                        let success = false;
                        for (let attempt = 1; attempt <= 2; attempt++) {
                            try {
                                await workerPage.goto(card.cardUrl, {
                                    waitUntil: "networkidle",
                                    timeout: 60000,
                                });
                                success = true;
                                break;
                            } catch (gotoErr) {
                                if (attempt === 2) throw gotoErr;
                                send({
                                    type: "step",
                                    message: `Worker ${workerId} timeout on card ${cardIndex + 1}. Retrying...`,
                                });
                                await workerPage.waitForTimeout(2000);
                            }
                        }

                        if (!success)
                            throw new Error("Failed to navigate after retries");

                        const details = await workerPage.evaluate(() => {
                            const getText = (sel: string) =>
                                document
                                    .querySelector(sel)
                                    ?.textContent?.trim() || "";

                            // Identification
                            const h1 =
                                document.querySelector("h1") ||
                                document.querySelector(
                                    ".p-cardDetail__header h1",
                                ) ||
                                document.querySelector(
                                    ".pageHeader.cardDetail",
                                ) ||
                                document.querySelector(".card-description h1");

                            let name = "";
                            if (h1) {
                                const clone = h1.cloneNode(true) as HTMLElement;
                                clone
                                    .querySelectorAll(".evolveMarker")
                                    .forEach((el) => el.remove());
                                name = clone.textContent?.trim() || "";
                            }

                            let collectorNumber = "";
                            let rarity = "N/A";
                            const statsText =
                                getText(".stats-footer span") || "";
                            if (statsText.includes("/")) {
                                const parts = statsText.split("/");
                                collectorNumber = parts[0].trim();
                                const rest = parts[1].trim();
                                // Pattern: "109 Rare Holo" -> rarity: "Rare Holo"
                                const rarityMatch = rest.match(/^\d+\s+(.*)$/);
                                rarity = rarityMatch
                                    ? rarityMatch[1].trim()
                                    : rest;
                            } else {
                                collectorNumber = statsText || "N/A";
                            }

                            // Final extraction from URL fallback if still empty
                            if (!collectorNumber || collectorNumber === "N/A") {
                                const urlMatch = window.location.pathname.match(
                                    /\/series\/(.+?)\/(.+?)\//,
                                );
                                if (urlMatch) collectorNumber = urlMatch[2];
                            }

                            return {
                                name,
                                cardNo: collectorNumber,
                                rarity,
                                isDeepScraped: true,
                            };
                        });

                        // Map rarity to code
                        if (details.rarity) {
                            details.rarity = APP_CONFIG.POKEMON_RARITY_MAP[details.rarity] || details.rarity;
                        }

                        Object.assign(card, details);
                        card.isBeingScraped = false;
                        send({ type: "cardUpdate", index: cardIndex, details });
                    } catch (e) {
                        card.isBeingScraped = false;
                        console.error(
                            `Failed to deep scrape English card ${cardIndex}:`,
                            e,
                        );
                    }
                }
            } finally {
                await workerPage.close();
                updateWorkers(-1);
            }
        };

        const workers = Array.from(
            { length: Math.min(concurrency, sharedCardList.length) },
            async (_, i) => {
                const workerId = i + 1;
                if (i > 0) await new Promise((r) => setTimeout(r, i * 150));
                return deepWorker(workerId);
            },
        );
        await Promise.all(workers);
    }

    if (collectionId && sharedCardList.length > 0) {
        send({ type: "step", message: "Saving English cards to database..." });
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
                    message: `Successfully saved ${sharedCardList.length} English cards — ✅ ${added} new, 🔁 ${matched} matched.`,
                });
            }
        } catch (error) {
            console.error("Failed to save English cards:", error);
            send({
                type: "step",
                message: "Warning: Failed to persist cards to database.",
            });
        }
    }
}
