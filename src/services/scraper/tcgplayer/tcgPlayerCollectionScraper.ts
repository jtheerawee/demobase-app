import { APP_CONFIG } from "@/constants/app";
import { CARD_SCRAPER_CONFIG } from "@/constants/card_scraper";
import { saveScrapedCollections } from "@/services/scraper/persistence";
import type { ScraperOptions } from "@/services/scraper/types";
import { SCRAPER_MESSAGE_TYPE } from "@/services/scraper/types";
import { createStepLogger, reportScraperStats } from "@/services/scraper/utils";

export async function scrapeTCGPlayerCollections(options: ScraperOptions) {
    const { url, context, send, franchise, language } = options;
    const logStep = createStepLogger(send);

    logStep(`Fetching ${franchise} collections from TCGPlayer...`);

    const sharedCollectionList: any[] = [];

    try {
        const page = await context.newPage();

        logStep(`Navigating to ${url}...`);
        await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: CARD_SCRAPER_CONFIG.PAGE_LOAD_TIMEOUT,
        });

        logStep("Opening the 'Set' filter dropdown...");

        // Toggle the "Set" filter popover
        // TCGPlayer uses a button with a div inside containing "Set"
        const setToggleSelector = "button.hfb-popover__button";
        await page.waitForSelector(setToggleSelector, { timeout: 15000 });

        const buttons = await page.$$(setToggleSelector);
        let found = false;
        for (const btn of buttons) {
            const text = (await btn.innerText()).trim();
            // Case-insensitive check and allow partial match if needed, but "Set" is the primary target
            if (text.toLowerCase() === "set" || text.includes("Set")) {
                await btn.click();

                // Wait for ANY search-filter facets or popover content if the specific scrollable one fails
                try {
                    await page.waitForSelector(
                        ".hfb-popover .search-filter__facets, .hfb-popover .search-filter__facet",
                        { timeout: 10000 },
                    );
                } catch (e) {
                    console.warn(
                        `[${franchise} Scraper] Specific facet container not found, trying general popover content...`,
                    );
                    await page.waitForSelector(".hfb-popover", {
                        timeout: 5000,
                    });
                }

                await page.waitForTimeout(1000); // Animation buffer
                found = true;
                break;
            }
        }

        if (!found) {
            throw new Error("Could not find the 'Set' filter button.");
        }

        logStep("Extracting collection names from the dropdown...");

        // Extract mappings (name and slug)
        const collections = await page.evaluate(() => {
            const results: { name: string; slug: string }[] = [];

            // Try specific container first, then fall back to ANY facets if it's somehow different
            const container =
                document.querySelector(
                    ".hfb-popover .search-filter__facets.scrollable",
                ) ||
                document.querySelector(".hfb-popover") ||
                document;

            const items = container.querySelectorAll(
                ".search-filter__facet, .search-filter__facet__facet-name",
            );

            items.forEach((item) => {
                // Try label first, then just take innerText of the whole facet item
                const label =
                    item.querySelector(".tcg-input-checkbox__label") || item;

                // Get name from spans or textContent
                const spans = label.querySelectorAll("span");
                let name = "";
                if (spans.length > 0) {
                    name = spans[spans.length - 1].textContent?.trim() || "";
                } else {
                    name = label.textContent?.trim() || "";
                }

                // Remove trailing facet counts like (256)
                name = name.replace(/\s*\(\d+\)$/, "").trim();

                if (name && name !== "Set") {
                    // Avoid header text
                    const slug = name
                        .toLowerCase()
                        .replace(/['’]/g, "")
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-+|-+$/g, "");

                    results.push({ name, slug });
                }
            });
            return results;
        });

        for (const col of collections) {
            // Map the slug to a set number if available, otherwise fallback to slug
            const setMap =
                franchise === "pokemon"
                    ? APP_CONFIG.POKEMON_SET_MAP
                    : APP_CONFIG.LORCANA_SET_MAP;
            const setCode = setMap[col.slug] || col.slug.toUpperCase();

            // Construct URL dynamically from the base url
            let targetUrl = url;
            if (!targetUrl.includes("setName=")) {
                targetUrl = targetUrl.includes("?")
                    ? `${targetUrl}&setName=${col.slug}`
                    : `${targetUrl}?setName=${col.slug}`;
            }

            sharedCollectionList.push({
                name: col.name,
                collectionCode: setCode,
                imageUrl: "", // Icons are not available in the dropdown
                collectionUrl: targetUrl,
            });
        }

        logStep(`Found ${sharedCollectionList.length} collections: ${sharedCollectionList
            .map((c) => c.name)
            .slice(0, 3)
            .join(", ")}...`);

        await page.close();
    } catch (err) {
        console.error(`Failed to fetch ${franchise} collections:`, err);
        logStep("Error: Could not fetch set list from TCGPlayer. " +
            (err instanceof Error ? err.message : String(err)));
        return;
    }

    if (franchise && language && sharedCollectionList.length > 0) {
        // Send to UI immediately for feedback
        send({
            type: SCRAPER_MESSAGE_TYPE.CHUNK,
            items: sharedCollectionList,
            startIndex: 0,
        });

        logStep(`Scraped ${sharedCollectionList.length} collections from TCGPlayer. Registering...`);

        try {
            const result = await saveScrapedCollections(sharedCollectionList, {
                franchise,
                language,
            });
            if (result) {
                const { saved, addedItems, matchedItems } = result;
                reportScraperStats(send, "collections", result);
                logStep(`Successfully registered ${sharedCollectionList.length} ${franchise} collections — ✅ ${addedItems.length} new, 🔁 ${matchedItems.length} matched.`);
            }
        } catch (error) {
            console.error(`Failed to save ${franchise} sets:`, error);
            logStep("Error: Could not register collections.");
        }
    }
}
