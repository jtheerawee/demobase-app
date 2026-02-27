export const CARD_SCRAPER_CONFIG = {
    CONTAINER_SIZE: "2xl" as const,
    PANEL_SPANS: {
        INPUTS: 3,
        COLLECTIONS: 4,
        CARDS: 5,
    },
    CARDS_PER_ROW: 4,

    // Scraper
    COLLECTION_CONCURRENCY_LIMIT: 4,
    CARD_CONCURRENCY_LIMIT: 10,
    NUM_COLLECTIONS_TO_DOWNLOAD_CARDS_LIMIT: 5,
    GRID_COLS: 10,
    PAGE_LOAD_DELAY_MS: 500,
    NUM_SCRAPED_CARDS_PER_COLLECTION: 50,
    RUNNING_STEPS_LIMIT: 7,
    PAGE_LOAD_TIMEOUT: 60000,
    CARD_DETAILS_LOAD_TIMEOUT: 30000,
    SELECTOR_WAIT_TIMEOUT: 5000,
} as const;

export const SCRAPER_STEP_STATUS = {
    PENDING: "pending",
    RUNNING: "running",
    COMPLETED: "completed",
    ERROR: "error",
} as const;

export type ScraperStepStatus = (typeof SCRAPER_STEP_STATUS)[keyof typeof SCRAPER_STEP_STATUS];
