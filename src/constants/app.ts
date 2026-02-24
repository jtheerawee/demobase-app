export const APP_CONFIG = {
    // App
    APP_NAME: "DemoBase.app",

    // Scaper
    COLLECTION_CONCURRENCY_LIMIT: 4,
    CARD_CONCURRENCY_LIMIT: 10,
    NUM_COLLECTIONS_TO_DOWNLOAD_CARDS_LIMIT: 5,
    SCRAPER_GRID_COLS: 10,

    // MTG
    MTG_COLLECTION_URL: "https://gatherer.wizards.com/sets",
    SCRAPER_PAGE_LOAD_DELAY_MS: 0,
} as const;
