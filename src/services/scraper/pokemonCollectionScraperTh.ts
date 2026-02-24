import { APP_CONFIG } from "@/constants/app";
import { saveScrapedCollections } from "@/services/scraper/persistence";
import type { ScraperOptions } from "@/services/scraper/types";

// ==========================================
// THAI (TH) COLLECTION SCRAPER LOGIC
// ==========================================

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

                            // Extract code from URL (e.g., /series/4578/ -> 4578)
                            const codeMatch = absoluteLink.match(/\/series\/(\d+)/);
                            const collectionCode = codeMatch ? codeMatch[1] : `TH-${name.replace(/\s+/g, "-")}`;

                            return { name, imageUrl, collectionUrl: absoluteLink, collectionCode };
                        });

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
                    send({ type: "step", message: `Worker ${workerId} found ${pageData.items.length} sets on page ${p}.` });
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
        // Now that we have all items, trigger the UI update (consistency with MTG)
        send({ type: "meta", totalItems: sharedCollectionList.length });
        send({ type: "chunk", items: sharedCollectionList, startIndex: 0 });

        send({ type: "step", message: "Saving discovered Thai collections to database..." });
        try {
            const result = await saveScrapedCollections(sharedCollectionList, { franchise, language });
            if (result) {
                const { saved, added, matched } = result;
                send({ type: "savedCollections", items: saved });
                send({ type: "stats", category: "collections", added, matched, missed: 0 });
                send({ type: "step", message: `Successfully saved ${sharedCollectionList.length} collections — ✅ ${added} new, 🔁 ${matched} matched.` });
            }
        } catch (error) {
            console.error("Failed to save Thai collections:", error);
            send({ type: "step", message: "Warning: Failed to persist collections to database." });
        }
    }
}
