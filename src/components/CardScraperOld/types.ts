import type {
    ScrapedCard as SharedScrapedCard,
    ScrapedCollection as SharedScrapedCollection,
} from "@/services/scraper/types";

export interface ScrapedCard extends SharedScrapedCard {
    isDeepScraped?: boolean;
    isBeingScraped?: boolean;
}

export interface ScrapedCollection extends SharedScrapedCollection {
    cardCount?: number;
}

export interface DebugInfo {
    request: unknown;
    responseStatus: number | null;
    responseBody: string;
    error: string | null;
}

export interface ScraperStep {
    timestamp: string;
    message: string;
}
