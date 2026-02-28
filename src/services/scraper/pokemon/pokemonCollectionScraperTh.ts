import { CARD_SCRAPER_CONFIG } from "@/constants/card_scraper";
import { saveScrapedCollections } from "@/services/scraper/persistence";
import type { ScraperOptions } from "@/services/scraper/types";
import { SCRAPER_MESSAGE_TYPE } from "@/services/scraper/types";
import { createWorkerUpdater, createStepLogger, reportScraperStats } from "@/services/scraper/utils";

export async function scrapePokemonCollectionsTh({
    url,
    context,
    send,
    franchise,
    language,
}: ScraperOptions) {
    const sharedCollectionList: any[] = [];
    let totalPages = Infinity;
    let nextPageIndex = 1;

    const getTargetUrl = (p: number) =>
        url.includes("pageNo=")
            ? url.replace(/pageNo=\d+/, `pageNo=${p}`)
            : url.includes("?")
                ? `${url}&pageNo=${p}`
                : `${url}?pageNo=${p}`;

    let shouldAbort = false;
    const concurrency = CARD_SCRAPER_CONFIG.COLLECTION_CONCURRENCY_LIMIT;

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
                    await workerPage.goto(targetPageUrl, {
                        waitUntil: "networkidle",
                        timeout: CARD_SCRAPER_CONFIG.PAGE_LOAD_TIMEOUT,
                    });
                    if (shouldAbort || p > totalPages) break;

                    await workerPage.evaluate(() =>
                        window.scrollTo(0, document.body.scrollHeight),
                    );
                    await workerPage.waitForTimeout(1500);

                    const pageData = await workerPage.evaluate(() => {
                        const collectionElements =
                            document.querySelectorAll("a.expansionLink");
                        const items = Array.from(collectionElements).map(
                            (el) => {
                                const anchor = el as HTMLAnchorElement;
                                const img = el.querySelector("img");
                                const name =
                                    el
                                        .querySelector("h3")
                                        ?.textContent?.trim() || "";
                                const imageUrl = img?.src || "";
                                const relativeLink =
                                    anchor.getAttribute("href") || "";
                                const absoluteLink = relativeLink.startsWith(
                                    "http",
                                )
                                    ? relativeLink
                                    : window.location.origin +
                                    (relativeLink.startsWith("/")
                                        ? ""
                                        : "/") +
                                    relativeLink;

                                // Extract code from URL (e.g., /series/4578/ -> 4578 or ?expansionCodes=SVHK -> SVHK)
                                const codeMatch =
                                    absoluteLink.match(/\/series\/(\d+)/);
                                const expansionCodeMatch =
                                    absoluteLink.match(/expansionCodes=([^&]+)/);
                                const collectionCode = expansionCodeMatch
                                    ? expansionCodeMatch[1]
                                    : codeMatch
                                        ? codeMatch[1]
                                        : `TH-${name.replace(/\s+/g, "-")}`;

                                return {
                                    name,
                                    imageUrl,
                                    collectionUrl: absoluteLink,
                                    collectionCode,
                                };
                            },
                        );

                        let totalPages = 0;
                        const pageText = document.body.innerText;
                        const match =
                            pageText.match(/ทั้งหมด\s*(\d+)\s*หน้า/) ||
                            pageText.match(/(\d+)\s*หน้า/) ||
                            pageText.match(/\/ ทั้งหมด\s*(\d+)/);
                        if (match) totalPages = parseInt(match[1], 10);
                        return { items, totalPages };
                    });

                    if (pageData.items.length === 0) {
                        if (p === 1) {
                            shouldAbort = true;
                            totalPages = 0;
                        } else if (p < totalPages) {
                            totalPages = p - 1;
                        }
                        break;
                    }

                    if (pageData.totalPages > 0 && totalPages === Infinity) {
                        totalPages = pageData.totalPages;
                    }

                    sharedCollectionList.push(...pageData.items);
                    logStep(`Worker ${workerId} found ${pageData.items.length} sets on page ${p}.`);
                } catch (pageErr) {
                    console.error(
                        `[Scraper] Worker ${workerId} failed at collection page ${p}:`,
                        pageErr,
                    );
                    logStep(`Worker ${workerId} failed at page ${p}. Retrying...`);
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

    if (franchise && language && sharedCollectionList.length > 0) {
        // Now that we have all items, trigger the UI update (consistency with MTG)
        send({
            type: SCRAPER_MESSAGE_TYPE.META,
            totalItems: sharedCollectionList.length,
        });
        logStep(`Scraped ${sharedCollectionList.length} unique collections total.`);
        send({
            type: SCRAPER_MESSAGE_TYPE.CHUNK,
            items: sharedCollectionList,
            startIndex: 0,
        });

        logStep("Saving discovered Thai collections to database...");
        try {
            const result = await saveScrapedCollections(sharedCollectionList, {
                franchise,
                language,
            });
            if (result) {
                const { saved, addedItems, matchedItems } = result;
                reportScraperStats(send, "collections", result);
                logStep(`Successfully saved ${sharedCollectionList.length} collections — ✅ ${addedItems.length} new, 🔁 ${matchedItems.length} matched.`);
            }
        } catch (error) {
            console.error("Failed to save Thai collections:", error);
            logStep("Warning: Failed to persist collections to database.");
        }
    }
}
