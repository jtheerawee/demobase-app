import { APP_CONFIG } from "@/constants/app";
import { CARD_SCRAPER_CONFIG } from "@/constants/card_scraper";
import {
    computeMissedCards,
    saveScrapedCards,
    updateScrapedCollectionYear,
} from "../persistence";
import type { ScraperOptions } from "../types";

export async function scrapeMTGCards({
    url,
    context,
    send,
    collectionId,
    deepScrape,
    language,
    cardLimit,
}: ScraperOptions) {
    const limit = cardLimit ?? CARD_SCRAPER_CONFIG.NUM_SCRAPED_CARDS_PER_COLLECTION;
    console.log(
        `[Scraper] Starting MTG card scrape. collectionId:`,
        collectionId,
    );
    send({
        type: "step",
        message: "MTG Gatherer detected. Starting card extraction...",
    });
    let activeWorkers = 0;
    let discardedCount = 0;

    const isMismatchedSlug = (name: string, url: string) => {
        try {
            const parts = url.split("/");
            const slug = parts[parts.length - 1];
            if (!slug || !isNaN(Number(slug))) return false;

            const cleanedName = name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-+|-+$)/g, "");
            const cleanedSlug = slug
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-+|-+$)/g, "");

            // If name is a split card "A // B", check if slug matches either side
            if (name.includes(" // ")) {
                const sides = name.split(" // ").map((s) =>
                    s
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/(^-+|-+$)/g, ""),
                );
                return !sides.includes(cleanedSlug);
            }

            return cleanedSlug !== cleanedName;
        } catch {
            return false;
        }
    };

    const updateWorkers = (delta: number) => {
        activeWorkers += delta;
        send({ type: "workers", count: activeWorkers });
    };

    // Detect if this is a modern /sets/CODE URL
    const isModernSetUrl = /gatherer\.wizards\.com\/sets\/[A-Za-z0-9]+/.test(
        url,
    );

    updateWorkers(1);
    const workerPage = await context.newPage();
    const allCards: any[] = [];
    const cardsToDeepScrape: any[] = [];
    const uniqueCardUrls = new Set<string>();

    try {
        if (isModernSetUrl) {
            // ── Modern set page: paginated card grid ──
            let p = 1;
            while (true) {
                const pageUrl =
                    p === 1
                        ? url
                        : url.includes("?")
                            ? `${url}&page=${p}`
                            : `${url}?page=${p}`;
                send({
                    type: "step",
                    message: `Modern set page: Loading page ${p}...`,
                });

                await workerPage.goto(pageUrl, {
                    waitUntil: "domcontentloaded",
                    timeout: CARD_SCRAPER_CONFIG.PAGE_LOAD_TIMEOUT,
                });

                // Extract the set code from the URL for matching card links
                const setCodeMatch = url.match(/\/sets\/([A-Za-z0-9]+)/);
                const setCode = setCodeMatch
                    ? setCodeMatch[1].toUpperCase()
                    : "";

                // Wait for the card list container to appear
                try {
                    await workerPage.waitForSelector(
                        `a[href^="/${setCode}/"]`,
                        { timeout: CARD_SCRAPER_CONFIG.SELECTOR_WAIT_TIMEOUT },
                    );
                } catch (e: any) {
                    // It's okay if it fails, the evaluate will just return 0 items
                }

                const pageResults = await workerPage.evaluate(
                    ({ sc, langCode }: { sc: string; langCode: string }) => {
                        // Card links follow: /{SET}/{lang}/{cardNo}/{card-slug}
                        const pattern = new RegExp(
                            `^/${sc}/([a-z]{2}-[a-z]{2})/(\\d+)/(.+)$`,
                            "i",
                        );
                        const links = document.querySelectorAll(
                            `a[href^="/${sc}/"]`,
                        );

                        const items = Array.from(links)
                            .map((el) => {
                                const a = el as HTMLAnchorElement;
                                const href = a.getAttribute("href") || "";
                                const match = href.match(pattern);
                                if (!match) return null;

                                const [, , cardNo, slug] = match;
                                const img = a.querySelector(
                                    "img",
                                ) as HTMLImageElement | null;

                                const altText = img?.alt || "";
                                const name =
                                    altText.replace(/ card$/i, "").trim() ||
                                    img?.title?.split(",")[0]?.trim() ||
                                    slug
                                        .replace(/-/g, " ")
                                        .replace(/\b\w/g, (c: string) =>
                                            c.toUpperCase(),
                                        );

                                // If language is JP, replace en-us with ja-jp in the URL
                                let finalHref = href;
                                if (langCode === "jp") {
                                    finalHref = href.replace(
                                        "/en-us/",
                                        "/ja-jp/",
                                    );
                                }

                                const imageUrl = img?.src || "";

                                return {
                                    name,
                                    imageUrl,
                                    cardUrl: `https://gatherer.wizards.com${finalHref}`,
                                    cardNo,
                                    alt: name,
                                };
                            })
                            .filter(
                                (c): c is NonNullable<typeof c> => c !== null,
                            );

                        const releaseDateEl = document.querySelector(
                            '[data-testid="setHeaderReleaseDate"]',
                        );
                        let releaseYear: number | undefined;
                        if (releaseDateEl) {
                            const dateMatch =
                                releaseDateEl.textContent?.match(/\d{4}/);
                            if (dateMatch) releaseYear = parseInt(dateMatch[0]);
                        }

                        return { items, releaseYear };
                    },
                    {
                        sc: setCode,
                        langCode: language || "en",
                    },
                );

                const rawPageCards = pageResults.items;
                const pageDiscardedItems: any[] = [];
                const pageCards = rawPageCards.filter((c: any) => {
                    const mismatched = isMismatchedSlug(c.name, c.cardUrl);
                    if (mismatched) {
                        pageDiscardedItems.push(c);
                    }
                    return !mismatched;
                });
                const pageDiscardedCount = pageDiscardedItems.length;
                discardedCount += pageDiscardedCount;

                const releaseYear = pageResults.releaseYear;

                if (p === 1 && releaseYear && collectionId) {
                    await updateScrapedCollectionYear(
                        collectionId,
                        releaseYear,
                    );
                    send({
                        type: "step",
                        message: `Updated collection release year: ${releaseYear}`,
                    });
                }

                if (pageCards.length === 0 && rawPageCards.length === 0) {
                    send({
                        type: "step",
                        message: `No more cards found for set ${setCode} at page ${p + 1}.`,
                    });
                    break;
                }

                // Check for duplicates to prevent infinite loops if the site repeats data
                const newCards = pageCards.filter(
                    (c: any) => !uniqueCardUrls.has(c.cardUrl),
                );
                if (newCards.length === 0 && pageCards.length > 0) {
                    send({
                        type: "step",
                        message: `Page ${p + 1} returned only duplicate cards. Evolution complete.`,
                    });
                    break;
                }
                newCards.forEach((c: any) => uniqueCardUrls.add(c.cardUrl));

                const beforeCount = allCards.length;
                const canAdd = limit - beforeCount;
                const cardsToAdd = newCards.slice(0, canAdd);

                allCards.push(...cardsToAdd);

                send({
                    type: "step",
                    message: `Found ${cardsToAdd.length} new cards on page ${p}${pageDiscardedCount > 0 ? ` (${pageDiscardedCount} discarded)` : ""}.`,
                });

                // Save this page's cards immediately to get real-time stats
                if (collectionId !== undefined && collectionId !== null) {
                    try {
                        const result = (await saveScrapedCards(
                            cardsToAdd,
                            collectionId,
                        )) as any;
                        if (result) {
                            const { added, matched, addedCards } = result;
                            if (addedCards)
                                cardsToDeepScrape.push(...addedCards);
                            console.log(
                                `[Scraper] Sending incremental card stats for page ${p}:`,
                                {
                                    added,
                                    matched,
                                    discarded: discardedCount,
                                },
                            );
                            send({
                                type: "stats",
                                category: "cards",
                                added,
                                matched,
                                missed: 0,
                                discarded: pageDiscardedCount,
                                discardedItems: pageDiscardedItems,
                            });
                        }
                    } catch (error) {
                        console.error(`Failed to save page ${p} cards:`, error);
                    }
                }

                if (allCards.length >= limit) {
                    send({
                        type: "step",
                        message: `Reached card limit (${limit}). Stopping pagination...`,
                    });
                    break;
                }

                p++;
                if (p > 50) break; // Safety cap
            }
        }

        if (deepScrape && allCards.length > 0) {
            const skipCount = allCards.length - cardsToDeepScrape.length;
            if (skipCount > 0) {
                send({
                    type: "step",
                    message: `Skipping deep scrape for ${skipCount} cards already in database.`,
                });
            }

            if (cardsToDeepScrape.length > 0) {
                // ── Deep Scraping / Details Extraction ──
                send({
                    type: "step",
                    message: `Launching workers to deep scrape ${cardsToDeepScrape.length} new cards...`,
                });
                const concurrency = Math.min(
                    CARD_SCRAPER_CONFIG.CARD_CONCURRENCY_LIMIT,
                    cardsToDeepScrape.length,
                );
                let nextCardIndex = 0;

                const deepScrapeWorker = async (workerId: number) => {
                    updateWorkers(1);
                    const wp = await context.newPage();
                    try {
                        while (true) {
                            const idx = nextCardIndex++;
                            if (idx >= cardsToDeepScrape.length) break;

                            const card = cardsToDeepScrape[idx];
                            try {
                                await wp.goto(card.cardUrl, {
                                    waitUntil: "domcontentloaded",
                                    timeout: CARD_SCRAPER_CONFIG.CARD_DETAILS_LOAD_TIMEOUT,
                                });

                                const details = await wp.evaluate(
                                    (rarityMap: Record<string, string>) => {
                                        // Match both modern and detail layouts
                                        const oracleText = Array.from(
                                            document.querySelectorAll(
                                                "[data-testid='cardDetailsOracleText'], .textbox, [class*='oracleText']",
                                            ),
                                        )
                                            .map((el) => el.textContent?.trim())
                                            .filter(Boolean)
                                            .join("\n\n");

                                        const flavorText =
                                            document
                                                .querySelector(
                                                    "[data-testid='cardDetailsFlavorText'], .flavortextbox, [class*='flavorText']",
                                                )
                                                ?.textContent?.trim() || "";

                                        const ptEl = document.querySelector(
                                            "[data-testid='cardDetailsPT']",
                                        );
                                        let pt =
                                            ptEl?.textContent?.trim() || "";
                                        if (!pt) {
                                            const ptLabel = Array.from(
                                                document.querySelectorAll(
                                                    ".label",
                                                ),
                                            ).find((el) =>
                                                el.textContent?.includes(
                                                    "P/T:",
                                                ),
                                            );
                                            pt =
                                                ptLabel?.nextElementSibling?.textContent?.trim() ||
                                                "";
                                        }
                                        const [power, toughness] = pt.includes(
                                            "/",
                                        )
                                            ? pt.split("/").map((s) => s.trim())
                                            : ["", ""];

                                        const typeEl = document.querySelector(
                                            "[data-testid='cardDetailsTypeLine'], .typeLine, [class*='typeLine']",
                                        );
                                        const typeLine =
                                            typeEl?.textContent?.trim() || "";

                                        const manaCostEl =
                                            document.querySelector(
                                                "[data-testid='cardDetailsManaCost'], .manaCost, [class*='manaCost']",
                                            );
                                        const manaCost =
                                            manaCostEl?.textContent?.trim() ||
                                            "";

                                        const rarityEl = document.querySelector(
                                            "[data-testid='cardDetailsRarity'], .rarity",
                                        );
                                        const rawRarity =
                                            rarityEl?.textContent?.trim() || "";

                                        const rarity =
                                            rarityMap[rawRarity] || rawRarity;

                                        const artistEl = document.querySelector(
                                            "[data-testid='cardDetailsArtist'] a, [data-testid='cardDetailsArtist'], .artist",
                                        );
                                        const artist =
                                            artistEl?.textContent?.trim() || "";

                                        // Extract the localized image URL
                                        const imgEl = document.querySelector(
                                            "[data-testid='cardFrontImage'], #ctl00_ctl00_ctl00_MainContent_SubContent_SubContent_cardImage",
                                        ) as HTMLImageElement | null;
                                        const imageUrl = imgEl?.src || "";

                                        return {
                                            oracleText,
                                            flavorText,
                                            power,
                                            toughness,
                                            typeLine,
                                            manaCost,
                                            rarity,
                                            artist,
                                            imageUrl,
                                        };
                                    },
                                    APP_CONFIG.MTG_RARITY_MAP,
                                );

                                Object.assign(card, details);
                                send({
                                    type: "chunk",
                                    items: [card],
                                    startIndex: idx,
                                });
                            } catch (err) {
                                console.error(
                                    `[Worker ${workerId}] Failed: ${card.name}`,
                                    err,
                                );
                            }
                        }
                    } finally {
                        await wp.close();
                        updateWorkers(-1);
                    }
                };

                const workers = Array.from({ length: concurrency }, (_, i) =>
                    deepScrapeWorker(i + 1),
                );
                await Promise.all(workers);

                // Final Save: persist only deep-scraped details to prevent overwriting existing data with sparse objects
                if (collectionId !== undefined && collectionId !== null) {
                    send({
                        type: "step",
                        message: "Finalizing card details in database...",
                    });
                    try {
                        const result = await saveScrapedCards(
                            cardsToDeepScrape,
                            collectionId,
                        );
                        if (result) {
                            send({
                                type: "stats",
                                category: "cards",
                                added: 0,
                                matched: 0,
                                missed: 0,
                            });
                            const allCardUrls = new Set(
                                allCards
                                    .map((c: any) => c.cardUrl)
                                    .filter(Boolean),
                            );
                            const missed = await computeMissedCards(
                                allCardUrls,
                                collectionId,
                            );
                            if (missed > 0) {
                                send({
                                    type: "step",
                                    message: `⚠️ ${missed} cards are in DB but were not found in this scrape.`,
                                });
                            }
                            send({
                                type: "stats",
                                category: "cards",
                                added: 0,
                                matched: 0,
                                missed,
                                discarded: 0, // already reported incrementally
                            });
                        }
                    } catch (error) {
                        console.error("Failed to save cards:", error);
                    }
                }
            }
        }

        send({
            type: "step",
            message: `Total extracted: ${allCards.length} cards.${discardedCount > 0 ? ` (${discardedCount} discarded)` : ""}`,
        });
        send({
            type: "meta",
            totalItems: allCards.length,
            totalPages: 1,
        });
    } finally {
        await workerPage.close();
        updateWorkers(-1);
    }
}
