import type { ScraperOptions } from "../types";
import { scrapePokemonCardsEn } from "./pokemonCardScraperEn";
import { scrapePokemonCardsTh } from "./pokemonCardScraperTh";
import { scrapePokemonCollectionsEn } from "./pokemonCollectionScraperEn";
import { scrapePokemonCollectionsTh } from "./pokemonCollectionScraperTh";

/**
 * ENTRY POINT: Scrape Pokemon Cards
 * Dispatches to Th or En version based on language.
 */
export async function scrapePokemonCards(
    options: ScraperOptions,
) {
    const { language } = options;
    if (language === "th") {
        return scrapePokemonCardsTh(options);
    }
    // Default to English (covers "en", "jp", etc. if they use the En scraper logic or if En is fallback)
    return scrapePokemonCardsEn(options);
}

/**
 * ENTRY POINT: Scrape Pokemon Collections
 * Dispatches to Th or En version based on language.
 */
export async function scrapePokemonCollections(
    options: ScraperOptions,
) {
    const { language } = options;
    if (language === "th") {
        return scrapePokemonCollectionsTh(options);
    }
    // Default to English
    return scrapePokemonCollectionsEn(options);
}
