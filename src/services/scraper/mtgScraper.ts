import { APP_CONFIG } from "@/constants/app";
import { saveScrapedCards, saveScrapedCollections } from "./persistence";
import type { ScraperOptions } from "./types";

export async function scrapeMTGCards({ url, context, send, collectionId, deepScrape }: ScraperOptions) {
    send({ type: "step", message: "MTG Gatherer detected. Starting single-pass scrape..." });
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

    try {
        if (isModernSetUrl) {
            // ── Modern set page: single-page card grid ──
            send({ type: "step", message: "Modern set page detected. Loading full card grid..." });
            await workerPage.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

            // Extract the set code from the URL for matching card links
            const setCodeMatch = url.match(/\/sets\/([A-Za-z0-9]+)/);
            const setCode = setCodeMatch ? setCodeMatch[1].toUpperCase() : "";

            send({ type: "step", message: `Extracting cards for set ${setCode}...` });

            const pageCards = await workerPage.evaluate((sc: string) => {
                // Card links follow: /{SET}/{lang}/{cardNo}/{card-slug}
                const pattern = new RegExp(`^/${sc}/([a-z]{2}-[a-z]{2})/(\\d+)/(.+)$`, "i");
                const links = document.querySelectorAll(`a[href^="/${sc}/"]`);

                return Array.from(links)
                    .map((el) => {
                        const a = el as HTMLAnchorElement;
                        const href = a.getAttribute("href") || "";
                        const match = href.match(pattern);
                        if (!match) return null;

                        const [, lang, cardNo, slug] = match;
                        const img = a.querySelector("img") as HTMLImageElement | null;

                        // Get card name from img alt (strip " card" suffix) or title
                        const altText = img?.alt || "";
                        const name = altText.replace(/ card$/i, "").trim()
                            || img?.title?.split(",")[0]?.trim()
                            || slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

                        const imageUrl = img?.src || "";

                        return {
                            name,
                            imageUrl,
                            cardUrl: `https://gatherer.wizards.com${href}`,
                            rarity: "",
                            manaCost: "",
                            manaValue: undefined as number | undefined,
                            typeLine: "",
                            artist: "",
                            cardNo,
                            alt: name,
                        };
                    })
                    .filter((c): c is NonNullable<typeof c> => c !== null);
            }, setCode);

            send({ type: "step", message: `Found ${pageCards.length} cards on modern set page.` });

            // Close the initial page used for grid extraction
            await workerPage.close();
            updateWorkers(-1);

            if (pageCards.length > 0) {
                // Deep scrape using parallel workers
                const concurrency = Math.min(APP_CONFIG.CARD_CONCURRENCY_LIMIT || 10, pageCards.length);
                send({ type: "step", message: `Launching ${concurrency} workers to deep scrape ${pageCards.length} cards...` });

                let nextCardIndex = 0;

                const deepScrapeWorker = async (workerId: number) => {
                    updateWorkers(1);
                    const wp = await context.newPage();
                    try {
                        while (true) {
                            const idx = nextCardIndex++;
                            if (idx >= pageCards.length) break;

                            const card = pageCards[idx];
                            try {
                                await wp.goto(card.cardUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

                                const details = await wp.evaluate(() => {
                                    const oracleText = Array.from(document.querySelectorAll("[data-testid='cardDetailsOracleText'], .textbox, [class*='oracleText']"))
                                        .map(el => el.textContent?.trim())
                                        .filter(Boolean)
                                        .join("\n\n");

                                    const flavorText = document.querySelector("[data-testid='cardDetailsFlavorText'], .flavortextbox, [class*='flavorText']")?.textContent?.trim() || "";
                                    const ptEl = document.querySelector("[data-testid='cardDetailsPT']");
                                    const pt = ptEl?.textContent?.trim() || "";
                                    const [power, toughness] = pt.includes("/") ? pt.split("/").map(s => s.trim()) : ["", ""];
                                    const typeEl = document.querySelector("[data-testid='cardDetailsTypeLine'], [class*='typeLine']");
                                    const typeLine = typeEl?.textContent?.trim() || "";
                                    const manaCostEl = document.querySelector("[data-testid='cardDetailsManaCost'], [class*='manaCost']");
                                    const manaCost = manaCostEl?.textContent?.trim() || "";
                                    const rarityEl = document.querySelector("[data-testid='cardDetailsRarity']");
                                    const rarity = rarityEl?.textContent?.trim() || "";
                                    const artistEl = document.querySelector("[data-testid='cardDetailsArtist'] a, [data-testid='cardDetailsArtist']");
                                    const artist = artistEl?.textContent?.trim() || "";

                                    return { oracleText, flavorText, power, toughness, typeLine, manaCost, rarity, artist };
                                });

                                for (const [key, value] of Object.entries(details)) {
                                    if (value) (card as any)[key] = value;
                                }

                                send({ type: "chunk", items: [card], startIndex: idx });
                            } catch (err) {
                                console.error(`[Worker ${workerId}] Failed to deep scrape ${card.name}:`, err);
                                send({ type: "step", message: `Warning: Worker ${workerId} failed on ${card.name}` });
                            }
                        }
                    } finally {
                        await wp.close();
                        updateWorkers(-1);
                    }
                };

                const workers = Array.from({ length: concurrency }, async (_, i) => {
                    const workerId = i + 1;
                    if (i > 0) await new Promise(r => setTimeout(r, i * 200));
                    return deepScrapeWorker(workerId);
                });

                await Promise.all(workers);
                allCards.push(...pageCards);
            }
        } else {
            // ── Legacy checklist view: paginated table ──
            let p = 1;
            while (true) {
                const pageUrl = url.includes("output=checklist")
                    ? url.includes("?") ? `${url}&page=${p}` : `${url}?page=${p}`
                    : url.includes("?")
                        ? `${url}&output=checklist&page=${p}`
                        : `${url}?output=checklist&page=${p}`;

                send({ type: "step", message: `Navigating to cards page ${p}: ${pageUrl}` });
                await workerPage.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

                const pageCards = await workerPage.evaluate(() => {
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

                if (pageCards.length === 0) {
                    send({ type: "step", message: `No more cards found at page ${p}.` });
                    break;
                }

                send({ type: "step", message: `Found ${pageCards.length} cards on page ${p}.` });

                // Deep Scraping
                send({ type: "step", message: `Deep Scraping ${pageCards.length} cards for Oracle text and details...` });
                for (let i = 0; i < pageCards.length; i++) {
                    const card = pageCards[i];
                    if (!card.cardUrl) continue;

                    try {
                        await workerPage.goto(card.cardUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

                        const details = await workerPage.evaluate(() => {
                            const oracleText = Array.from(document.querySelectorAll(".textbox"))
                                .map(el => el.textContent?.trim())
                                .filter(Boolean)
                                .join("\n\n");

                            const flavorText = document.querySelector(".flavortextbox")?.textContent?.trim() || "";

                            const ptLabel = Array.from(document.querySelectorAll(".label")).find(el => el.textContent?.includes("P/T:"));
                            const pt = ptLabel?.nextElementSibling?.textContent?.trim() || "";
                            const [power, toughness] = pt.includes("/") ? pt.split("/").map(s => s.trim()) : ["", ""];

                            return { oracleText, flavorText, power, toughness };
                        });

                        Object.assign(card, details);

                        if (i % 5 === 0) {
                            send({ type: "chunk", items: [card], startIndex: allCards.length + i });
                        }
                    } catch (err) {
                        console.error(`Failed to deep scrape ${card.name}:`, err);
                        send({ type: "step", message: `Warning: Failed to get details for ${card.name}` });
                    }
                }

                allCards.push(...pageCards);
                send({ type: "chunk", items: pageCards, startIndex: allCards.length - pageCards.length });

                p++;
                if (p > 50) break;
            }
        }

        send({ type: "step", message: `Total found: ${allCards.length} cards. Extraction complete.` });
        send({ type: "meta", totalItems: allCards.length, totalPages: 1 });

        // Save to database
        if (collectionId && allCards.length > 0) {
            send({ type: "step", message: "Saving all cards to database..." });
            try {
                await saveScrapedCards(allCards, collectionId);
                send({ type: "step", message: `Successfully saved ${allCards.length} cards.` });
            } catch (error) {
                console.error("Failed to save cards:", error);
                send({ type: "step", message: "Warning: Failed to persist cards to database." });
            }
        }
    } finally {
        if (!isModernSetUrl) {
            await workerPage.close();
            updateWorkers(-1);
        }
    }
}

export async function scrapeMTGCollections({ url, context, send, franchise, language, scrapedIndex }: ScraperOptions) {
    send({ type: "step", message: "MTG Gatherer detected. Fetching sets..." });
    let activeWorkers = 0;
    const updateWorkers = (delta: number) => {
        activeWorkers += delta;
        send({ type: "workers", count: activeWorkers });
    };

    updateWorkers(1);
    const workerPage = await context.newPage();
    const allDiscoveredSets: any[] = [];
    let p = 1;

    try {
        while (true) {
            const pageUrl = url.includes("?") ? `${url}&page=${p}` : `${url}?page=${p}`;
            send({ type: "step", message: `Navigating to: ${pageUrl}` });

            await workerPage.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

            send({ type: "step", message: `Searching for set links on page ${p}...` });
            const pageResults = await workerPage.evaluate((currentUrl: string) => {
                if (currentUrl.includes("/sets")) {
                    const setLinks = document.querySelectorAll("a[href^='/sets/']");
                    const rawItems = Array.from(setLinks).map((el: any) => ({
                        name: el.textContent?.trim() || "",
                        href: el.getAttribute("href") || "",
                    }));
                    return { rawItems };
                }
                return { rawItems: [] };
            }, pageUrl);

            const { rawItems } = pageResults;

            if (rawItems.length === 0) {
                send({ type: "step", message: `No more sets found at page ${p}. Finishing...` });
                break;
            }

            const pageSets = rawItems
                .map((item: any) => {
                    const codeMatch = item.href.match(/\/sets\/([^/]+)/);
                    const collectionCode = codeMatch ? codeMatch[1].toUpperCase() : "";

                    return {
                        name: item.name,
                        collectionCode,
                        imageUrl: "",
                        collectionUrl: collectionCode ? `https://gatherer.wizards.com/sets/${collectionCode}` : "",
                    };
                })
                .filter((s: any) => s.name && s.name !== "Sets" && s.collectionCode);

            const filteredOut = rawItems.length - pageSets.length;
            send({
                type: "step",
                message: `Page ${p}: Discovered ${rawItems.length} items. Filtered out ${filteredOut} (invalid codes). Proceeding with ${pageSets.length} sets.`
            });

            send({ type: "chunk", items: pageSets, startIndex: allDiscoveredSets.length });
            allDiscoveredSets.push(...pageSets);

            if (franchise && language && scrapedIndex !== undefined && pageSets.length > 0) {
                try {
                    const savedData = await saveScrapedCollections(pageSets, {
                        franchise,
                        language,
                        scrapedIndex,
                    });
                    send({ type: "savedCollections", items: savedData });
                    send({ type: "step", message: `Page ${p}: Successfully saved ${pageSets.length} collections.` });
                } catch (error) {
                    console.error(`Failed to save collections for page ${p}:`, error);
                    send({ type: "step", message: `Warning: Failed to persist collections for page ${p}.` });
                }
            }

            p++;
            if (p > 50) break;
        }
    } finally {
        await workerPage.close();
        updateWorkers(-1);
    }
}
