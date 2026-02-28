import { SCRAPER_MESSAGE_TYPE } from "./types";

export function createWorkerUpdater(send: (msg: any) => void) {
    let activeWorkers = 0;
    return (delta: number) => {
        activeWorkers += delta;
        send({ type: SCRAPER_MESSAGE_TYPE.WORKERS, count: activeWorkers });
    };
}

export function createStepLogger(send: (msg: any) => void) {
    return (message: string) => {
        send({
            type: SCRAPER_MESSAGE_TYPE.STEP,
            message,
        });
    };
}

interface ScraperStatsResult {
    saved?: any[];
    addedItems?: any[];
    matchedItems?: any[];
    missedItems?: any[];
    discardedItems?: any[];
}

export function reportScraperStats(
    send: (msg: any) => void,
    category: "collections" | "cards",
    result: ScraperStatsResult,
) {
    if (category === "collections" && result.saved) {
        send({
            type: SCRAPER_MESSAGE_TYPE.SAVED_COLLECTIONS,
            items: result.saved,
        });
    }

    send({
        type: SCRAPER_MESSAGE_TYPE.STATS,
        category,
        addedItems: result.addedItems,
        matchedItems: result.matchedItems,
        missedItems: result.missedItems,
        ...(result.discardedItems && { discardedItems: result.discardedItems }),
    });
}

export function reportScraperMeta(
    send: (msg: any) => void,
    meta: {
        totalItems?: number;
        totalPages?: number;
        totalCards?: number;
    },
) {
    send({
        type: SCRAPER_MESSAGE_TYPE.META,
        ...meta,
    });
}

export function reportScraperChunk(send: (msg: any) => void, items: any[], startIndex: number = 0) {
    send({
        type: SCRAPER_MESSAGE_TYPE.CHUNK,
        items,
        startIndex,
    });
}

/**
 * Look up a rarity value in a map, with case-insensitive support.
 */
export function lookupRarity(rawRarity: string | null, map: Record<string, string>): string | null {
    const trimmed = rawRarity?.trim();
    if (!trimmed) return null;

    // Try exact match
    if (map[trimmed]) return map[trimmed];

    // Try case-insensitive match
    const lowerRaw = trimmed.toLowerCase();
    const foundKey = Object.keys(map).find((k) => k.toLowerCase() === lowerRaw);
    if (foundKey) return map[foundKey];

    // Fallback to the raw value if no match found
    return trimmed;
}
