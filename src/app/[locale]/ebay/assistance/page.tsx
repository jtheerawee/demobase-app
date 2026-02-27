"use client";

import {
    Center,
    Container,
    Group,
    Loader,
    SegmentedControl,
    SimpleGrid,
    Slider,
    Stack,
    Switch,
    Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBolt, IconShoppingCart } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EbayActiveFilters } from "@/components/EbayAssistance/EbayActiveFilters";
import { EbayActiveResults } from "@/components/EbayAssistance/EbayActiveResults";
import { EbayApiInspector } from "@/components/EbayAssistance/EbayApiInspector";
import { EbaySearchList } from "@/components/EbayAssistance/EbaySearchList";
import { MarketTrendAnalysis } from "@/components/EbayAssistance/MarketTrendAnalysis";
import { PageHeader } from "@/components/PageHeader";
import { EBAY_CONFIG } from "@/constants/ebay";
import type { EbayItem } from "@/services/ebayService";
import { createClient } from "@/utils/supabase/client";

const EBAY_ITEMS_PER_PAGE = EBAY_CONFIG.ITEMS_PER_PAGE;
const EBAY_OUTLIER_THRESHOLD = EBAY_CONFIG.OUTLIER_THRESHOLD;
const EBAY_OUTLIER_WINDOW_SAMPLES = EBAY_CONFIG.OUTLIER_WINDOW_SAMPLES;

export default function EbaySearchPage() {
    const t = useTranslations("EbayAssistance");
    const supabase = createClient();
    const [query, setQuery] = useState("");
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
    const [hideUnmatched, setHideUnmatched] = useState(
        EBAY_CONFIG.HIDE_UNMATCHED_SERVICES,
    );
    const [hideAbnormal, setHideAbnormal] = useState(
        EBAY_CONFIG.HIDE_ABNORMAL_PRICES,
    );
    const [threshold, setThreshold] = useState(EBAY_OUTLIER_THRESHOLD);
    const [hoveredDate, setHoveredDate] = useState<string | null>(null);
    const [doSearchTrigger, setDoSearchTrigger] = useState(0);
    const [lastSearchParams, setLastSearchParams] = useState<any>({});

    const handleSearch = useCallback(
        async (isLoadMore = false) => {
            if (isLoadMore) setLoadingMore(true);
            else {
                setLoading(true);
                setOffset(0);
                setActiveResults([]);
                setSoldResults([]);
                setActiveRaw(null);
                setSoldRaw(null);
                // Update header info immediately when fetch starts
                setLastSearchParams({
                    query,
                    service,
                    psa,
                    minPrice,
                    maxPrice,
                    excludeJp,
                    onlyUs,
                    listingType,
                });
            }
            setError(null);

            try {
                const currentOffset = isLoadMore
                    ? offset + EBAY_ITEMS_PER_PAGE
                    : 0;
                let url = `/api/ebay/active?q=${encodeURIComponent(query)}&offset=${currentOffset}`;
                if (service && service !== "---") url += `&service=${service}`;
                if (psa && service !== "---") url += `&grade=${psa}`;
                if (minPrice) url += `&minPrice=${minPrice}`;
                if (maxPrice) url += `&maxPrice=${maxPrice}`;
                if (listingType) url += `&type=${listingType}`;

                if (excludeJp) url += `&excludeJp=true`;
                if (onlyUs) url += `&onlyUs=true`;

                const {
                    data: { session },
                } = await supabase.auth.getSession();
                const headers = {
                    Authorization: session
                        ? `Bearer ${session.access_token}`
                        : "",
                };

                // 1. Fetch Active
                const resActive = await fetch(url, {
                    headers,
                });
                if (!resActive.ok) throw new Error("Active search failed");
                const rawActive = await resActive.json();
                setActiveRaw(rawActive);

                // 2. Fetch Sold (if not loading more)
                if (!isLoadMore) {
                    let soldUrl = `/api/ebay/sold?q=${encodeURIComponent(query)}`;
                    if (service && service !== "---")
                        soldUrl += `&service=${service}`;
                    if (psa && service !== "---") soldUrl += `&grade=${psa}`;
                    if (minPrice) soldUrl += `&minPrice=${minPrice}`;
                    if (maxPrice) soldUrl += `&maxPrice=${maxPrice}`;
                    if (excludeJp) soldUrl += `&excludeJp=true`;
                    if (onlyUs) soldUrl += `&onlyUs=true`;

                    const resSold = await fetch(soldUrl, {
                        headers,
                    });
                    if (resSold.ok) {
                        const rawSold = await resSold.json();
                        setSoldRaw(rawSold);

                        // Extract items from the new structure: rawSold.items
                        let soldItems: EbayItem[] = Array.isArray(
                            rawSold?.items,
                        )
                            ? rawSold.items
                            : [];

                        // Enrich Sold Results with Batch Details (if needed, though search might be enough now)
                        if (soldItems.length > 0) {
                            try {
                                const ids = soldItems
                                    .map((i) => i.itemId)
                                    .filter(Boolean)
                                    .join(",");
                                if (ids) {
                                    const resBatch = await fetch(
                                        `/api/ebay/batch?ids=${ids}`,
                                        { headers },
                                    );
                                    if (resBatch.ok) {
                                        const enriched = await resBatch.json();
                                        if (Array.isArray(enriched)) {
                                            soldItems = enriched.map(
                                                (item: any) => ({
                                                    ...item,
                                                    itemId: item.itemId,
                                                    title: item.title,
                                                    price:
                                                        item.price?.value ||
                                                        item.price ||
                                                        "0",
                                                    currency:
                                                        item.price?.currency ||
                                                        item.currency ||
                                                        "USD",
                                                    imageUrl:
                                                        item.image?.imageUrl ||
                                                        item.imageUrl ||
                                                        "",
                                                    itemUrl:
                                                        item.itemWebUrl ||
                                                        item.itemUrl ||
                                                        "",
                                                    itemLocation:
                                                        item.itemLocation
                                                            ? [
                                                                  item
                                                                      .itemLocation
                                                                      .city,
                                                                  item
                                                                      .itemLocation
                                                                      .stateOrProvince,
                                                                  item
                                                                      .itemLocation
                                                                      .country,
                                                              ]
                                                                  .filter(
                                                                      Boolean,
                                                                  )
                                                                  .join(", ")
                                                            : item.itemLocation,
                                                    endDate:
                                                        item.itemEndDate ||
                                                        item.endDate,
                                                }),
                                            );
                                        }
                                    }
                                }
                            } catch (e) {
                                console.error(
                                    "Sold Batch Enrichment Error:",
                                    e,
                                );
                            }
                        }
                        setSoldResults(soldItems);
                    } else {
                        setSoldResults([]);
                    }
                }

                // Extract items from rawActive.items
                let data: EbayItem[] = Array.isArray(rawActive?.items)
                    ? rawActive.items
                    : [];

                // Enrich Active Results with Batch Details
                if (data.length > 0) {
                    try {
                        const ids = data
                            .map((i) => i.itemId)
                            .filter(Boolean)
                            .join(",");
                        if (ids) {
                            const resBatch = await fetch(
                                `/api/ebay/batch?ids=${ids}`,
                                { headers },
                            );
                            if (resBatch.ok) {
                                const enriched = await resBatch.json();
                                if (Array.isArray(enriched)) {
                                    data = enriched.map((item: any) => ({
                                        ...item,
                                        itemId: item.itemId,
                                        title: item.title,
                                        price:
                                            item.price?.value ||
                                            item.price ||
                                            "0",
                                        currency:
                                            item.price?.currency ||
                                            item.currency ||
                                            "USD",
                                        imageUrl:
                                            item.image?.imageUrl ||
                                            item.imageUrl ||
                                            "",
                                        itemUrl:
                                            item.itemWebUrl ||
                                            item.itemUrl ||
                                            "",
                                        itemLocation: item.itemLocation
                                            ? [
                                                  item.itemLocation.city,
                                                  item.itemLocation
                                                      .stateOrProvince,
                                                  item.itemLocation.country,
                                              ]
                                                  .filter(Boolean)
                                                  .join(", ")
                                            : item.itemLocation,
                                        endDate:
                                            item.itemEndDate || item.endDate,
                                    }));
                                }
                            }
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
        [
            query,
            service,
            psa,
            minPrice,
            maxPrice,
            listingType,
            excludeJp,
            onlyUs,
            offset,
        ],
    );

    const filteredActiveResults = useMemo(() => {
        if (!hideUnmatched) return activeResults;
        return activeResults.filter((item) => {
            const grader = item.gradeInfo?.grader?.toUpperCase() || "";
            if (service && service !== "all") {
                const target = service.toUpperCase();
                if (target === "BGS")
                    return grader.includes("BGS") || grader.includes("BECKETT");
                return grader.includes(target);
            }
            return (
                grader.includes("PSA") ||
                grader.includes("CGC") ||
                grader.includes("BGS") ||
                grader.includes("BECKETT") ||
                grader.includes("SGC")
            );
        });
    }, [activeResults, hideUnmatched, service]);

    const filteredSoldResults = useMemo(() => {
        if (!hideUnmatched) return soldResults;
        return soldResults.filter((item) => {
            const grader = item.gradeInfo?.grader?.toUpperCase() || "";
            if (service && service !== "all") {
                const target = service.toUpperCase();
                if (target === "BGS")
                    return grader.includes("BGS") || grader.includes("BECKETT");
                return grader.includes(target);
            }
            return (
                grader.includes("PSA") ||
                grader.includes("CGC") ||
                grader.includes("BGS") ||
                grader.includes("BECKETT") ||
                grader.includes("SGC")
            );
        });
    }, [soldResults, hideUnmatched, service]);

    const cleanSoldResults = useMemo(() => {
        if (!hideAbnormal) return filteredSoldResults;

        const getNumericPrice = (p: any) => {
            if (typeof p === "number") return p;
            if (!p) return 0;
            const cleanStr = p.toString().replace(/[^0-9.]/g, "");
            return parseFloat(cleanStr) || 0;
        };

        const getDayTs = (dateStr: string) => {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return 0;
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        };

        // Ensure results are sorted by date for sample-based window logic
        const sortedResults = [...filteredSoldResults].sort((a, b) => {
            const dateA = new Date(
                a.endDate ||
                    (a as any).soldTime ||
                    (a as any).soldDate ||
                    (a as any).timestamp,
            ).getTime();
            const dateB = new Date(
                b.endDate ||
                    (b as any).soldTime ||
                    (b as any).soldDate ||
                    (b as any).timestamp,
            ).getTime();
            return dateA - dateB;
        });

        return sortedResults
            .filter((item, index, self) => {
                const itemPrice = getNumericPrice(item.price);
                if (itemPrice === 0) return true;

                // Only take N samples BEFORE the current index
                const start = Math.max(0, index - EBAY_OUTLIER_WINDOW_SAMPLES);
                const end = index - 1;

                const neighbors = [];
                if (end >= start) {
                    for (let i = start; i <= end; i++) {
                        neighbors.push(self[i]);
                    }
                }

                if (neighbors.length > 0) {
                    const pricesInWindow = neighbors
                        .map((other) => getNumericPrice(other.price))
                        .filter((p) => p > 0);
                    if (pricesInWindow.length === 0) return true;

                    const avgPriceInWindow = neighbors
                        .map((other) => getNumericPrice(other.price))
                        .filter((p) => p > 0)
                        .reduce((sum, p, _, arr) => sum + p / arr.length, 0);
                    return itemPrice <= avgPriceInWindow * threshold;
                }

                return true;
            })
            .reverse();
    }, [filteredSoldResults, hideAbnormal, threshold]);

    const handleSearchRef = useRef(handleSearch);
    useEffect(() => {
        handleSearchRef.current = handleSearch;
    }, [handleSearch]);

    useEffect(() => {
        if (doSearchTrigger > 0) {
            handleSearchRef.current();
        }
    }, [doSearchTrigger]);

    const handleSaveSearch = async () => {
        setSaving(true);
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            const res = await fetch("/api/ebay/save-search", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: session
                        ? `Bearer ${session.access_token}`
                        : "",
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
                title: t("saveSuccess"),
                message: t("saveSuccess"),
                color: "green",
            });
            setRefreshTrigger((n) => n + 1);
        } catch (err: any) {
            notifications.show({
                title: t("saveError"),
                message: err.message,
                color: "red",
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Container size="xl" py="md">
            <Stack gap="lg">
                <PageHeader
                    title="eBay Assistance"
                    description="Analyze active and sold listings to find the best market prices."
                    icon={
                        <IconShoppingCart
                            size={32}
                            stroke={1.5}
                            color="var(--mantine-color-orange-6)"
                        />
                    }
                />
                <SimpleGrid
                    cols={{ base: 1, md: 3 }}
                    spacing="lg"
                    style={{ alignItems: "start" }}
                >
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
                            onSelect={(s: any) => {
                                setQuery(s.query);
                                setService(s.service);
                                setPsa(s.psa);
                                setMinPrice(s.minPrice);
                                setMaxPrice(s.maxPrice);
                                setListingType(s.listingType);
                                setExcludeJp(s.excludeJp);
                                setOnlyUs(s.onlyUs);
                            }}
                            onExecute={(s: any) => {
                                setQuery(s.query);
                                setService(s.service);
                                setPsa(s.psa);
                                setMinPrice(s.minPrice);
                                setMaxPrice(s.maxPrice);
                                setListingType(s.listingType);
                                setExcludeJp(s.excludeJp);
                                setOnlyUs(s.onlyUs);
                                setDoSearchTrigger((n) => n + 1);
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
                            {lastSearchParams && (
                                <MarketTrendAnalysis
                                    results={cleanSoldResults}
                                    highlightedDate={hoveredDate}
                                    query={lastSearchParams.query}
                                    service={lastSearchParams.service}
                                    grade={lastSearchParams.psa}
                                    minPrice={lastSearchParams.minPrice}
                                    maxPrice={lastSearchParams.maxPrice}
                                    excludeJp={lastSearchParams.excludeJp}
                                    onlyUs={lastSearchParams.onlyUs}
                                    listingType={lastSearchParams.listingType}
                                />
                            )}

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
                                        <Loader
                                            color="orange"
                                            size="xl"
                                            type="dots"
                                        />
                                        <Text c="dimmed" size="sm">
                                            {t("loading")}
                                        </Text>
                                    </Stack>
                                </Center>
                            ) : (
                                <>
                                    <Group
                                        justify="flex-end"
                                        mb="md"
                                        gap="xl"
                                        align="center"
                                    >
                                        {displayMode === "sold" && (
                                            <>
                                                {hideAbnormal && (
                                                    <div
                                                        style={{
                                                            width: 120,
                                                        }}
                                                    >
                                                        <Slider
                                                            min={1.0}
                                                            max={5.0}
                                                            step={0.1}
                                                            value={threshold}
                                                            onChange={
                                                                setThreshold
                                                            }
                                                            label={(value) =>
                                                                `${value.toFixed(1)}x`
                                                            }
                                                            color="red"
                                                            size="sm"
                                                        />
                                                    </div>
                                                )}
                                                <Switch
                                                    label={`${t("hideAbnormal")} (${threshold.toFixed(1)}x)`}
                                                    checked={hideAbnormal}
                                                    onChange={(event) =>
                                                        setHideAbnormal(
                                                            event.currentTarget
                                                                .checked,
                                                        )
                                                    }
                                                    size="xs"
                                                    color="red"
                                                />
                                                <Switch
                                                    label={t("hideUnmatched")}
                                                    checked={hideUnmatched}
                                                    onChange={(event) =>
                                                        setHideUnmatched(
                                                            event.currentTarget
                                                                .checked,
                                                        )
                                                    }
                                                    size="xs"
                                                    color="orange"
                                                />
                                            </>
                                        )}
                                        {process.env
                                            .NEXT_PUBLIC_DEVELOPER_MODE ===
                                            "true" && (
                                            <SegmentedControl
                                                size="xs"
                                                color="orange"
                                                value={displayMode}
                                                onChange={(value: any) =>
                                                    setDisplayMode(value)
                                                }
                                                data={[
                                                    {
                                                        label: t(
                                                            "activeResults",
                                                        ),
                                                        value: "active",
                                                    },
                                                    {
                                                        label: t("soldResults"),
                                                        value: "sold",
                                                    },
                                                ]}
                                            />
                                        )}
                                    </Group>

                                    <EbayActiveResults
                                        results={
                                            displayMode === "active"
                                                ? filteredActiveResults
                                                : cleanSoldResults
                                        }
                                        loadingMore={loadingMore}
                                        onLoadMore={() => handleSearch(true)}
                                        onHover={setHoveredDate}
                                    />

                                    {activeResults.length === 0 &&
                                        !error &&
                                        !loading && (
                                            <Center py={100}>
                                                <Stack align="center" gap="xs">
                                                    <IconBolt
                                                        size={48}
                                                        color="#ddd"
                                                    />
                                                    <Text c="dimmed">
                                                        {t("noResults")}
                                                    </Text>
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
