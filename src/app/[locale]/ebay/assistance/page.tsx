"use client";

import {
    Center,
    Container,
    Loader,
    SimpleGrid,
    Stack,
    Text,
} from "@mantine/core";
import { IconBolt } from "@tabler/icons-react";
import { EbayActiveFilters } from "@/components/EbayActiveFilters";
import { EbayActiveResults } from "@/components/EbayActiveResults";
import { PriceTrendAnalysis } from "@/components/PriceTrendAnalysis";
import { useCallback, useEffect, useState } from "react";
import type { EbayItem } from "@/services/ebayService";
import { createClient } from "@/utils/supabase/client";


export default function EbaySearchPage() {
    const supabase = createClient();
    const [query, setQuery] = useState("charizard 050");
    const [service, setService] = useState("psa");
    const [psa, setPsa] = useState<string>("10");
    const [minPrice, setMinPrice] = useState<number | string>("");
    const [maxPrice, setMaxPrice] = useState<number | string>("");
    const [listingType, setListingType] = useState<string>("auction");
    const [excludeJp, setExcludeJp] = useState(false);
    const [onlyUs, setOnlyUs] = useState(false);
    const [results, setResults] = useState<EbayItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [offset, setOffset] = useState(0);

    const handleSearch = useCallback(
        async (isLoadMore = false) => {
            if (isLoadMore) setLoadingMore(true);
            else {
                setLoading(true);
                setOffset(0);
            }
            setError(null);

            try {
                const currentOffset = isLoadMore ? offset + 10 : 0;
                let url = `/api/ebay/active?q=${encodeURIComponent(query)}&offset=${currentOffset}`;
                if (service && service !== "---") url += `&service=${service}`;
                if (psa && service !== "---") url += `&grade=${psa}`;
                if (minPrice) url += `&minPrice=${minPrice}`;
                if (maxPrice) url += `&maxPrice=${maxPrice}`;
                if (listingType) url += `&type=${listingType}`;

                if (excludeJp) url += `&excludeJp=true`;
                if (onlyUs) url += `&onlyUs=true`;

                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch(url, {
                    headers: {
                        Authorization: session ? `Bearer ${session.access_token}` : "",
                    },
                });
                if (!res.ok) throw new Error("Search failed");
                const raw = await res.json();
                // Normalize: API may return an array or { items: [...] }
                const data: EbayItem[] = Array.isArray(raw)
                    ? raw
                    : Array.isArray(raw?.items)
                        ? raw.items
                        : [];

                if (isLoadMore) {
                    setResults((prev) => [...prev, ...data]);
                    setOffset(currentOffset);
                } else {
                    setResults(data);
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

            alert("Search saved successfully!");
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        const delaySearch = setTimeout(() => {
            handleSearch(false);
        }, 500); // Debounce keyword typing
        return () => clearTimeout(delaySearch);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, service, psa, minPrice, maxPrice, listingType, excludeJp, onlyUs]);

    return (
        <Container size="xl" py="xl">
            <Stack gap="xl">
                <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg" style={{ alignItems: "start" }}>
                    {/* Left: Filters — 1 of 3 columns */}
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
                    {/* Right: Market Analysis — 2 of 3 columns */}
                    <div style={{ gridColumn: "span 2" }}>
                        <PriceTrendAnalysis results={results} />
                    </div>
                </SimpleGrid>

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
                            <Loader color="orange" size="xl" type="bars" />
                            <Text c="dimmed" size="sm">
                                Hunting for the best deals on eBay...
                            </Text>
                        </Stack>
                    </Center>
                ) : (
                    <EbayActiveResults
                        results={results}
                        loadingMore={loadingMore}
                        onLoadMore={() => handleSearch(true)}
                    />
                )}

                {!loading && results.length === 0 && !error && (
                    <Center py={100}>
                        <Stack align="center" gap="xs">
                            <IconBolt size={48} color="#ddd" />
                            <Text c="dimmed">No results found for your search filters.</Text>
                        </Stack>
                    </Center>
                )}
            </Stack>
        </Container>
    );
}
