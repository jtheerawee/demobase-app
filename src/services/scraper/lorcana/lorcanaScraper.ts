import type { ScraperOptions } from "../types";
import { scrapeLorcanaCards } from "./lorcanaCardScraper";
import { scrapeLorcanaCollections } from "./lorcanaCollectionScraper";

/**
 * ENTRY POINT: Scrape Lorcana Cards
 */
export async function scrapeLorcanaCardsEntry(
    options: ScraperOptions,
) {
    return scrapeLorcanaCards(options);
}

/**
 * ENTRY POINT: Scrape Lorcana Collections
 */
export async function scrapeLorcanaCollectionsEntry(
    options: ScraperOptions,
) {
    return scrapeLorcanaCollections(options);
}
