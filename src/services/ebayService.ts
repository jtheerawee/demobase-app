export interface EbayItem {
    itemId: string | null;
    title: string;
    price: string;
    currency: string;
    endDate: string | null;
    listingType: "auction" | "fixed_price" | "unknown";
    bids: number | null;
    imageUrl: string | null;
    itemUrl: string;
    itemLocation: string | null;
    gradeInfo?: {
        grader: string | null;
        grade: string | null;
        certNumber: string | null;
    } | null;
    seller?: {
        username: string;
        feedbackScore: number;
        feedbackPercentage: string;
    } | null;
}

export interface EbaySearchResult {
    keyword: string;
    page: number;
    mode: "sold" | "active";
    filters: {
        grade: number | null;
        excludeJp: boolean;
        onlyUs: boolean;
        listingType?: "auction" | "fixed_price";
    };
    ebayUrl: string;
    items: EbayItem[];
}

export interface EbaySearchOptions {
    q: string;
    psaGrade?: number;
    minPrice?: number;
    maxPrice?: number;
    listingType?: "auction" | "fixed_price";
    offset?: number;
}
