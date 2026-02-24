import { scrapeOnepieceCardsEn } from "@/services/scraper/onepieceCardScraperEn";
import { scrapeOnepieceCollectionsEn } from "@/services/scraper/onepieceCollectionScraperEn";
import { scrapeOnepieceCardsJp } from "@/services/scraper/onepieceCardScraperJp";
import { scrapeOnepieceCollectionsJp } from "@/services/scraper/onepieceCollectionScraperJp";
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
