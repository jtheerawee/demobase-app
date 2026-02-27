import { saveScrapedCollections } from "@/services/scraper/persistence";
import type { ScraperOptions } from "@/services/scraper/types";

// ==========================================
// LORCANA COLLECTION SCRAPER LOGIC
// ==========================================

export async function scrapeLorcanaCollections({
    url,
    context,
    send,
    franchise,
    language,
}: ScraperOptions) {
    send({
        type: "step",
        message: "Fetching Lorcana collections from TCGPlayer...",
    });

    const sharedCollectionList: any[] = [];

    try {
        const page = await context.newPage();

        send({
            type: "step",
            message: `Navigating to ${url}...`,
        });
        await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 60000,
        });

        send({
            type: "step",
            message: "Opening the 'Set' filter dropdown...",
        });

        // Toggle the "Set" filter popover
        // TCGPlayer uses a button with a div inside containing "Set"
        const setToggleSelector = 'button.hfb-popover__button';
        await page.waitForSelector(setToggleSelector, { timeout: 15000 });

        const buttons = await page.$$(setToggleSelector);
        let found = false;
        for (const btn of buttons) {
            const text = await btn.innerText();
            if (text.includes("Set")) {
                await btn.click();
                await page.waitForTimeout(1000); // Wait for the popover to appear
                found = true;
                break;
            }
        }

        if (!found) {
            throw new Error("Could not find the 'Set' filter button.");
        }

        send({
            type: "step",
            message: "Extracting collection names from the dropdown...",
        });

        // Extract mappings (name and slug)
        const collections = await page.evaluate(() => {
            const results: { name: string; slug: string }[] = [];

            // Target the specific container for set facets
            const container = document.querySelector('.search-filter__facets.scrollable');
            const items = container
                ? container.querySelectorAll('.search-filter__facet')
                : document.querySelectorAll('.search-filter__facet'); // Fallback

            items.forEach(item => {
                const label = item.querySelector('.tcg-input-checkbox__label');
                if (label) {
                    // TCGPlayer structure: the name is often in a downstream span
                    // We'll take the text content which usually includes the name and sometimes count
                    // But we'll try to find the last span which usually has the clean name
                    const spans = label.querySelectorAll('span');
                    let name = "";
                    if (spans.length > 0) {
                        name = spans[spans.length - 1].textContent?.trim() || "";
                    } else {
                        name = label.textContent?.trim() || "";
                    }

                    if (name) {
                        // TCGPlayer slugs: kebab-case, remove apostrophes
                        const slug = name.toLowerCase()
                            .replace(/['’]/g, '')
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-+|-+$/g, '');

                        results.push({ name, slug });
                    }
                }
            });
            return results;
        });

        for (const col of collections) {
            sharedCollectionList.push({
                name: col.name,
                collectionCode: col.slug.toUpperCase(),
                imageUrl: "", // Icons are not available in the dropdown
                collectionUrl: `https://www.tcgplayer.com/search/lorcana-tcg/product?productLineName=lorcana-tcg&view=grid&setName=${col.slug}`,
            });
        }

        await page.close();
    } catch (err) {
        console.error("Failed to fetch Lorcana collections:", err);
        send({
            type: "step",
            message: "Error: Could not fetch set list from TCGPlayer. " + (err instanceof Error ? err.message : String(err)),
        });
        return;
    }

    if (franchise && language && sharedCollectionList.length > 0) {
        // Send to UI immediately for feedback
        send({
            type: "chunk",
            items: sharedCollectionList,
            startIndex: 0,
        });

        send({
            type: "step",
            message: `Scraped ${sharedCollectionList.length} collections from TCGPlayer. Registering...`,
        });

        try {
            const result = await saveScrapedCollections(sharedCollectionList, {
                franchise,
                language,
            });
            if (result) {
                const { saved, added, matched } = result;
                send({
                    type: "savedCollections",
                    items: saved,
                });
                send({
                    type: "stats",
                    category: "collections",
                    added,
                    matched,
                    missed: 0,
                });
                send({
                    type: "step",
                    message: `Successfully registered ${sharedCollectionList.length} Lorcana collections — ✅ ${added} new, 🔁 ${matched} matched.`,
                });
            }
        } catch (error) {
            console.error("Failed to save Lorcana sets:", error);
            send({
                type: "step",
                message: "Error: Could not register collections.",
            });
        }
    }
}
