import {
    computeMissedCollections,
    saveScrapedCollections,
} from "../persistence";
import type { ScraperOptions } from "../types";

export async function scrapeMTGCollections({
    url,
    context,
    send,
    franchise,
    language,
    skipSave,
}: ScraperOptions) {
    send({
        type: "step",
        message: "MTG Gatherer detected. Fetching sets...",
    });
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
            const pageUrl =
                p === 1
                    ? url
                    : url.includes("?")
                      ? `${url}&page=${p}`
                      : `${url}?page=${p}`;
            send({
                type: "step",
                message: `Navigating to: ${pageUrl} (Unique sets found: ${uniqueCollectionCodes.size})`,
            });

            await workerPage.goto(pageUrl, {
                waitUntil: "domcontentloaded",
                timeout: 60000,
            });

            try {
                await workerPage.waitForSelector(
                    'a[href*="/sets/"], a[href*="set="]',
                    { timeout: 5000 },
                );
            } catch (e: any) {
                // No sets on this page
            }

            send({
                type: "step",
                message: `Searching for set links on page ${p}...`,
            });
            const pageResults = await workerPage.evaluate(() => {
                const rows = document.querySelectorAll("tr");
                const items: any[] = [];

                rows.forEach((row) => {
                    const cells = row.querySelectorAll("td");
                    if (cells.length < 5) return;

                    const setLink = row.querySelector(
                        'a[href*="/sets/"], a[href*="set="]',
                    ) as HTMLAnchorElement;
                    if (!setLink) return;

                    const name = setLink.textContent?.trim() || "";
                    const href = setLink.getAttribute("href") || "";

                    // Release date is typically in td index 4
                    const dateText = cells[4].textContent?.trim() || "";
                    const releaseYear = dateText.match(/^\d{4}/)
                        ? parseInt(dateText.slice(0, 4))
                        : undefined;

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
                send({
                    type: "step",
                    message: `No more sets found at page ${p}. Finishing...`,
                });
                break;
            }

            const pageSets = rawItems
                .map((item: any) => {
                    const codeMatch = item.href.match(/\/sets\/([^/&?]+)/);
                    const collectionCode = codeMatch
                        ? codeMatch[1].toUpperCase()
                        : "";

                    return {
                        name: item.name,
                        collectionCode,
                        imageUrl: "",
                        collectionUrl: collectionCode
                            ? `https://gatherer.wizards.com/sets/${collectionCode}`
                            : "",
                        releaseYear: item.releaseYear,
                    };
                })
                .filter(
                    (s: any) => s.name && s.name !== "Sets" && s.collectionCode,
                );

            const newSets = pageSets.filter(
                (s: any) => !uniqueCollectionCodes.has(s.collectionCode),
            );

            if (newSets.length === 0) {
                send({
                    type: "step",
                    message: `Page ${p} returned only duplicate sets. Extraction complete.`,
                });
                break;
            }

            newSets.forEach((s: any) =>
                uniqueCollectionCodes.add(s.collectionCode),
            );

            send({
                type: "step",
                message: `Page ${p}: Discovered ${newSets.length} new sets.`,
            });

            send({
                type: "chunk",
                items: newSets,
                startIndex: allDiscoveredSets.length,
            });
            allDiscoveredSets.push(...newSets);

            if (!skipSave && franchise && language && newSets.length > 0) {
                try {
                    const result = await saveScrapedCollections(newSets, {
                        franchise,
                        language,
                    });
                    if (result) {
                        const { saved, added, matched } = result;
                        totalAdded += added;
                        totalMatched += matched;
                        send({
                            type: "savedCollections",
                            items: saved,
                        });
                        send({
                            type: "step",
                            message: `Page ${p}: Saved ${newSets.length} sets — ✅ ${added} new, 🔁 ${matched} matched.`,
                        });
                        send({
                            type: "stats",
                            category: "collections",
                            added,
                            matched,
                            missed: 0,
                        });
                    }
                } catch (error) {
                    console.error(
                        `Failed to save collections for page ${p}:`,
                        error,
                    );
                    send({
                        type: "step",
                        message: `Warning: Failed to persist collections for page ${p}.`,
                    });
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
                allDiscoveredSets
                    .map((s: any) => s.collectionUrl)
                    .filter(Boolean),
            );
            const missed = await computeMissedCollections(allCollectionUrls, {
                franchise,
                language,
            });
            if (missed > 0) {
                send({
                    type: "step",
                    message: `⚠️ ${missed} collections are in DB but were not found in this scrape.`,
                });
            }
            send({
                type: "stats",
                category: "collections",
                added: 0,
                matched: 0,
                missed,
            });
        }
    } finally {
        await workerPage.close();
        updateWorkers(-1);
    }
}
