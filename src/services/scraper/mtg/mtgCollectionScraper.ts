import { computeMissedCollections, saveScrapedCollections } from "../persistence";
import { CARD_SCRAPER_CONFIG } from "@/constants/card_scraper";
import { FRANCHISES } from "@/constants/franchises";
import type { ScraperOptions } from "../types";
import { createWorkerUpdater, createStepLogger, reportScraperStats, reportScraperChunk } from "../utils";

export async function scrapeMTGCollections(options: ScraperOptions) {
    const { url, context, send, franchise, language, skipSave } = options;
    const logStep = createStepLogger(send);
    logStep(`Step 1: ${franchise}. Fetching sets...`);
    const updateWorkers = createWorkerUpdater(send);

    // Get base URL from franchises configuration
    const franchiseData = FRANCHISES.find((f) => f.value === franchise);
    const langData = franchiseData?.languages.find((l) => l.value === language);
    const baseUrl = langData?.url;

    updateWorkers(1);
    const workerPage = await context.newPage();
    const allDiscoveredSets: any[] = [];
    const uniqueCollectionCodes = new Set<string>();
    let p = 1;
    let totalAdded = 0;
    let totalMatched = 0;

    try {
        while (true) {
            const pageUrl = p === 1 ? url : url.includes("?") ? `${url}&page=${p}` : `${url}?page=${p}`;
            logStep(`Step 2: Navigating to: ${pageUrl} (Unique sets found: ${uniqueCollectionCodes.size})`);

            await workerPage.goto(pageUrl, {
                waitUntil: "domcontentloaded",
                timeout: CARD_SCRAPER_CONFIG.PAGE_LOAD_TIMEOUT,
            });

            try {
                await workerPage.waitForSelector('a[href*="/sets/"], a[href*="set="]', {
                    timeout: CARD_SCRAPER_CONFIG.SELECTOR_WAIT_TIMEOUT,
                });
            } catch (e: any) {
                // No sets on this page
            }

            logStep(`Step 3: Searching for set links on page ${p}...`);
            const pageResults = await workerPage.evaluate(() => {
                const rows = document.querySelectorAll("tr");
                const items: any[] = [];

                rows.forEach((row) => {
                    const cells = row.querySelectorAll("td");
                    if (cells.length < 5) return;

                    const setLink = row.querySelector('a[href*="/sets/"], a[href*="set="]') as HTMLAnchorElement;
                    if (!setLink) return;

                    const name = setLink.textContent?.trim() || "";
                    const href = setLink.getAttribute("href") || "";

                    // Release date is typically in td index 4
                    const dateText = cells[4].textContent?.trim() || "";
                    const releaseYear = dateText.match(/^\d{4}/) ? parseInt(dateText.slice(0, 4)) : undefined;

                    items.push({
                        name,
                        href,
                        releaseYear,
                    });
                });

                return { rawItems: items };
            });

            const { rawItems } = pageResults;

            if (rawItems.length === 0) {
                logStep(`No more sets found at page ${p}. Finishing...`);
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
                        collectionUrl: collectionCode ? `${baseUrl}/${collectionCode}` : "",
                        releaseYear: item.releaseYear,
                    };
                })
                .filter((s: any) => s.name && s.name !== "Sets" && s.collectionCode);

            const newSets = pageSets.filter((s: any) => !uniqueCollectionCodes.has(s.collectionCode));

            if (newSets.length === 0) {
                logStep(`Page ${p} returned only duplicate sets. Extraction complete.`);
                break;
            }

            newSets.forEach((s: any) => uniqueCollectionCodes.add(s.collectionCode));

            logStep(`Step 4: Page ${p}: Discovered ${newSets.length} new sets.`);

            reportScraperChunk(send, newSets, allDiscoveredSets.length);
            allDiscoveredSets.push(...newSets);

            if (!skipSave && franchise && language && newSets.length > 0) {
                try {
                    const result = await saveScrapedCollections(newSets, {
                        franchise,
                        language,
                    });
                    if (result) {
                        const { saved, addedItems, matchedItems } = result;
                        totalAdded += addedItems.length;
                        totalMatched += matchedItems.length;
                        reportScraperStats(send, "collections", result);
                        logStep(
                            `Step 5: Page ${p}: Saved ${newSets.length} sets — ✅ ${addedItems.length} new, 🔁 ${matchedItems.length} matched.`,
                        );
                    }
                } catch (error) {
                    console.error(`Failed to save collections for page ${p}:`, error);
                    logStep(`Warning: Failed to persist collections for page ${p}.`);
                }
            }

            p++;
            if (p > 50) break;
        }
        logStep(
            `Step 6: Summary: ${allDiscoveredSets.length} total sets scraped — ✅ ${totalAdded} newly added, 🔁 ${totalMatched} already in DB.`,
        );
        if (!skipSave && franchise && language) {
            const allCollectionUrls = new Set(allDiscoveredSets.map((s: any) => s.collectionUrl).filter(Boolean));
            const missedResult = await computeMissedCollections(allCollectionUrls, {
                franchise,
                language,
            });
            if (missedResult.count > 0) {
                logStep(`⚠️ ${missedResult.count} collections are in DB but were not found in this scrape.`);
            }
            reportScraperStats(send, "collections", {
                missedItems: missedResult.items,
            });
        }
    } finally {
        await workerPage.close();
        updateWorkers(-1);
    }
}
