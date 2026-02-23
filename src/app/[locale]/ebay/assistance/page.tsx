"use client";

import {
    Center,
    Container,
    Group,
    Loader,
    SegmentedControl,
    SimpleGrid,
    Stack,
    Text,
} from "@mantine/core";
import { IconBolt } from "@tabler/icons-react";
import { EbayActiveFilters } from "@/components/EbayActiveFilters";
import { EbayActiveResults } from "@/components/EbayActiveResults";
import { EbaySearchList } from "@/components/EbaySearchList";
import { EbayApiInspector } from "@/components/EbayApiInspector";
import { PriceTrendAnalysis } from "@/components/PriceTrendAnalysis";
import { useCallback, useEffect, useState } from "react";
import type { EbayItem } from "@/services/ebayService";
import { createClient } from "@/utils/supabase/client";
import { notifications } from "@mantine/notifications";

const EBAY_ITEMS_PER_PAGE = parseInt(process.env.NEXT_PUBLIC_EBAY_ITEMS_PER_PAGE || "8", 8);

export default function EbaySearchPage() {
    const supabase = createClient();
    const [query, setQuery] = useState("pikachu 198");
    const [service, setService] = useState("psa");
    const [psa, setPsa] = useState<string>("10");
    const [minPrice, setMinPrice] = useState<number | string>("");
    const [maxPrice, setMaxPrice] = useState<number | string>("");
    const [listingType, setListingType] = useState<string>("auction");
    const [excludeJp, setExcludeJp] = useState(false);
    const [onlyUs, setOnlyUs] = useState(false);
    const [activeResults, setActiveResults] = useState<EbayItem[]>([]);
    const [soldResults, setSoldResults] = useState<EbayItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [offset, setOffset] = useState(0);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Debug raw data
    const [activeRaw, setActiveRaw] = useState<any>(null);
    const [soldRaw, setSoldRaw] = useState<any>(null);
    const [displayMode, setDisplayMode] = useState<"active" | "sold">("active");

    const handleSearch = useCallback(
        async (isLoadMore = false) => {
            if (isLoadMore) setLoadingMore(true);
            else {
                setLoading(true);
                setOffset(0);
            }
            setError(null);

            try {
                const currentOffset = isLoadMore ? offset + EBAY_ITEMS_PER_PAGE : 0;
                let url = `/api/ebay/active?q=${encodeURIComponent(query)}&offset=${currentOffset}`;
                if (service && service !== "---") url += `&service=${service}`;
                if (psa && service !== "---") url += `&grade=${psa}`;
                if (minPrice) url += `&minPrice=${minPrice}`;
                if (maxPrice) url += `&maxPrice=${maxPrice}`;
                if (listingType) url += `&type=${listingType}`;

                if (excludeJp) url += `&excludeJp=true`;
                if (onlyUs) url += `&onlyUs=true`;

                const { data: { session } } = await supabase.auth.getSession();
                const headers = {
                    Authorization: session ? `Bearer ${session.access_token}` : "",
                };

                // 1. Fetch Active
                const resActive = await fetch(url, { headers });
                if (!resActive.ok) throw new Error("Active search failed");
                const rawActive = await resActive.json();
                setActiveRaw(rawActive);

                // 2. Fetch Sold (if not loading more)
                if (!isLoadMore) {
                    let soldUrl = `/api/ebay/sold?q=${encodeURIComponent(query)}`;
                    if (service && service !== "---") soldUrl += `&service=${service}`;
                    if (psa && service !== "---") soldUrl += `&grade=${psa}`;
                    if (minPrice) soldUrl += `&minPrice=${minPrice}`;
                    if (maxPrice) soldUrl += `&maxPrice=${maxPrice}`;
                    if (excludeJp) soldUrl += `&excludeJp=true`;
                    if (onlyUs) soldUrl += `&onlyUs=true`;

                    const resSold = await fetch(soldUrl, { headers });
                    if (resSold.ok) {
                        const rawSold = await resSold.json();
                        setSoldRaw(rawSold);
                        let soldItems: EbayItem[] = Array.isArray(rawSold)
                            ? rawSold
                            : Array.isArray(rawSold?.items)
                                ? rawSold.items
                                : [];

                        // Enrich Sold Results with Batch Details
                        if (soldItems.length > 0) {
                            try {
                                const ids = soldItems.map(i => i.id).join(",");
                                const resBatch = await fetch(`/api/ebay/batch?ids=${ids}`, { headers });
                                if (resBatch.ok) {
                                    const enriched = await resBatch.json();
                                    if (Array.isArray(enriched)) soldItems = enriched;
                                }
                            } catch (e) {
                                console.error("Sold Batch Enrichment Error:", e);
                            }
                        }
                        setSoldResults(soldItems);
                    } else {
                        setSoldResults([]);
                    }
                }

                let data: EbayItem[] = Array.isArray(rawActive)
                    ? rawActive
                    : Array.isArray(rawActive?.items)
                        ? rawActive.items
                        : [];

                // Enrich Active Results with Batch Details
                if (data.length > 0) {
                    try {
                        const ids = data.map(i => i.id).join(",");
                        const resBatch = await fetch(`/api/ebay/batch?ids=${ids}`, { headers });
                        if (resBatch.ok) {
                            const enriched = await resBatch.json();
                            if (Array.isArray(enriched)) data = enriched;
                        }
                    } catch (e) {
                        console.error("Active Batch Enrichment Error:", e);
                    }
                }

                if (isLoadMore) {
                    setActiveResults((prev) => [...prev, ...data]);
                    setOffset(currentOffset);
                } else {
                    setActiveResults(data);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [query, service, psa, minPrice, maxPrice, listingType, excludeJp, onlyUs, offset]
    );

    // Auto-search on mount if query exists
    useEffect(() => {
        if (query) {
            handleSearch();
        }
    }, []); // Run once on mount

    const handleSaveSearch = async () => {
        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch("/api/ebay/save-search", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: session ? `Bearer ${session.access_token}` : "",
                },
                body: JSON.stringify({
                    query,
                    service,
                    psaGrade: psa,
                    minPrice: minPrice || null,
                    maxPrice: maxPrice || null,
                    listingType,
                    excludeJp,
                    onlyUs,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to save search");
            }

            notifications.show({
                title: "Success",
                message: "Search saved successfully!",
                color: "green",
            });
            setRefreshTrigger((n) => n + 1);
        } catch (err: any) {
            notifications.show({
                title: "Error",
                message: err.message,
                color: "red",
            });
        } finally {
            setSaving(false);
        }
    };


    return (
        <Container size="xl" py="xl">
            <Stack gap="xl">
                <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg" style={{ alignItems: "start" }}>
                    <Stack gap="md">
                        <EbayActiveFilters
                            query={query}
                            onQueryChange={setQuery}
                            service={service}
                            onServiceChange={setService}
                            psa={psa}
                            onPsaChange={setPsa}
                            minPrice={minPrice}
                            onMinPriceChange={setMinPrice}
                            maxPrice={maxPrice}
                            onMaxPriceChange={setMaxPrice}
                            listingType={listingType}
                            onListingTypeChange={setListingType}
                            excludeJp={excludeJp}
                            onExcludeJpChange={setExcludeJp}
                            onlyUs={onlyUs}
                            onOnlyUsChange={setOnlyUs}
                            onSearch={handleSearch}
                            onSaveSearch={handleSaveSearch}
                            loading={loading}
                            saving={saving}
                        />
                        <EbaySearchList
                            refreshTrigger={refreshTrigger}
                            onSelect={(s) => {
                                setQuery(s.query);
                                setService(s.service);
                                setPsa(s.psa);
                                setMinPrice(s.minPrice);
                                setMaxPrice(s.maxPrice);
                                setListingType(s.listingType);
                                setExcludeJp(s.excludeJp);
                                setOnlyUs(s.onlyUs);
                            }}
                        />
                        {process.env.NEXT_PUBLIC_DEVELOPER_MODE === "true" && (
                            <EbayApiInspector
                                activeRaw={activeRaw}
                                soldRaw={soldRaw}
                            />
                        )}
                    </Stack>
                    <div style={{ gridColumn: "span 2" }}>
                        <Stack gap="xl">
                            <PriceTrendAnalysis results={soldResults} />

                            {error && (
                                <Center py="xl">
                                    <Text color="red" fw={500}>
                                        {error}
                                    </Text>
                                </Center>
                            )}

                            {loading ? (
                                <Center py={100}>
                                    <Stack align="center">
                                        <Loader color="orange" size="xl" type="dots" />
                                        <Text c="dimmed" size="sm">
                                            Hunting for the best deals on eBay...
                                        </Text>
                                    </Stack>
                                </Center>
                            ) : (
                                <>
                                    {process.env.NEXT_PUBLIC_DEVELOPER_MODE === "true" && (
                                        <Group justify="flex-end" mb="md">
                                            <SegmentedControl
                                                size="xs"
                                                color="orange"
                                                value={displayMode}
                                                onChange={(value: any) => setDisplayMode(value)}
                                                data={[
                                                    { label: "Active Results", value: "active" },
                                                    { label: "Sold Results", value: "sold" },
                                                ]}
                                            />
                                        </Group>
                                    )}

                                    <EbayActiveResults
                                        results={displayMode === "active" ? activeResults : soldResults}
                                        loadingMore={loadingMore}
                                        onLoadMore={() => handleSearch(true)}
                                    />

                                    {activeResults.length === 0 && !error && !loading && (
                                        <Center py={100}>
                                            <Stack align="center" gap="xs">
                                                <IconBolt size={48} color="#ddd" />
                                                <Text c="dimmed">No results found for your search filters.</Text>
                                            </Stack>
                                        </Center>
                                    )}
                                </>
                            )}
                        </Stack>
                    </div>
                </SimpleGrid>
            </Stack>
        </Container>
    );
}
