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
    listingType?: "auction" | "fixed_price";
    offset?: number;
}
