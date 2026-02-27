import { saveScrapedCollections } from "@/services/scraper/persistence";
import type { ScraperOptions } from "@/services/scraper/types";

// ==========================================
// ENGLISH (EN) COLLECTION SCRAPER LOGIC
// ==========================================

export async function scrapePokemonCollectionsEn({
    url,
    context,
    send,
    franchise,
    language,
}: ScraperOptions) {
    send({
        type: "step",
        message:
            "Fetching set name mapping from Pokemon.com...",
    });

    const sharedCollectionList: any[] = [];
    // Map to store key -> Name transitions
    const nameMap: Record<string, string> = {};

    try {
        const page = await context.newPage();

        send({
            type: "step",
            message: `Navigating to ${url}...`,
        });
        // Use a more realistic user agent if possible through context, but here we just navigate
        await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 60000,
        });

        send({
            type: "step",
            message:
                "Activating Advanced Search filters...",
        });
        // 1. Click "Show Advanced Search"
        // Try multiple selectors and wait for it to be visible
        const advancedBtnSelector =
            "span.filter-title, #toggleWrapperMainText, .filter-title";
        await page
            .waitForSelector(advancedBtnSelector, {
                timeout: 15000,
            })
            .catch(() => {});

        const advancedBtn = await page.$(
            advancedBtnSelector,
        );
        if (advancedBtn) {
            await advancedBtn.click();
            // Wait for expansion animation
            await page.waitForTimeout(1000);
        }

        send({
            type: "step",
            message:
                "Expanding the 'Expansions' section...",
        });
        // 2. Click "Expansions" header
        const expansionHeaderSelector =
            "header:has-text('Expansions'), div.column-12:has-text('Expansions'), .expansion-filter header";
        send({
            type: "step",
            message: "Waiting for Expansions section...",
        });
        await page
            .waitForSelector(expansionHeaderSelector, {
                timeout: 15000,
            })
            .catch(() => {
                console.warn(
                    "Expansion header selector timeout",
                );
            });

        const expansionSection = await page.$(
            expansionHeaderSelector,
        );
        if (expansionSection) {
            send({
                type: "step",
                message: "Clicking Expansions section...",
            });
            await expansionSection
                .scrollIntoViewIfNeeded()
                .catch(() => {});
            await expansionSection
                .click({ force: true, timeout: 5000 })
                .catch((e: any) => {
                    console.warn(
                        "Expansion click failed",
                        e,
                    );
                });
            await page.waitForTimeout(1000);
        } else {
            send({
                type: "step",
                message:
                    "Warning: Expansions section not found, proceeding anyway...",
            });
        }

        send({
            type: "step",
            message: "Scraping set names from filters...",
        });
        // Scroll down a bit to ensure lazy-loaded labels are triggered
        await page.evaluate(() => window.scrollBy(0, 500));
        await page.waitForTimeout(500);

        // Extract labels
        const mappings = await page.evaluate(() => {
            const results: Record<string, string> = {};
            const labels = document.querySelectorAll(
                "label.pill-control__label",
            );

            if (labels.length === 0) {
                // Try a broader search if the specific class failed
                const altLabels =
                    document.querySelectorAll("label[for]");
                altLabels.forEach((l) => {
                    const id = l.getAttribute("for");
                    const text = l.textContent?.trim();
                    if (id && text && id.length < 20)
                        results[id] = text;
                });
            } else {
                labels.forEach((label) => {
                    const id = label.getAttribute("for");
                    const span =
                        label.querySelector("span");
                    if (id && span) {
                        results[id] = span.innerText.trim();
                    }
                });
            }
            return results;
        });

        Object.assign(nameMap, mappings);

        if (Object.keys(nameMap).length === 0) {
            throw new Error(
                "No collections found in the DOM.",
            );
        }

        await page.close();
    } catch (err) {
        console.error(
            "Failed to fetch name mappings:",
            err,
        );
        send({
            type: "step",
            message:
                "Error: Could not fetch set list from Pokemon.com.",
        });
        return;
    }

    for (const [key, name] of Object.entries(nameMap)) {
        sharedCollectionList.push({
            name: name,
            collectionCode: key.toUpperCase(),
            imageUrl: "",
            collectionUrl: `https://www.pokemon.com/us/pokemon-tcg/pokemon-cards/?${key}=on&advancedSubmit=`,
        });
    }

    if (
        franchise &&
        language &&
        sharedCollectionList.length > 0
    ) {
        // Send to UI immediately for feedback
        send({
            type: "chunk",
            items: sharedCollectionList,
            startIndex: 0,
        });

        send({
            type: "step",
            message: `Scraped ${sharedCollectionList.length} collections from official site. Registering...`,
        });
        try {
            const result = await saveScrapedCollections(
                sharedCollectionList,
                {
                    franchise,
                    language,
                },
            );
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
                    message: `Successfully registered ${sharedCollectionList.length} English collections — ✅ ${added} new, 🔁 ${matched} matched.`,
                });
            }
        } catch (error) {
            console.error(
                "Failed to save English sets:",
                error,
            );
            send({
                type: "step",
                message:
                    "Error: Could not register collections.",
            });
        }
    }
}
