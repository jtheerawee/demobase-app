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
    // Search
    SEARCH_MIN_CHARS: 3,
    SEARCH_RESULTS_PER_ROW: 3,

    // Feature Toggles (Widgets)
    ENABLED_WIDGETS: {
        EBAY_ASSISTANCE: true,
        CARD_SCRAPER: true,
        CARD_MANAGER: true,

        // Card Scraper Page
        SCRAPER_RUNNING_STEPS: true,
        SCRAPER_STATS: true,

        // Card Manager Page
        CARD_MANAGER_COLLECTION: true,
        CARD_MANAGER_SEARCH: true,
    },
} as const;
