import { saveScrapedCollections } from "@/services/scraper/persistence";
import type { ScraperOptions } from "@/services/scraper/types";

// ==========================================
// ONE PIECE COLLECTION SCRAPER
// ==========================================

export async function scrapeOnepieceCollections({
    url,
    context,
    send,
    franchise,
    language,
}: ScraperOptions) {
    send({
        type: "step",
        message: "Discovering One Piece collections...",
    });

    const workerPage = await context.newPage();
    try {
        send({
            type: "step",
            message: `Navigating to: ${url}`,
        });
        await workerPage.goto(url, {
            waitUntil: "networkidle",
            timeout: 60000,
        });

        send({
            type: "step",
            message: "Opening series selector modal...",
        });
        // Match the button provided by the user
        await workerPage.click(
            'button[data-selmodalbtn="series"]',
        );

        // Wait for list items that actually have content (avoiding empty placeholders)
        // Using state: 'attached' because visibility checks on modals can be flaky during animations
        await workerPage.waitForSelector(
            'li.selModalClose[data-value]:not([data-value=""])',
            {
                state: "attached",
                timeout: 15000,
            },
        );

        // Small sleep to ensure the modal content is fully populated/rendered
        await workerPage.waitForTimeout(1000);

        const collections = await workerPage.evaluate(
            () => {
                const listItems = document.querySelectorAll(
                    'li.selModalClose[data-value]:not([data-value=""])',
                );
                return Array.from(listItems)
                    .map((el) => {
                        const li = el as HTMLLIElement;
                        const value =
                            li.getAttribute("data-value") ||
                            "";
                        const name =
                            li.textContent
                                ?.trim()
                                .replace(/\s+/g, " ") ||
                            "Unknown Set";

                        // Construct URL
                        const baseUrl =
                            window.location.origin +
                            window.location.pathname;
                        const collectionUrl = `${baseUrl}?series=${value}`;

                        // Extract pack code from brackets e.g. "BOOSTER PACK -ROYAL BLOOD- [OP-10]" → "OP-10"
                        const codeMatch = name.match(
                            /\[([A-Z0-9\-]+)\]\s*$/,
                        );
                        const collectionCode = codeMatch
                            ? codeMatch[1]
                            : value;

                        // Extract short name from dashes e.g. "BOOSTER PACK -ROYAL BLOOD- [OP-10]" → "ROYAL BLOOD"
                        const shortNameMatch =
                            name.match(/-([^-]+)-\s*\[/);
                        const displayName = shortNameMatch
                            ? shortNameMatch[1].trim()
                            : name;

                        return {
                            name: displayName,
                            collectionCode,
                            imageUrl: "",
                            collectionUrl,
                        };
                    })
                    .filter(
                        (c) =>
                            c.collectionCode &&
                            c.name.toUpperCase() !== "ALL",
                    );
            },
        );

        if (
            franchise &&
            language &&
            collections.length > 0
        ) {
            send({
                type: "step",
                message: `Found ${collections.length} One Piece collections.`,
            });
            send({
                type: "chunk",
                items: collections,
                startIndex: 0,
            });
            const result = await saveScrapedCollections(
                collections,
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
                    message: `Successfully registered ${collections.length} One Piece collections — ✅ ${added} new, 🔁 ${matched} matched.`,
                });
            }
        } else {
            send({
                type: "step",
                message:
                    "No collections found in the series modal.",
            });
        }
    } finally {
        await workerPage.close();
    }
}
