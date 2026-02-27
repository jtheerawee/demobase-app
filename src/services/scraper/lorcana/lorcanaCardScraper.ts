import type { ScraperOptions } from "@/services/scraper/types";

// ==========================================
// LORCANA CARD SCRAPER LOGIC
// ==========================================

export async function scrapeLorcanaCards({
    url,
    context,
    send,
    franchise,
    language,
    collectionId,
}: ScraperOptions) {
    send({
        type: "step",
        message: "Lorcana card scraping is not yet implemented (coming soon).",
    });

    // Placeholder for future implementation
    send({
        type: "complete",
        success: true,
    });
}
