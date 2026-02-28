import { APP_CONFIG } from "@/constants/app";
import { CARD_SCRAPER_CONFIG } from "@/constants/card_scraper";
import { updateScrapedCollectionYear } from "../persistence";
import type { ScraperOptions } from "../types";
import {
    createWorkerUpdater,
    createStepLogger,
    reportScraperStats,
    reportScraperChunk,
    lookupRarity,
} from "../utils";
import { runDeepScraperWorkers, finalizeScraper } from "../scrapingUtils";
import { saveScrapedCards } from "../persistence";

export async function scrapeMTGCards(options: ScraperOptions) {
    const { url, context, send, collectionId, deepScrape, language, cardLimit, franchise } = options;
    const limit = cardLimit ?? CARD_SCRAPER_CONFIG.NUM_SCRAPED_CARDS_PER_COLLECTION;

    const logStep = createStepLogger(send);
    logStep(`Step 1: ${franchise}. Fetching cards...`);

    const isMismatchedSlug = (name: string, url: string) => {
        try {
            const parts = url.split("/");
            const slug = parts[parts.length - 1];
            if (!slug || !isNaN(Number(slug))) return false;

            const cleanedName = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "");
            const cleanedSlug = slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "");

            if (name.includes(" // ")) {
                const sides = name.split(" // ").map((s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, ""));
                return !sides.includes(cleanedSlug);
            }
            return cleanedSlug !== cleanedName;
        } catch {
            return false;
        }
    };

    const updateWorkers = createWorkerUpdater(send);
    const allCards: any[] = [];
    const cardsToDeepScrape: any[] = [];
    const uniqueCardUrls = new Set<string>();
    const discardedItems: any[] = [];
    let totalPages = 50;
    let nextPageIndex = 1;
    let shouldAbort = false;

    const setCodeMatch = url.match(/\/sets\/([A-Za-z0-9]+)/);
    const setCode = setCodeMatch ? setCodeMatch[1].toUpperCase() : "";

    const concurrency = CARD_SCRAPER_CONFIG.CARD_CONCURRENCY_LIMIT;

    const paginationWorker = async (workerId: number) => {
        updateWorkers(1);
        const workerPage = await context.newPage();
        try {
            while (true) {
                if (shouldAbort) break;
                const p = nextPageIndex++;
                if (p > totalPages) break;

                const targetPageUrl = p === 1 ? url : url.includes("?") ? `${url}&page=${p}` : `${url}?page=${p}`;
                try {
                    logStep(`Worker ${workerId} scraping page ${p}: ${targetPageUrl}`);
                    await workerPage.goto(targetPageUrl, {
                        waitUntil: "domcontentloaded",
                        timeout: CARD_SCRAPER_CONFIG.PAGE_LOAD_TIMEOUT,
                    });

                    try {
                        await workerPage.waitForSelector(`a[href^="/${setCode}/"]`, {
                            timeout: CARD_SCRAPER_CONFIG.SELECTOR_WAIT_TIMEOUT,
                        });
                    } catch (e) { }

                    const pageResults = await workerPage.evaluate(
                        ({ sc, langCode }: { sc: string; langCode: string }) => {
                            const pattern = new RegExp(`^/${sc}/([a-z]{2}-[a-z]{2})/(\\d+)/(.+)$`, "i");
                            const links = document.querySelectorAll(`a[href^="/${sc}/"]`);

                            const items = Array.from(links)
                                .map((el) => {
                                    const a = el as HTMLAnchorElement;
                                    const href = a.getAttribute("href") || "";
                                    const match = href.match(pattern);
                                    if (!match) return null;

                                    const [, , cardNo, slug] = match;
                                    const img = a.querySelector("img") as HTMLImageElement | null;
                                    const name = img?.alt?.replace(/ card$/i, "").trim() || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

                                    let finalHref = href;
                                    if (langCode === "jp") finalHref = href.replace("/en-us/", "/ja-jp/");

                                    return {
                                        name,
                                        imageUrl: img?.src || "",
                                        cardUrl: `https://gatherer.wizards.com${finalHref}`,
                                        cardNo,
                                        alt: name,
                                    };
                                })
                                .filter((c): c is NonNullable<typeof c> => c !== null);

                            const releaseDateEl = document.querySelector('[data-testid="setHeaderReleaseDate"]');
                            let releaseYear: number | undefined;
                            if (releaseDateEl) {
                                const dateMatch = releaseDateEl.textContent?.match(/\d{4}/);
                                if (dateMatch) releaseYear = parseInt(dateMatch[0]);
                            }

                            return { items, releaseYear };
                        },
                        { sc: setCode, langCode: language || "en" }
                    );

                    const rawPageCards = pageResults.items;
                    const pageDiscardedItems: any[] = [];
                    const pageCards = rawPageCards.filter((c: any) => {
                        const mismatched = isMismatchedSlug(c.name, c.cardUrl);
                        if (mismatched) pageDiscardedItems.push(c);
                        return !mismatched;
                    });
                    discardedItems.push(...pageDiscardedItems);

                    if (p === 1 && pageResults.releaseYear && collectionId) {
                        await updateScrapedCollectionYear(collectionId, pageResults.releaseYear);
                    }

                    if (pageCards.length === 0 && rawPageCards.length === 0) {
                        totalPages = p - 1;
                        break;
                    }

                    const newCards = pageCards.filter((c: any) => !uniqueCardUrls.has(c.cardUrl));
                    if (newCards.length === 0 && pageCards.length > 0) {
                        shouldAbort = true;
                        break;
                    }
                    newCards.forEach((c: any) => uniqueCardUrls.add(c.cardUrl));

                    const beforeCount = allCards.length;
                    const canAdd = limit - beforeCount;
                    if (canAdd <= 0) {
                        shouldAbort = true;
                        break;
                    }

                    const cardsToAdd = newCards.slice(0, canAdd);
                    const startIndex = beforeCount;
                    allCards.push(...cardsToAdd);

                    logStep(`Worker ${workerId} found ${cardsToAdd.length} cards on page ${p}.`);

                    if (allCards.length >= limit) {
                        logStep(`Reached card limit (${limit}). Stopping all workers...`);
                        shouldAbort = true;
                    }

                    reportScraperChunk(send, cardsToAdd, startIndex);

                    if (collectionId !== undefined && collectionId !== null) {
                        try {
                            const result = await saveScrapedCards(cardsToAdd, collectionId);
                            if (result) {
                                const { addedItems, matchedItems } = result;
                                if (addedItems) cardsToDeepScrape.push(...addedItems);
                                reportScraperStats(send, "cards", {
                                    addedItems,
                                    matchedItems,
                                    discardedItems: pageDiscardedItems,
                                });
                            }
                        } catch (error) {
                            console.error(`Failed to save page ${p} cards:`, error);
                        }
                    }
                } catch (pageErr) {
                    console.error(`[Scraper MTG] Worker ${workerId} failed at page ${p}:`, pageErr);
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

    // Phase 2: Deep Scrape
    if (deepScrape && allCards.length > 0) {
        if (cardsToDeepScrape.length > 0) {
            logStep(`Step 2: ${franchise}. Deep scraping ${cardsToDeepScrape.length} cards...`);
            await runDeepScraperWorkers({
                items: cardsToDeepScrape,
                context,
                send,
                logStep,
                updateWorkers,
                concurrency: Math.min(concurrency, allCards.length),
                timeout: CARD_SCRAPER_CONFIG.CARD_DETAILS_LOAD_TIMEOUT,
                franchiseLabel: "MTG",
                extractFn: () => {
                    const getText = (sel: string) => document.querySelector(sel)?.textContent?.trim() || "";
                    const oracleText = Array.from(document.querySelectorAll("[data-testid='cardDetailsOracleText'], .textbox, [class*='oracleText']")).map(el => el.textContent?.trim()).filter(Boolean).join("\n\n");
                    const flavorText = getText("[data-testid='cardDetailsFlavorText'], .flavortextbox, [class*='flavorText']");
                    const ptEl = document.querySelector("[data-testid='cardDetailsPT']");
                    let pt = ptEl?.textContent?.trim() || "";
                    if (!pt) {
                        const ptLabel = Array.from(document.querySelectorAll(".label")).find((el) => el.textContent?.includes("P/T:"));
                        pt = ptLabel?.nextElementSibling?.textContent?.trim() || "";
                    }
                    const [power, toughness] = pt.includes("/") ? pt.split("/").map((s) => s.trim()) : ["", ""];
                    const typeLine = getText("[data-testid='cardDetailsTypeLine'], .typeLine, [class*='typeLine']");
                    const manaCost = getText("[data-testid='cardDetailsManaCost'], .manaCost, [class*='manaCost']");
                    const rarityText = getText("[data-testid='cardDetailsRarity'], .rarity");
                    const artist = getText("[data-testid='cardDetailsArtist'] a, [data-testid='cardDetailsArtist'], .artist");
                    const imgEl = document.querySelector("[data-testid='cardFrontImage'], #ctl00_ctl00_ctl00_MainContent_SubContent_SubContent_cardImage") as HTMLImageElement | null;
                    const imageUrl = imgEl?.src || "";

                    return { oracleText, flavorText, power, toughness, typeLine, manaCost, rarityText, artist, imageUrl, isDeepScraped: true };
                },
                onResult: (details: any) => {
                    details.rarity = lookupRarity(details.rarityText, APP_CONFIG.MTG_RARITY_MAP);
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
