export const CARD_SCRAPER_CONFIG = {
    // Scraper
    COLLECTION_CONCURRENCY_LIMIT: 4,
    CARD_CONCURRENCY_LIMIT: 10,
    NUM_COLLECTIONS_TO_DOWNLOAD_CARDS_LIMIT: 5,
    GRID_COLS: 10,
    PAGE_LOAD_DELAY_MS: 500,
    NUM_SCRAPED_CARDS_PER_COLLECTION: 50,
    RUNNING_STEPS_LIMIT: 5,
} as const;

export const SCRAPER_STEP_STATUS = {
    PENDING: "pending",
    RUNNING: "running",
    COMPLETED: "completed",
    ERROR: "error",
} as const;

export type ScraperStepStatus = (typeof SCRAPER_STEP_STATUS)[keyof typeof SCRAPER_STEP_STATUS];
