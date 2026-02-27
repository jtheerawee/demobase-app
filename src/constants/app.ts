import { LORCANA_CONFIG } from "./franchises/lorcana";
import { MTG_CONFIG } from "./franchises/mtg";
import { ONEPIECE_CONFIG } from "./franchises/onepiece";
import { POKEMON_CONFIG } from "./franchises/pokemon";

export const APP_CONFIG = {
    // App
    APP_NAME: "DemoBase.app",
    APP_VERSION: "0.0.1",
    NOTIFICATION_AUTO_CLOSE: 5000,

    // Scaper
    COLLECTION_CONCURRENCY_LIMIT: 4,
    CARD_CONCURRENCY_LIMIT: 10,
    NUM_COLLECTIONS_TO_DOWNLOAD_CARDS_LIMIT: 5,
    SCRAPER_GRID_COLS: 10,
    SCRAPER_PAGE_LOAD_DELAY_MS: 500,
    NUM_SCRAPED_CARDS_PER_COLLECTION: 50,
    SCRAPER_RUNNING_STEPS_LIMIT: 5,

    // MTG
    MTG_URL_EN: MTG_CONFIG.URL_EN,
    MTG_RARITY_MAP: MTG_CONFIG.RARITY_MAP,

    // Pokemon
    POKEMON_URL_EN: POKEMON_CONFIG.URL_EN,
    POKEMON_URL_JP: POKEMON_CONFIG.URL_JP,
    POKEMON_URL_TH: POKEMON_CONFIG.URL_TH,
    POKEMON_RARITY_MAP: POKEMON_CONFIG.RARITY_MAP,
    POKEMON_SET_MAP: POKEMON_CONFIG.SET_MAP,

    // One piece
    ONEPIECE_URL_EN: ONEPIECE_CONFIG.URL_EN,
    ONEPIECE_URL_JP: ONEPIECE_CONFIG.URL_JP,

    // Lorcana
    LORCANA_URL_EN: LORCANA_CONFIG.URL_EN,
    LORCANA_RARITY_MAP: LORCANA_CONFIG.RARITY_MAP,
    LORCANA_SET_MAP: LORCANA_CONFIG.SET_MAP,

    // Search
    SEARCH_MIN_CHARS: 3,
    SEARCH_RESULTS_PER_ROW: 1,
    PREVIEW_IMAGE_WIDTH: 400,

    // Layout Spans (Mantine Grid 12-cols)
    CARD_MANAGER_LAYOUT: {
        COLLECTION_SPAN: 3, // 1/4
        RESULTS_SPAN: 3, // 1/4
        CONTROLS_SPAN: 6, // 2/4
    },
    CAMERA_DEVICES_WIDTH: "calc(33.33% - 15px)",

    // Card Kingdom
    // CKD_URL: "https://www.cardkingdom.com/mtg/lorwyn-eclipsed/formidable-speaker",
    // TCGPlayer
    // TCG_URL: "https://www.tcgplayer.com/product/619740/lorcana-tcg-archazias-island-tramp-enterprising-dog-enchanted?page=1&Language=all",
} as const;
