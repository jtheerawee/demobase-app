export interface EbayItem {
    id: string;
    title: string;
    price: string;
    currency: string;
    imageUrl: string;
    itemUrl: string;
    location?: string;
    condition: string;
    endTime?: string;
    originalPrice?: string;
    originalCurrency?: string;
}

export interface EbaySearchOptions {
    q: string;
    psaGrade?: number;
    minPrice?: number;
    maxPrice?: number;
    listingType?: "AUCTION" | "FIXED_PRICE";
    offset?: number;
}
