import { saveScrapedCollections } from "@/services/scraper/persistence";
import type { ScraperOptions } from "@/services/scraper/types";
import { CARD_SCRAPER_CONFIG } from "@/constants/card_scraper";
import {
    createWorkerUpdater,
    createStepLogger,
    reportScraperStats,
    reportScraperChunk,
} from "@/services/scraper/utils";

export async function scrapePokemonCollectionsEn({ url, context, send, franchise, language }: ScraperOptions) {
    const logStep = createStepLogger(send);
    const updateWorkers = createWorkerUpdater(send);

    logStep(`Step 1: ${franchise}. Fetching sets...`);

    const sharedCollectionList: any[] = [];
    // Map to store key -> Name transitions
    const nameMap: Record<string, string> = {};

    updateWorkers(1);
    const page = await context.newPage();
    try {
        logStep(`Step 2: Navigating to ${url}...`);
        // Use a more realistic user agent if possible through context, but here we just navigate
        await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: CARD_SCRAPER_CONFIG.PAGE_LOAD_TIMEOUT,
        });

        // 0. Handle Cookies
        const cookieBtn = await page.$("#onetrust-accept-btn-handler");
        if (cookieBtn) {
            await cookieBtn.click().catch(() => { });
            await page.waitForTimeout(500);
        }

        logStep("Step 3: Activating Advanced Search filters...");
        // 1. Click "Show Advanced Search"
        const advancedBtnSelector = "#toggleWrapperMainText, span.filter-title, .filter-title";
        await page
            .waitForSelector(advancedBtnSelector, {
                timeout: CARD_SCRAPER_CONFIG.SELECTOR_WAIT_TIMEOUT,
            })
            .catch(() => { });

        const advancedBtn = await page.$(advancedBtnSelector);
        if (advancedBtn) {
            const isExpanded = await page.evaluate((sel: string) => {
                const el = document.querySelector(sel);
                return el?.textContent?.toLowerCase().includes("hide") || false;
            }, advancedBtnSelector);

            if (!isExpanded) {
                await advancedBtn.click();
                await page.waitForTimeout(1000);
            }
        }

        logStep("Expanding all filters...");
        // 2. Use "Expand All" if available, else try Expansion header
        const expandAllSelector = "#expandAll";
        const hasExpandAll = await page.$(expandAllSelector);
        if (hasExpandAll) {
            await hasExpandAll.click().catch(() => { });
            await page.waitForTimeout(1000);
        } else {
            const expansionHeaderSelector =
                "header:has-text('Expansions'), div.column-12:has-text('Expansions'), .expansion-filter header";
            const expansionSection = await page.$(expansionHeaderSelector);
            if (expansionSection) {
                await expansionSection.scrollIntoViewIfNeeded().catch(() => { });
                await expansionSection.click({ force: true }).catch(() => { });
                await page.waitForTimeout(1000);
            }
        }

        logStep("Scraping set names from filters...");
        // Ensure the expansion container or labels are present before extracting
        try {
            await page.waitForSelector("label.pill-control__label", {
                timeout: 5000,
            });
        } catch (e) {
            logStep("Warning: Set labels not appearing immediately, attempting extraction anyway...");
        }

        // Scroll a bit more to trigger any lazy loading
        await page.evaluate(() => window.scrollBy(0, 1000));
        await page.waitForTimeout(1000);

        // Extract labels
        const mappings = await page.evaluate(() => {
            const results: Record<string, string> = {};
            // The site no longer uses #expansions-container. 
            // We search for pill labels across the whole filter area.
            const labels = document.querySelectorAll(".filter-side label.pill-control__label, label.pill-control__label");

            labels.forEach((label) => {
                const id = label.getAttribute("for");
                if (!id) return;

                // Priority 1: Direct span child
                let text = label.querySelector("span")?.innerText?.trim();

                // Priority 2: Text nodes (ignoring icons)
                if (!text) {
                    text = Array.from(label.childNodes)
                        .filter(node => node.nodeType === Node.TEXT_NODE)
                        .map(node => node.textContent?.trim())
                        .filter(Boolean)
                        .join(" ");
                }

                if (text && id) {
                    // Filter for known set prefixes to avoid capturing other filters (rarity, type, etc)
                    // Set IDs usually start with generation codes (sv, swsh, sm, xy, bw, hgss, dp, ex, base)
                    const lowerId = id.toLowerCase();
                    const isSet = /^(sv|swsh|sm|xy|bw|hgss|dp|ex|base|cel|det|pop|mcd|pwp|tk|si|col|pfe|dc|ru1|promo)/.test(lowerId);

                    if (isSet) {
                        results[id] = text;
                    }
                }
            });

            return results;
        });

        Object.assign(nameMap, mappings);

        if (Object.keys(nameMap).length === 0) {
            // Final fallback: Look for any checkable filter labels
            const fallbackMappings = await page.evaluate(() => {
                const results: Record<string, string> = {};
                const labels = document.querySelectorAll("label[for]");
                labels.forEach(l => {
                    const id = l.getAttribute("for");
                    const text = l.textContent?.trim();
                    if (id && text && id.length < 25 && (id.includes("sv") || id.includes("swsh") || id.includes("sm") || id.includes("xy"))) {
                        results[id] = text;
                    }
                });
                return results;
            });
            Object.assign(nameMap, fallbackMappings);
        }

        if (Object.keys(nameMap).length === 0) {
            throw new Error("No collections found in the DOM after expansion.");
        }
    } catch (err) {
        console.error("Failed to fetch name mappings:", err);
        logStep("Error: Could not fetch set list from Pokemon.com.");
    } finally {
        try {
            if (!page.isClosed()) await page.close();
        } catch (e) { }
        updateWorkers(-1);
    }

    for (const [key, name] of Object.entries(nameMap)) {
        sharedCollectionList.push({
            name: name,
            collectionCode: key.toUpperCase(),
            imageUrl: "",
            collectionUrl: `${url}/?${key}=on&advancedSubmit=`,
        });
    }

    if (franchise && language && sharedCollectionList.length > 0) {
        reportScraperChunk(send, sharedCollectionList, 0);

        logStep(`Scraped ${sharedCollectionList.length} collections...`);
        try {
            const result = await saveScrapedCollections(sharedCollectionList, {
                franchise,
                language,
            });
            if (result) {
                const { addedItems, matchedItems } = result;
                reportScraperStats(send, "collections", result);
                logStep(
                    `Successfully registered ${sharedCollectionList.length} English collections — ✅ ${addedItems.length} new, 🔁 ${matchedItems.length} matched.`,
                );
            }
        } catch (error) {
            console.error("Failed to save English sets:", error);
            logStep("Error: Could not register collections.");
        }
    }
}
