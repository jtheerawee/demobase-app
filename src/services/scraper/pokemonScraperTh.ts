import { APP_CONFIG } from "@/constants/app";
import { saveScrapedCards, saveScrapedCollections } from "./persistence";
import type { ScraperOptions } from "./types";

// ==========================================
// THAI (TH) SCRAPER LOGIC
// ==========================================

export async function scrapePokemonCardsTh({ url, context, send, deepScrape, collectionId }: ScraperOptions) {
    const sharedCardList: any[] = [];
    let totalPages = Infinity;
    let nextPageIndex = 1;

    const getTargetUrl = (p: number) =>
        url.includes("pageNo=")
            ? url.replace(/pageNo=\d+/, `pageNo=${p}`)
            : url.includes("?")
                ? `${url}&pageNo=${p}`
                : `${url}?pageNo=${p}`;

    let shouldAbort = false;
    const concurrency = APP_CONFIG.CARD_CONCURRENCY_LIMIT;

    send({ type: "step", message: `Initializing ${concurrency} parallel pagination workers for Thai site...` });

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
                    await workerPage.goto(targetPageUrl, { waitUntil: "networkidle", timeout: 45000 });
                    if (shouldAbort || p > totalPages) break;

                    await workerPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                    await workerPage.waitForTimeout(1000);

                    const pageData = await workerPage.evaluate(() => {
                        const cardElements = document.querySelectorAll(".cardList li.card");
                        const items = Array.from(cardElements).map((el) => {
                            const img = el.querySelector("img");
                            const anchor = el.querySelector("a") as HTMLAnchorElement;
                            const imageUrl = img?.getAttribute("data-original") || img?.src || "";
                            const absoluteImageUrl = imageUrl.startsWith("http")
                                ? imageUrl
                                : window.location.origin + (imageUrl.startsWith("/") ? "" : "/") + imageUrl;
                            const link = anchor?.getAttribute("href") || "";
                            const absoluteLink = link.startsWith("http")
                                ? link
                                : window.location.origin + (link.startsWith("/") ? "" : "/") + link;
                            return {
                                imageUrl: absoluteImageUrl,
                                alt: img?.alt || "Pokemon Card",
                                name: img?.alt || "Pokemon Card",
                                cardUrl: absoluteLink,
                            };
                        });

                        let discoveredTotal = 0;
                        const pageText = document.body.innerText;
                        const match =
                            pageText.match(/ทั้งหมด\s*(\d+)\s*หน้า/) ||
                            pageText.match(/(\d+)\s*หน้า/) ||
                            pageText.match(/\/ ทั้งหมด\s*(\d+)/);
                        if (match) discoveredTotal = parseInt(match[1], 10);
                        return { items, discoveredTotal };
                    });

                    if (pageData.items.length === 0) {
                        if (p === 1) {
                            shouldAbort = true;
                            totalPages = 0;
                            send({ type: "meta", totalPages: 0, totalCards: 0 });
                        } else if (p < totalPages) {
                            totalPages = p - 1;
                            send({ type: "meta", totalPages });
                        }
                        break;
                    }

                    if (pageData.discoveredTotal > 0 && totalPages === Infinity) {
                        totalPages = pageData.discoveredTotal;
                        send({ type: "meta", totalPages });
                    }

                    const startIndex = sharedCardList.length;
                    sharedCardList.push(...pageData.items);
                    send({ type: "chunk", items: pageData.items, startIndex });
                } catch (pageErr) {
                    console.error(`[Scraper] Worker ${workerId} failed at page ${p}:`, pageErr);
                    send({ type: "step", message: `Worker ${workerId} failed at page ${p}. Retrying...` });
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

    // Deep Scrape Phase (Thai)
    if (deepScrape && sharedCardList.length > 0) {
        const totalCards = sharedCardList.length;
        send({ type: "step", message: `Starting deep scrape for ${totalCards} cards...` });

        const deepWorker = async (workerId: number) => {
            updateWorkers(1);
            const workerPage = await context.newPage();
            try {
                while (true) {
                    const cardIndex = sharedCardList.findIndex((c) => c.cardUrl && !c.isDeepScraped && !c.isBeingScraped);
                    if (cardIndex === -1) break;

                    const card = sharedCardList[cardIndex];
                    card.isBeingScraped = true;

                    try {
                        await workerPage.goto(card.cardUrl, { waitUntil: "networkidle", timeout: 30000 });
                        const details = await workerPage.evaluate(() => {
                            const getText = (sel: string) => document.querySelector(sel)?.textContent?.trim() || "";
                            const h1 =
                                document.querySelector("h1") ||
                                document.querySelector(".p-cardDetail__header h1") ||
                                document.querySelector(".pageHeader.cardDetail");
                            let name = "";
                            if (h1) {
                                const clone = h1.cloneNode(true) as HTMLElement;
                                clone.querySelectorAll(".evolveMarker").forEach((el) => el.remove());
                                name = clone.textContent?.trim() || "";
                            }

                            const numberAndRarity =
                                getText(".p-cardDetail__number") ||
                                getText(".p-cardDetail__header .number") ||
                                getText(".collectorNumber");

                            let collectorNumber = "N/A";
                            let rarity = "N/A";
                            if (numberAndRarity?.includes("/")) {
                                const parts = numberAndRarity.split("/");
                                collectorNumber = parts[0]?.trim() || "N/A";
                                rarity = parts[1]?.trim() || "N/A";
                            } else if (numberAndRarity) {
                                collectorNumber = numberAndRarity;
                            }

                            return { name, cardNo: collectorNumber, rarity, isDeepScraped: true };
                        });

                        Object.assign(card, details);
                        card.isBeingScraped = false;
                        send({ type: "cardUpdate", index: cardIndex, details });
                    } catch (e) {
                        card.isBeingScraped = false;
                        console.error(`Failed to deep scrape Thai card ${cardIndex}:`, e);
                    }
                }
            } finally {
                await workerPage.close();
                updateWorkers(-1);
            }
        };

        const workers = Array.from({ length: Math.min(concurrency, sharedCardList.length) }, async (_, i) => {
            const workerId = i + 1;
            if (i > 0) await new Promise((r) => setTimeout(r, i * 150));
            return deepWorker(workerId);
        });
        await Promise.all(workers);
    }

    if (collectionId && sharedCardList.length > 0) {
        send({ type: "step", message: "Saving Thai cards to database..." });
        try {
            await saveScrapedCards(sharedCardList, collectionId);
            send({ type: "step", message: `Successfully saved ${sharedCardList.length} cards.` });
        } catch (error) {
            console.error("Failed to save Thai cards:", error);
            send({ type: "step", message: "Warning: Failed to persist cards to database." });
        }
    }
}

export async function scrapePokemonCollectionsTh({ url, context, send, franchise, language }: ScraperOptions) {
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
    const concurrency = APP_CONFIG.COLLECTION_CONCURRENCY_LIMIT;
    send({ type: "step", message: `Initializing ${concurrency} parallel workers for Thai collections...` });

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
                    await workerPage.goto(targetPageUrl, { waitUntil: "networkidle", timeout: 45000 });
                    if (shouldAbort || p > totalPages) break;

                    await workerPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                    await workerPage.waitForTimeout(1500);

                    const pageData = await workerPage.evaluate(() => {
                        const collectionElements = document.querySelectorAll("a.expansionLink");
                        const items = Array.from(collectionElements).map((el) => {
                            const anchor = el as HTMLAnchorElement;
                            const img = el.querySelector("img");
                            const name = el.querySelector("h3")?.textContent?.trim() || "";
                            const imageUrl = img?.src || "";
                            const relativeLink = anchor.getAttribute("href") || "";
                            const absoluteLink = relativeLink.startsWith("http")
                                ? relativeLink
                                : window.location.origin + (relativeLink.startsWith("/") ? "" : "/") + relativeLink;
                            return { name, imageUrl, collectionUrl: absoluteLink };
                        });

                        let discoveredTotal = 0;
                        const pageText = document.body.innerText;
                        const match =
                            pageText.match(/ทั้งหมด\s*(\d+)\s*หน้า/) ||
                            pageText.match(/(\d+)\s*หน้า/) ||
                            pageText.match(/\/ ทั้งหมด\s*(\d+)/);
                        if (match) discoveredTotal = parseInt(match[1], 10);
                        return { items, discoveredTotal };
                    });

                    if (pageData.items.length === 0) {
                        if (p === 1) {
                            shouldAbort = true;
                            totalPages = 0;
                            send({ type: "meta", totalPages: 0 });
                        } else if (p < totalPages) {
                            totalPages = p - 1;
                            send({ type: "meta", totalPages });
                        }
                        break;
                    }

                    if (pageData.discoveredTotal > 0 && totalPages === Infinity) {
                        totalPages = pageData.discoveredTotal;
                        send({ type: "meta", totalPages });
                    }

                    const startIndex = sharedCollectionList.length;
                    sharedCollectionList.push(...pageData.items);
                    send({ type: "chunk", items: pageData.items, startIndex });
                } catch (pageErr) {
                    console.error(`[Scraper] Worker ${workerId} failed at collection page ${p}:`, pageErr);
                    send({ type: "step", message: `Worker ${workerId} failed at page ${p}. Retrying...` });
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

    if (franchise && language && sharedCollectionList.length > 0) {
        send({ type: "step", message: "Saving discovered Thai collections to database..." });
        try {
            const result = await saveScrapedCollections(sharedCollectionList, { franchise, language });
            if (result) {
                const { saved } = result;
                send({ type: "savedCollections", items: saved });
                send({ type: "step", message: `Successfully saved ${sharedCollectionList.length} collections.` });
            }
        } catch (error) {
            console.error("Failed to save Thai collections:", error);
            send({ type: "step", message: "Warning: Failed to persist collections to database." });
        }
    }
}
