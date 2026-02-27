import type { ScraperOptions } from "../types";
import { scrapePokemonCardsEn } from "./pokemonCardScraperEn";
import { scrapePokemonCardsTh } from "./pokemonCardScraperTh";
import { scrapePokemonCollectionsEn } from "./pokemonCollectionScraperEn";
import { scrapePokemonCollectionsTh } from "./pokemonCollectionScraperTh";
import {
    scrapeTCGPlayerCards,
    scrapeTCGPlayerCollections,
} from "../tcgplayer/tcgPlayerScraper";

/**
 * ENTRY POINT: Scrape Pokemon Cards
 * Dispatches to Th, Jp, or En version based on language.
 */
export async function scrapePokemonCards(options: ScraperOptions) {
    const { language } = options;
    if (language === "th") {
        return scrapePokemonCardsTh(options);
    } else if (language === "jp") {
        return scrapeTCGPlayerCards(options);
    }
    // Default to English
    return scrapePokemonCardsEn(options);
}

/**
 * ENTRY POINT: Scrape Pokemon Collections
 * Dispatches to Th, Jp, or En version based on language.
 */
export async function scrapePokemonCollections(options: ScraperOptions) {
    const { language } = options;
    if (language === "th") {
        return scrapePokemonCollectionsTh(options);
    } else if (language === "jp") {
        return scrapeTCGPlayerCollections(options);
    }
    // Default to English
    return scrapePokemonCollectionsEn(options);
}
