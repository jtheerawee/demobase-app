import { saveScrapedCollections } from "@/services/scraper/persistence";
import type { ScraperOptions } from "@/services/scraper/types";
import { CARD_SCRAPER_CONFIG } from "@/constants/card_scraper";
import { createStepLogger, reportScraperStats, reportScraperChunk } from "@/services/scraper/utils";

export async function scrapePokemonCollectionsEn({ url, context, send, franchise, language }: ScraperOptions) {
    const logStep = createStepLogger(send);

    logStep(`Step 1: ${franchise}. Fetching sets...`);

    const sharedCollectionList: any[] = [];
    // Map to store key -> Name transitions
    const nameMap: Record<string, string> = {};

    try {
        const page = await context.newPage();

        logStep(`Step 2: Navigating to ${url}...`);
        // Use a more realistic user agent if possible through context, but here we just navigate
        await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: CARD_SCRAPER_CONFIG.PAGE_LOAD_TIMEOUT,
        });

        logStep("Step 3: Activating Advanced Search filters...");
        // 1. Click "Show Advanced Search"
        // Try multiple selectors and wait for it to be visible
        const advancedBtnSelector = "span.filter-title, #toggleWrapperMainText, .filter-title";
        await page
            .waitForSelector(advancedBtnSelector, {
                timeout: CARD_SCRAPER_CONFIG.SELECTOR_WAIT_TIMEOUT,
            })
            .catch(() => {});

        const advancedBtn = await page.$(advancedBtnSelector);
        if (advancedBtn) {
            await advancedBtn.click();
            // Wait for expansion animation
            await page.waitForTimeout(1000);
        }

        logStep("Expanding the 'Expansions' section...");
        // 2. Click "Expansions" header
        const expansionHeaderSelector =
            "header:has-text('Expansions'), div.column-12:has-text('Expansions'), .expansion-filter header";
        logStep("Waiting for Expansions section...");
        await page
            .waitForSelector(expansionHeaderSelector, {
                timeout: CARD_SCRAPER_CONFIG.SELECTOR_WAIT_TIMEOUT,
            })
            .catch(() => {
                console.warn("Expansion header selector timeout");
            });

        const expansionSection = await page.$(expansionHeaderSelector);
        if (expansionSection) {
            logStep("Clicking Expansions section...");
            await expansionSection.scrollIntoViewIfNeeded().catch(() => {});
            await expansionSection
                .click({
                    force: true,
                    timeout: CARD_SCRAPER_CONFIG.SELECTOR_WAIT_TIMEOUT,
                })
                .catch((e: any) => {
                    console.warn("Expansion click failed", e);
                });
            await page.waitForTimeout(1000);
        } else {
            logStep("Warning: Expansions section not found, proceeding anyway...");
        }

        logStep("Scraping set names from filters...");
        // Scroll down a bit to ensure lazy-loaded labels are triggered
        await page.evaluate(() => window.scrollBy(0, 500));
        await page.waitForTimeout(500);

        // Extract labels
        const mappings = await page.evaluate(() => {
            const results: Record<string, string> = {};
            const labels = document.querySelectorAll("label.pill-control__label");

            if (labels.length === 0) {
                // Try a broader search if the specific class failed
                const altLabels = document.querySelectorAll("label[for]");
                altLabels.forEach((l) => {
                    const id = l.getAttribute("for");
                    const text = l.textContent?.trim();
                    if (id && text && id.length < 20) results[id] = text;
                });
            } else {
                labels.forEach((label) => {
                    const id = label.getAttribute("for");
                    const span = label.querySelector("span");
                    if (id && span) {
                        results[id] = span.innerText.trim();
                    }
                });
            }
            return results;
        });

        Object.assign(nameMap, mappings);

        if (Object.keys(nameMap).length === 0) {
            throw new Error("No collections found in the DOM.");
        }

        await page.close();
    } catch (err) {
        console.error("Failed to fetch name mappings:", err);
        logStep("Error: Could not fetch set list from Pokemon.com.");
        return;
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
