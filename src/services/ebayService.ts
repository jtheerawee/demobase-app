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

interface EbaySearchItem {
    itemId: string;
    title: string;
    price: {
        value: string;
        currency: string;
    };
    currentBidPrice?: {
        value: string;
        currency: string;
    };
    image?: {
        imageUrl: string;
    };
    itemWebUrl: string;
    condition: string;
    itemEndDate?: string;
}

interface EbaySearchResult {
    itemSummaries?: EbaySearchItem[];
}

export async function getEbayAccessToken(): Promise<string> {
    const clientId = process.env.EBAY_CLIENT_ID;
    const clientSecret = process.env.EBAY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error("eBay credentials not found in environment variables");
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const response = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${auth}`,
        },
        body: new URLSearchParams({
            grant_type: "client_credentials",
            scope: "https://api.ebay.com/oauth/api_scope",
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error("eBay OAuth Error:", error);
        throw new Error("Failed to get eBay access token");
    }

    const data = await response.json();
    return data.access_token;
}

export interface EbaySearchOptions {
    q: string;
    psaGrade?: number;
    minPrice?: number;
    maxPrice?: number;
    listingType?: "AUCTION" | "FIXED_PRICE";
    offset?: number;
}

export async function searchEbay(options: EbaySearchOptions): Promise<EbayItem[]> {
    const token = await getEbayAccessToken();

    // 1. Build Query (Keywords)
    let queryStr = options.q;
    if (options.psaGrade) {
        queryStr += ` "PSA ${options.psaGrade}"`;
    }

    const filters: string[] = [];
    if (options.minPrice !== undefined || options.maxPrice !== undefined) {
        const min = options.minPrice ?? 0;
        const max = options.maxPrice ?? 999999;
        filters.push(`price:[${min}..${max}]`);
    }
    if (options.listingType) {
        filters.push(`buyingOptions:{${options.listingType}}`);
    }

    const filterParam = filters.length > 0 ? `&filter=${encodeURIComponent(filters.join(","))}` : "";

    // 3. Determine Sort
    let sortParam = "";
    if (options.listingType === "AUCTION") {
        sortParam = "&sort=endingSoonest";
    } else if (options.listingType === "FIXED_PRICE") {
        sortParam = "&sort=price";
    }

    // Browse API Search
    const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(
        queryStr
    )}&limit=10${filterParam}${sortParam}${options.offset ? `&offset=${options.offset}` : ""}`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        },
    });

    if (!response.ok) {
        const error = await response.text();
        console.error("eBay Search Error:", error);
        throw new Error("Failed to search eBay");
    }

    const data = (await response.json()) as EbaySearchResult;
    const items = data.itemSummaries || [];

    return items.map((item: EbaySearchItem) => {
        const auctionPrice = item.currentBidPrice;
        const priceObj = auctionPrice || item.price;

        return {
            id: item.itemId || "",
            title: item.title || "No Title",
            price: priceObj?.value || "0.00",
            currency: priceObj?.currency || "USD",
            imageUrl: item.image?.imageUrl || "",
            itemUrl: item.itemWebUrl || "",
            location: "US",
            condition: item.condition || "Unknown",
            endTime: item.itemEndDate,
        };
    });
}
