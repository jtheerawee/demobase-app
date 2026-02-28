import { APP_CONFIG } from "@/constants/app";
import { CARD_SCRAPER_CONFIG } from "@/constants/card_scraper";
import { saveScrapedCards } from "@/services/scraper/persistence";
import { type ScraperOptions } from "@/services/scraper/types";
import {
    createWorkerUpdater,
    createStepLogger,
    reportScraperStats,
    reportScraperChunk,
    lookupRarity,
} from "@/services/scraper/utils";
import { runDeepScraperWorkers, finalizeScraper } from "@/services/scraper/scrapingUtils";

export async function scrapePokemonCardsEn({
    url,
    context,
    send,
    deepScrape,
    collectionId,
    cardLimit,
    franchise,
}: ScraperOptions) {
    const limit = cardLimit ?? CARD_SCRAPER_CONFIG.NUM_SCRAPED_CARDS_PER_COLLECTION;
    const allCards: any[] = [];
    let totalPages = Infinity;
    let nextPageIndex = 1;
    const discardedItems: any[] = [];

    const getTargetUrl = (p: number) => {
        if (url.includes("page=")) return url.replace(/page=\d+/, `page=${p}`);
        return url.includes("?") ? `${url}&page=${p}` : `${url}?page=${p}`;
    };

    let shouldAbort = false;
    const concurrency = CARD_SCRAPER_CONFIG.CARD_CONCURRENCY_LIMIT;

    const logStep = createStepLogger(send);

    logStep(`Step 1: ${franchise}. Fetching cards...`);

    const updateWorkers = createWorkerUpdater(send);

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
                    logStep(`Worker ${workerId} scraping page ${p}: ${targetPageUrl}`);
                    await workerPage.goto(targetPageUrl, {
                        waitUntil: "networkidle",
                        timeout: CARD_SCRAPER_CONFIG.PAGE_LOAD_TIMEOUT,
                    });
                    if (shouldAbort || p > totalPages) break;

                    await workerPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
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
                            const allLinks = Array.from(document.querySelectorAll("a"));
                            cardElements = allLinks.filter(
                                (a) => a.querySelector("img") && a.href.includes("/pokemon-cards/"),
                            );
                        }

                        const items = cardElements.map((el) => {
                            const img = el.querySelector("img");
                            const anchor = (el.tagName === "A" ? el : el.querySelector("a")) as HTMLAnchorElement;
                            const imageUrl = img?.src || "";
                            const absoluteImageUrl = imageUrl.startsWith("http")
                                ? imageUrl
                                : window.location.origin + (imageUrl.startsWith("/") ? "" : "/") + imageUrl;
                            const link = anchor?.getAttribute("href") || "";
                            const absoluteLink = link.startsWith("http")
                                ? link
                                : window.location.origin + (link.startsWith("/") ? "" : "/") + link;

                            // Extract set/number from URL: .../series/ex1/13/
                            let cardNo = "";
                            const urlMatch = absoluteLink.match(/\/series\/(.+?)\/(.+?)\//);
                            if (urlMatch) {
                                cardNo = urlMatch[2];
                            } else {
                                // Fallback: try extract from filename if e.g. EX1_EN_1.png
                                const fileMatch = absoluteImageUrl.match(/_(\d+)\.png$/);
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
                            if (pageText.includes("Request unsuccessful") || document.title.includes("Access Denied")) {
                                return {
                                    items: [],
                                    discoveredTotal: 0,
                                    error: "Bot detection block detected (Incapsula/Access Denied).",
                                };
                            }
                        }

                        const match = pageText.match(/Page \d+ of (\d+)/i) || pageText.match(/of (\d+) results/i);
                        if (match) discoveredTotal = parseInt(match[1], 10);

                        return { items, discoveredTotal };
                    };

                    try {
                        pageData = await workerPage.evaluate(extractFn);
                    } catch (evalErr: any) {
                        if (evalErr.message.includes("Execution context was destroyed")) {
                            logStep(`Worker ${workerId} context destroyed. Retrying...`);
                            await workerPage.waitForTimeout(2000);
                            pageData = await workerPage.evaluate(extractFn);
                        } else {
                            throw evalErr;
                        }
                    }

                    if (pageData.error) {
                        logStep(`ERROR: ${pageData.error}`);
                        shouldAbort = true;
                        break;
                    }

                    if (pageData.items.length === 0) {
                        if (p === 1) {
                            shouldAbort = true;
                            totalPages = 0;
                        } else if (p < totalPages) {
                            totalPages = p - 1;
                        }
                        break;
                    }

                    if (pageData.discoveredTotal > 0 && totalPages === Infinity) {
                        totalPages = pageData.discoveredTotal;
                    }

                    const beforeCount = allCards.length;
                    const canAdd = limit - beforeCount;

                    if (canAdd <= 0) {
                        shouldAbort = true;
                        break;
                    }

                    const cardsToAdd = pageData.items.slice(0, canAdd);
                    const startIndex = beforeCount;
                    allCards.push(...cardsToAdd);

                    logStep(`Worker ${workerId} found ${cardsToAdd.length} cards on page ${p}.`);

                    if (allCards.length >= limit) {
                        logStep(`Reached card limit (${limit}). Stopping all workers...`);
                        shouldAbort = true;
                    }
                    reportScraperChunk(send, cardsToAdd, startIndex);

                    // Save this page's cards immediately to get real-time stats
                    if (collectionId !== undefined && collectionId !== null) {
                        try {
                            const result = await saveScrapedCards(cardsToAdd, collectionId);
                            if (result) {
                                reportScraperStats(send, "cards", result);
                            }
                        } catch (error) {
                            console.error(`Failed to save page ${p} cards:`, error);
                        }
                    }
                } catch (pageErr) {
                    console.error(`[Scraper En] Worker ${workerId} failed at page ${p}:`, pageErr);
                    logStep(`Worker ${workerId} failed at page ${p}. Retrying...`);
                }
            }
        } finally {
            await workerPage.close();
            updateWorkers(-1);
        }
    };

    const paginationWorkers = Array.from({ length: concurrency }, async (_, i) => {
        const workerId = i + 1;
        if (i > 0) await new Promise((r) => setTimeout(r, i * 150));
        if (shouldAbort) return;
        return paginationWorker(workerId);
    });
    await Promise.all(paginationWorkers);

    // Phase 2: Deep Scrape Phase
    if (deepScrape && allCards.length > 0) {
        const cardsToDeepScrape = allCards.filter(
            (c) => c.cardUrl && (!c.isDeepScraped || !c.rarity || !c.cardNo || c.cardNo === "N/A"),
        );

        if (cardsToDeepScrape.length > 0) {
            logStep(`Step 2: ${franchise}. Deep scraping ${cardsToDeepScrape.length} cards...`);

            await runDeepScraperWorkers({
                items: allCards,
                context,
                send,
                logStep,
                updateWorkers,
                concurrency: Math.min(concurrency, allCards.length),
                timeout: CARD_SCRAPER_CONFIG.CARD_DETAILS_LOAD_TIMEOUT,
                franchiseLabel: "Pokémon",
                extractFn: () => {
                    const getText = (sel: string) => document.querySelector(sel)?.textContent?.trim() || "";
                    const h1 =
                        document.querySelector("h1") ||
                        document.querySelector(".p-cardDetail__header h1") ||
                        document.querySelector(".pageHeader.cardDetail") ||
                        document.querySelector(".card-description h1");

                    let name = "";
                    if (h1) {
                        const clone = h1.cloneNode(true) as HTMLElement;
                        clone.querySelectorAll(".evolveMarker").forEach((el) => el.remove());
                        name = clone.textContent?.trim() || "";
                    }

                    const imgEl = document.querySelector(".card-image img") as HTMLImageElement | null;
                    const imageUrl = (imgEl as any)?.targetSrc || imgEl?.src || "";
                    const setEl = document.querySelector(".stats-footer a");
                    const setName = setEl?.textContent?.trim() || "";

                    let collectorNumber = "";
                    let rarityRaw: string | null = null;
                    const statsText = getText(".stats-footer span") || "";
                    if (statsText.includes("/")) {
                        const parts = statsText.split("/");
                        collectorNumber = parts[0].trim();
                        const rest = parts[1].trim();
                        const rarityMatch = rest.match(/^\d+\s+(.*)$/);
                        rarityRaw = rarityMatch ? rarityMatch[1].trim() : rest;
                    } else {
                        collectorNumber = statsText || "N/A";
                    }

                    if (!collectorNumber || collectorNumber === "N/A") {
                        const urlMatch = window.location.pathname.match(/\/series\/(.+?)\/(.+?)\//);
                        if (urlMatch) collectorNumber = urlMatch[2];
                    }

                    return { name, cardNo: collectorNumber, rarityRaw, imageUrl, setName, isDeepScraped: true };
                },
                onResult: (details: any) => {
                    if (details.rarityRaw && details.rarityRaw !== "N/A") {
                        details.rarity = lookupRarity(details.rarityRaw, APP_CONFIG.POKEMON_RARITY_MAP);
                    } else {
                        details.rarity = null;
                    }
                }
            });
        }
    }

    await finalizeScraper({
        allCards,
        collectionId,
        franchise,
        send,
        logStep,
        updateWorkers,
    });
}
