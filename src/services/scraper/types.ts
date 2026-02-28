export const SCRAPER_MESSAGE_TYPE = {
    CHUNK: "chunk",
    SAVED_COLLECTIONS: "savedCollections",
    SAVED_CARDS: "savedCards",
    STATS: "stats",
    WORKERS: "workers",
    STEP: "step",
    COMPLETE: "complete",
    META: "meta",
    CARD_UPDATE: "cardUpdate",
} as const;

export type ScraperMessageType = (typeof SCRAPER_MESSAGE_TYPE)[keyof typeof SCRAPER_MESSAGE_TYPE];

export interface ScraperOptions {
    url: string;
    type: string;
    franchise?: string;
    language?: string;
    deepScrape?: boolean;
    context: any; // BrowserContext
    send: (data: unknown) => void;
    collectionId?: number | string;
    skipSave?: boolean;
    cardLimit?: number;
    tcgUrlOnly?: boolean;
}

export interface ScraperResult {
    success: boolean;
    error?: string;
}

export interface ScrapedCard {
    id?: number | string;
    collectionId?: number | string;
    name: string;
    imageUrl: string;
    alt?: string;
    cardUrl: string;
    tcgUrl?: string;
    cardNo?: string;
    rarity?: string;
}

export interface ScrapedCollection {
    id?: number | string;
    name: string;
    collectionCode?: string;
    imageUrl: string;
    collectionUrl: string;
    franchise?: string;
    language?: string;
    releaseYear?: number;
}
