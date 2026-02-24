import { APP_CONFIG } from "@/constants/app";
import { saveScrapedCards, saveScrapedCollections, computeMissedCollections, computeMissedCards } from "./persistence";
import type { ScraperOptions } from "./types";

export async function scrapeMTGCards({ url, context, send, collectionId, deepScrape }: ScraperOptions) {
    console.log(`[Scraper] Starting MTG card scrape. collectionId:`, collectionId);
    send({ type: "step", message: "MTG Gatherer detected. Starting card extraction..." });
    let activeWorkers = 0;
    const updateWorkers = (delta: number) => {
        activeWorkers += delta;
        send({ type: "workers", count: activeWorkers });
    };

    // Detect if this is a modern /sets/CODE URL
    const isModernSetUrl = /gatherer\.wizards\.com\/sets\/[A-Za-z0-9]+/.test(url);

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
                const pageUrl = p === 1 ? url : (url.includes("?") ? `${url}&page=${p}` : `${url}?page=${p}`);
                send({ type: "step", message: `Modern set page: Loading page ${p}...` });

                await workerPage.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

                // Extract the set code from the URL for matching card links
                const setCodeMatch = url.match(/\/sets\/([A-Za-z0-9]+)/);
                const setCode = setCodeMatch ? setCodeMatch[1].toUpperCase() : "";

                // Wait for the card list container to appear
                try {
                    await workerPage.waitForSelector(`a[href^="/${setCode}/"]`, { timeout: 5000 });
                } catch (e: any) {
                    // It's okay if it fails, the evaluate will just return 0 items
                }

                const pageResults = await workerPage.evaluate((sc: string) => {
                    // Card links follow: /{SET}/{lang}/{cardNo}/{card-slug}
                    const pattern = new RegExp(`^/${sc}/([a-z]{2}-[a-z]{2})/(\\d+)/(.+)$`, "i");
                    const links = document.querySelectorAll(`a[href^="/${sc}/"]`);

                    const items = Array.from(links)
                        .map((el) => {
                            const a = el as HTMLAnchorElement;
                            const href = a.getAttribute("href") || "";
                            const match = href.match(pattern);
                            if (!match) return null;

                            const [, lang, cardNo, slug] = match;
                            const img = a.querySelector("img") as HTMLImageElement | null;

                            const altText = img?.alt || "";
                            const name = altText.replace(/ card$/i, "").trim()
                                || img?.title?.split(",")[0]?.trim()
                                || slug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

                            const imageUrl = img?.src || "";

                            return {
                                name,
                                imageUrl,
                                cardUrl: `https://gatherer.wizards.com${href}`,
                                cardNo,
                                alt: name,
                            };
                        })
                        .filter((c): c is NonNullable<typeof c> => c !== null);

                    return { items };
                }, setCode);

                const pageCards = pageResults.items;

                if (pageCards.length === 0) {
                    send({ type: "step", message: `No more cards found for set ${setCode} at page ${p + 1}.` });
                    break;
                }

                // Check for duplicates to prevent infinite loops if the site repeats data
                const newCards = pageCards.filter((c: any) => !uniqueCardUrls.has(c.cardUrl));
                if (newCards.length === 0) {
                    send({ type: "step", message: `Page ${p + 1} returned only duplicate cards. Evolution complete.` });
                    break;
                }
                newCards.forEach((c: any) => uniqueCardUrls.add(c.cardUrl));

                send({ type: "step", message: `Found ${newCards.length} new cards on page ${p}.` });
                allCards.push(...newCards);

                // Save this page's cards immediately to get real-time stats
                if (collectionId !== undefined && collectionId !== null) {
                    try {
                        const result = await saveScrapedCards(newCards, collectionId) as any;
                        if (result) {
                            const { added, matched, addedCards } = result;
                            if (addedCards) cardsToDeepScrape.push(...addedCards);
                            console.log(`[Scraper] Sending incremental card stats for page ${p}:`, { added, matched });
                            send({ type: "stats", category: "cards", added, matched, missed: 0 });
                        }
                    } catch (error) {
                        console.error(`Failed to save page ${p} cards:`, error);
                    }
                }

                p++;
                if (p > 50) break; // Safety cap
            }
        } else {
            // ── Legacy checklist view: paginated table ──
            let p = 1;
            while (true) {
                const pageUrl = p === 1
                    ? (url.includes("output=checklist") ? url : (url.includes("?") ? `${url}&output=checklist` : `${url}?output=checklist`))
                    : (url.includes("output=checklist")
                        ? (url.includes("?") ? `${url}&page=${p}` : `${url}?page=${p}`)
                        : (url.includes("?")
                            ? `${url}&output=checklist&page=${p}`
                            : `${url}?output=checklist&page=${p}`));

                send({ type: "step", message: `Navigating to cards page ${p}: ${pageUrl}` });
                await workerPage.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

                try {
                    await workerPage.waitForSelector("tr.cardItem", { timeout: 5000 });
                } catch (e: any) {
                    // Empty page at the end of collection
                }

                const pageCardsRaw = await workerPage.evaluate(() => {
                    const rows = document.querySelectorAll("tr.cardItem");
                    if (rows.length === 0) return [];

                    const headers = Array.from(document.querySelectorAll("tr.header th")).map(th => th.textContent?.trim().toLowerCase());

                    const noIdx = headers.indexOf("no.");
                    const nameIdx = headers.indexOf("name");
                    const manaIdx = headers.indexOf("mana cost");
                    const cmcIdx = headers.indexOf("cmc");
                    const typeIdx = headers.indexOf("type");
                    const artistIdx = headers.indexOf("artist");
                    const setIdx = headers.indexOf("set");

                    return Array.from(rows).map((row) => {
                        const cells = row.querySelectorAll("td");

                        const nameLink = (nameIdx !== -1 ? cells[nameIdx].querySelector("a") : row.querySelector("td.name a")) as HTMLAnchorElement;
                        const name = nameLink?.textContent?.trim() || "Unknown Card";
                        const href = nameLink?.href || "";

                        const midMatch = href.match(/multiverseid=(\d+)/);
                        const mid = midMatch ? midMatch[1] : "";

                        const cardNo = noIdx !== -1 ? cells[noIdx].textContent?.trim() : "";
                        const manaValueExtracted = cmcIdx !== -1 ? cells[cmcIdx].textContent?.trim() : "";
                        const typeLine = typeIdx !== -1 ? cells[typeIdx].textContent?.trim() : "";
                        const artist = artistIdx !== -1 ? cells[artistIdx].textContent?.trim() : "";

                        const setIcon = setIdx !== -1 ? cells[setIdx].querySelector("img") : row.querySelector("td.set img");
                        const rarity = setIcon?.getAttribute("title")?.split("(")[1]?.replace(")", "") || "";

                        const manaCostCells = manaIdx !== -1 ? cells[manaIdx] : row.querySelector("td.manaCost");
                        const manaCost = Array.from(manaCostCells?.querySelectorAll("img") || [])
                            .map(img => img.getAttribute("alt")?.trim())
                            .filter(Boolean)
                            .join("");

                        return {
                            name,
                            imageUrl: mid
                                ? `https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=${mid}&type=card`
                                : `https://gatherer.wizards.com/Handlers/Image.ashx?type=card&name=${encodeURIComponent(name)}`,
                            cardUrl: mid ? `https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=${mid}` : href,
                            rarity,
                            manaCost,
                            manaValue: manaValueExtracted ? parseInt(manaValueExtracted) : undefined,
                            typeLine,
                            artist,
                            cardNo,
                            alt: name
                        };
                    });
                });

                if (pageCardsRaw.length === 0) {
                    send({ type: "step", message: `No more cards found at page ${p}.` });
                    break;
                }

                const newCards = pageCardsRaw.filter((c: any) => !uniqueCardUrls.has(c.cardUrl));
                if (newCards.length === 0) {
                    send({ type: "step", message: `Page ${p} returned only duplicate cards. Evolution complete.` });
                    break;
                }
                newCards.forEach((c: any) => uniqueCardUrls.add(c.cardUrl));

                send({ type: "step", message: `Found ${newCards.length} new cards on page ${p}.` });
                allCards.push(...newCards);

                // Save this page's cards immediately to get real-time stats
                if (collectionId !== undefined && collectionId !== null) {
                    try {
                        const result = await saveScrapedCards(newCards, collectionId) as any;
                        if (result) {
                            const { added, matched, addedCards } = result;
                            if (addedCards) cardsToDeepScrape.push(...addedCards);
                            console.log(`[Scraper] Sending incremental card stats for page ${p}:`, { added, matched });
                            send({ type: "stats", category: "cards", added, matched, missed: 0 });
                        }
                    } catch (error) {
                        console.error(`Failed to save page ${p} cards:`, error);
                    }
                }

                p++;
                if (p > 50) break;
            }
        }

        if (deepScrape && allCards.length > 0) {
            const skipCount = allCards.length - cardsToDeepScrape.length;
            if (skipCount > 0) {
                send({ type: "step", message: `Skipping deep scrape for ${skipCount} cards already in database.` });
            }

            if (cardsToDeepScrape.length > 0) {
                // ── Deep Scraping / Details Extraction ──
                send({ type: "step", message: `Launching workers to deep scrape ${cardsToDeepScrape.length} new cards...` });
                const concurrency = Math.min(APP_CONFIG.CARD_CONCURRENCY_LIMIT || 10, cardsToDeepScrape.length);
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
                                await wp.goto(card.cardUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

                                const details = await wp.evaluate(() => {
                                    // Match both modern and detail layouts
                                    const oracleText = Array.from(document.querySelectorAll("[data-testid='cardDetailsOracleText'], .textbox, [class*='oracleText']"))
                                        .map(el => el.textContent?.trim())
                                        .filter(Boolean)
                                        .join("\n\n");

                                    const flavorText = document.querySelector("[data-testid='cardDetailsFlavorText'], .flavortextbox, [class*='flavorText']")?.textContent?.trim() || "";

                                    const ptEl = document.querySelector("[data-testid='cardDetailsPT']");
                                    let pt = ptEl?.textContent?.trim() || "";
                                    if (!pt) {
                                        const ptLabel = Array.from(document.querySelectorAll(".label")).find(el => el.textContent?.includes("P/T:"));
                                        pt = ptLabel?.nextElementSibling?.textContent?.trim() || "";
                                    }
                                    const [power, toughness] = pt.includes("/") ? pt.split("/").map(s => s.trim()) : ["", ""];

                                    const typeEl = document.querySelector("[data-testid='cardDetailsTypeLine'], .typeLine, [class*='typeLine']");
                                    const typeLine = typeEl?.textContent?.trim() || "";

                                    const manaCostEl = document.querySelector("[data-testid='cardDetailsManaCost'], .manaCost, [class*='manaCost']");
                                    const manaCost = manaCostEl?.textContent?.trim() || "";

                                    const rarityEl = document.querySelector("[data-testid='cardDetailsRarity'], .rarity");
                                    const rarity = rarityEl?.textContent?.trim() || "";

                                    const artistEl = document.querySelector("[data-testid='cardDetailsArtist'] a, [data-testid='cardDetailsArtist'], .artist");
                                    const artist = artistEl?.textContent?.trim() || "";

                                    return { oracleText, flavorText, power, toughness, typeLine, manaCost, rarity, artist };
                                });

                                Object.assign(card, details);
                                send({ type: "chunk", items: [card], startIndex: idx });
                            } catch (err) {
                                console.error(`[Worker ${workerId}] Failed: ${card.name}`, err);
                            }
                        }
                    } finally {
                        await wp.close();
                        updateWorkers(-1);
                    }
                };

                const workers = Array.from({ length: concurrency }, (_, i) => deepScrapeWorker(i + 1));
                await Promise.all(workers);

                // Final Save: persist only deep-scraped details to prevent overwriting existing data with sparse objects
                if (collectionId !== undefined && collectionId !== null) {
                    send({ type: "step", message: "Finalizing card details in database..." });
                    try {
                        const result = await saveScrapedCards(cardsToDeepScrape, collectionId);
                        if (result) {
                            send({ type: "stats", category: "cards", added: 0, matched: 0, missed: 0 });
                            const allCardUrls = new Set(allCards.map((c: any) => c.cardUrl).filter(Boolean));
                            const missed = await computeMissedCards(allCardUrls, collectionId);
                            if (missed > 0) {
                                send({ type: "step", message: `⚠️ ${missed} cards are in DB but were not found in this scrape.` });
                            }
                            send({ type: "stats", category: "cards", added: 0, matched: 0, missed });
                        }
                    } catch (error) {
                        console.error("Failed to save cards:", error);
                    }
                }
            }
        }

        send({ type: "step", message: `Total extracted: ${allCards.length} cards.` });
        send({ type: "meta", totalItems: allCards.length, totalPages: 1 });
    } finally {
        await workerPage.close();
        updateWorkers(-1);
    }
}

export async function scrapeMTGCollections({ url, context, send, franchise, language, skipSave }: ScraperOptions) {
    send({ type: "step", message: "MTG Gatherer detected. Fetching sets..." });
    let activeWorkers = 0;
    const updateWorkers = (delta: number) => {
        activeWorkers += delta;
        send({ type: "workers", count: activeWorkers });
    };

    updateWorkers(1);
    const workerPage = await context.newPage();
    const allDiscoveredSets: any[] = [];
    const uniqueCollectionCodes = new Set<string>();
    let p = 1;
    let totalAdded = 0;
    let totalMatched = 0;

    try {
        while (true) {
            const pageUrl = p === 1 ? url : (url.includes("?") ? `${url}&page=${p}` : `${url}?page=${p}`);
            send({ type: "step", message: `Navigating to: ${pageUrl} (Unique sets found: ${uniqueCollectionCodes.size})` });

            await workerPage.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

            try {
                await workerPage.waitForSelector('a[href*="/sets/"], a[href*="set="]', { timeout: 5000 });
            } catch (e: any) {
                // No sets on this page
            }

            send({ type: "step", message: `Searching for set links on page ${p}...` });
            const pageResults = await workerPage.evaluate((currentUrl: string) => {
                const setLinks = document.querySelectorAll('a[href*="/sets/"], a[href*="set="]');
                const rawItems = Array.from(setLinks).map((el: any) => ({
                    name: el.textContent?.trim() || "",
                    href: el.getAttribute("href") || "",
                }));
                return { rawItems };
            }, pageUrl);

            const { rawItems } = pageResults;

            if (rawItems.length === 0) {
                send({ type: "step", message: `No more sets found at page ${p}. Finishing...` });
                break;
            }

            const pageSets = rawItems
                .map((item: any) => {
                    const codeMatch = item.href.match(/\/sets\/([^/&?]+)/);
                    const collectionCode = codeMatch ? codeMatch[1].toUpperCase() : "";

                    return {
                        name: item.name,
                        collectionCode,
                        imageUrl: "",
                        collectionUrl: collectionCode ? `https://gatherer.wizards.com/sets/${collectionCode}` : "",
                    };
                })
                .filter((s: any) => s.name && s.name !== "Sets" && s.collectionCode);

            const newSets = pageSets.filter((s: any) => !uniqueCollectionCodes.has(s.collectionCode));

            if (newSets.length === 0) {
                send({ type: "step", message: `Page ${p} returned only duplicate sets. Extraction complete.` });
                break;
            }

            newSets.forEach((s: any) => uniqueCollectionCodes.add(s.collectionCode));

            send({
                type: "step",
                message: `Page ${p}: Discovered ${newSets.length} new sets.`
            });

            send({ type: "chunk", items: newSets, startIndex: allDiscoveredSets.length });
            allDiscoveredSets.push(...newSets);

            if (!skipSave && franchise && language && newSets.length > 0) {
                try {
                    const result = await saveScrapedCollections(newSets, { franchise, language });
                    if (result) {
                        const { saved, added, matched } = result;
                        totalAdded += added;
                        totalMatched += matched;
                        send({ type: "savedCollections", items: saved });
                        send({
                            type: "step",
                            message: `Page ${p}: Saved ${newSets.length} sets — ✅ ${added} new, 🔁 ${matched} matched.`,
                        });
                        send({ type: "stats", category: "collections", added, matched, missed: 0 });
                    }
                } catch (error) {
                    console.error(`Failed to save collections for page ${p}:`, error);
                    send({ type: "step", message: `Warning: Failed to persist collections for page ${p}.` });
                }
            }

            p++;
            if (p > 50) break;
        }
        send({
            type: "step",
            message: `Summary: ${allDiscoveredSets.length} total sets scraped — ✅ ${totalAdded} newly added, 🔁 ${totalMatched} already in DB.`,
        });
        if (!skipSave && franchise && language) {
            const allCollectionUrls = new Set(
                allDiscoveredSets.map((s: any) => s.collectionUrl).filter(Boolean)
            );
            const missed = await computeMissedCollections(allCollectionUrls, { franchise, language });
            if (missed > 0) {
                send({ type: "step", message: `⚠️ ${missed} collections are in DB but were not found in this scrape.` });
            }
            send({ type: "stats", category: "collections", added: 0, matched: 0, missed });
        }
    } finally {
        await workerPage.close();
        updateWorkers(-1);
    }
}
