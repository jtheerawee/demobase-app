export interface ScraperOptions {
    url: string;
    type: string;
    franchise?: string;
    language?: string;
    scrapedIndex?: number;
    deepScrape?: boolean;
    context: any; // BrowserContext
    send: (data: unknown) => void;
    collectionId?: number | string;
    skipSave?: boolean;
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
    cardNo?: string;
    rarity?: string;
}

export interface ScrapedCollection {
    id?: number | string;
    name: string;
    collectionCode?: string;
    scrapedIndex?: number;
    imageUrl: string;
    collectionUrl: string;
    franchise?: string;
    language?: string;
}
