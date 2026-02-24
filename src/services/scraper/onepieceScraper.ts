import { scrapeOnepieceCardsEn, scrapeOnepieceCollectionsEn } from "@/services/scraper/onepieceScraperEn";
import { scrapeOnepieceCardsJp, scrapeOnepieceCollectionsJp } from "@/services/scraper/onepieceScraperJp";
import type { ScraperOptions } from "@/services/scraper/types";

/**
 * ENTRY POINT: Scrape One Piece Cards
 * Dispatches based on language.
 */
export async function scrapeOnepieceCards(options: ScraperOptions) {
    const { language } = options;
    if (language === "jp") {
        return scrapeOnepieceCardsJp(options);
    }
    return scrapeOnepieceCardsEn(options);
}

/**
 * ENTRY POINT: Scrape One Piece Collections
 */
export async function scrapeOnepieceCollections(options: ScraperOptions) {
    const { language } = options;
    if (language === "jp") {
        return scrapeOnepieceCollectionsJp(options);
    }
    return scrapeOnepieceCollectionsEn(options);
}
