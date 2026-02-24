"use client";

import { Alert, Box, Container, Grid, Stack, Modal, Text, Group, Button } from "@mantine/core";
import { IconAlertCircle, IconSearch, IconCheck } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { ScraperAction } from "@/components/CardScraperOld/ScraperAction";
import { ScraperCardsGrid } from "@/components/CardScraperOld/ScraperCardsGrid";
import { ScraperDebugger } from "@/components/CardScraperOld/ScraperDebugger";
import { ScraperRunningSteps } from "@/components/CardScraperOld/ScraperRunningSteps";
import { ScraperSummary } from "@/components/CardScraperOld/ScraperSummary";
import type { DebugInfo, ScrapedCard, ScrapedCollection, ScraperStep } from "@/components/CardScraperOld/types";
import { useScraperContext } from "@/components/CardScraperOld/useScraperContext";
import { PageHeader } from "@/components/PageHeader";
import { APP_CONFIG } from "@/constants/app";

export default function MTGScraperPage() {
    const { franchise, language } = useScraperContext();

    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [activeWorkers, setActiveWorkers] = useState<number>(0);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [completionStats, setCompletionStats] = useState<{
        type: "cards" | "collections";
        totalItems: number;
        duration: number;
        collectionsProcessed?: number;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [cards, setCards] = useState<ScrapedCard[]>([]);
    const [collections, setCollections] = useState<ScrapedCollection[]>([]);
    const [scrapedMeta, setScrapedMeta] = useState<{
        pagesScraped: number;
        totalItems: number;
        totalPages: number;
    } | null>(null);
    const [scrapingDuration, setScrapingDuration] = useState<number | null>(null);
    const [processedCollectionsCount, setProcessedCollectionsCount] = useState<number | null>(null);
    const [steps, setSteps] = useState<ScraperStep[]>([]);

    // Debug states
    const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
    const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
    const [collectionsRefreshKey, setCollectionsRefreshKey] = useState(0);
    const abortControllerRef = useRef<AbortController | null>(null);
    const stopScrapingRef = useRef(false);

    // Filter collections data
    const [referenceCollections, setReferenceCollections] = useState<ScrapedCollection[]>([]);

    useEffect(() => {
        const fetchCollections = async () => {
            try {
                const res = await fetch(`/api/scraper/collections?franchise=${franchise}&language=${language}`);
                const data = await res.json();
                if (data.success) {
                    setReferenceCollections(data.collections);
                }
            } catch (error) {
                console.error("Failed to fetch collections", error);
            }
        };
        if (franchise && language) {
            fetchCollections();
        }
    }, [franchise, language, collectionsRefreshKey]);

    // Real-time timer
    const startTimeRef = useRef<number | null>(null);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (loading) {
            if (!startTimeRef.current) startTimeRef.current = Date.now();

            interval = setInterval(() => {
                if (startTimeRef.current) {
                    const durationInSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
                    setScrapingDuration(durationInSeconds);
                }
            }, 1000);
        } else {
            startTimeRef.current = null;
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [loading]);

    const handleCollectionSelect = async (collectionId: string | null) => {
        setSelectedCollectionId(collectionId);
        setError(null);

        if (!collectionId) {
            setCards([]);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/scraper/cards?collectionId=${collectionId}`);
            const data = await res.json();
            if (data.success) {
                setCards(data.cards);
                setScrapedMeta({
                    totalItems: data.cards.length,
                    pagesScraped: 1,
                    totalPages: 1,
                });
            } else {
                setError(data.error || "Failed to fetch cards");
            }
        } catch (error) {
            console.error("Failed to fetch cards", error);
            setError("Failed to fetch cards");
        } finally {
            setLoading(false);
        }
    };

    const handleScrape = async (
        type: "cards" | "collections",
        customUrl?: string,
        isChained = false,
        collectionId?: number | string
    ) => {
        if (!isChained) {
            setLoading(true);
            setSteps([]);
            setScrapingDuration(null);
            setProcessedCollectionsCount(null);
            setActiveWorkers(0);
            setError(null);
            stopScrapingRef.current = false;
        }

        if (stopScrapingRef.current) return;

        setScrapedMeta(null);
        if (type === "cards") setCards([]);
        else setCollections([]);

        const targetUrl = customUrl || (type === "cards" ? url : APP_CONFIG.MTG_URL_EN);
        const requestData = {
            url: targetUrl,
            type,
            deepScrape: true,
            franchise,
            language,
            collectionId: collectionId || selectedCollectionId,
        };

        const newDebugInfo: DebugInfo = {
            request: requestData,
            responseStatus: null,
            responseBody: "",
            error: null,
        };

        let capturedItems: any[] = [];

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const response = await fetch("/api/scraper", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestData),
                signal: controller.signal,
            });

            newDebugInfo.responseStatus = response.status;
            if (!response.ok) {
                const text = await response.text();
                newDebugInfo.responseBody = text;
                setDebugInfo(newDebugInfo);
                throw new Error(`Server error: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error("No response body");

            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const msg = JSON.parse(line);
                        newDebugInfo.responseBody += `${line}\n`;
                        setDebugInfo({ ...newDebugInfo });

                        if (msg.success === false) {
                            setError(msg.error || "Scraping failed");
                            continue;
                        }

                        if (msg.type === "chunk") {
                            if (type === "cards") {
                                setCards((prev) => [...prev, ...msg.items]);
                                capturedItems = [...capturedItems, ...msg.items];
                            } else {
                                setCollections((prev) => [...prev, ...msg.items]);
                            }
                        } else if (msg.type === "savedCollections") {
                            capturedItems = [...capturedItems, ...msg.items];
                        } else if (msg.type === "meta") {
                            setScrapedMeta((prev) => ({
                                pagesScraped: msg.pagesScraped ?? prev?.pagesScraped ?? 0,
                                totalItems: msg.totalItems ?? prev?.totalItems ?? 0,
                                totalPages: msg.totalPages ?? prev?.totalPages ?? 0,
                            }));
                        } else if (msg.type === "workers") {
                            setActiveWorkers(msg.count);
                        } else if (msg.type === "step") {
                            setSteps((prev) => [
                                ...prev,
                                {
                                    timestamp: new Date().toLocaleTimeString(),
                                    message: msg.message,
                                },
                            ]);
                        } else if (msg.type === "complete") {
                            if (type === "cards") {
                                setCollectionsRefreshKey((prev) => prev + 1);
                                setProcessedCollectionsCount((prev) => (prev || 0) + 1);

                                if (!isChained) {
                                    const finalDuration = startTimeRef.current
                                        ? Math.floor((Date.now() - startTimeRef.current) / 1000)
                                        : 0;
                                    setCompletionStats({
                                        type: "cards",
                                        totalItems: capturedItems.length,
                                        duration: finalDuration,
                                    });
                                }
                            }

                            if (type === "collections" && capturedItems.length > 0) {
                                setCollectionsRefreshKey((prev) => prev + 1);
                                setProcessedCollectionsCount(0);

                                const limit = APP_CONFIG.NUM_COLLECTIONS_TO_DOWNLOAD_CARDS_LIMIT;
                                const collectionsToProcess = limit > 0 ? capturedItems.slice(0, limit) : capturedItems;

                                for (let i = 0; i < collectionsToProcess.length; i++) {
                                    const col = collectionsToProcess[i];
                                    if (stopScrapingRef.current) break;

                                    setSteps((prev) => [
                                        ...prev,
                                        {
                                            timestamp: new Date().toLocaleTimeString(),
                                            message: `➡️ Auto-starting scrape for collection: ${col.name} (Index ${i + 1}/${collectionsToProcess.length})`,
                                        },
                                    ]);

                                    if (col.collectionUrl) {
                                        setUrl(col.collectionUrl);
                                        await handleScrape("cards", col.collectionUrl, true, col.id);
                                    }
                                }

                                if (!stopScrapingRef.current) {
                                    setSteps((prev) => [
                                        ...prev,
                                        {
                                            timestamp: new Date().toLocaleTimeString(),
                                            message: `✅ All requested collections processed.`,
                                        },
                                    ]);

                                    const finalDuration = startTimeRef.current
                                        ? Math.floor((Date.now() - startTimeRef.current) / 1000)
                                        : 0;
                                    setCompletionStats({
                                        type: "collections",
                                        totalItems: capturedItems.length,
                                        duration: finalDuration,
                                        collectionsProcessed: collectionsToProcess.length,
                                    });
                                    setShowCompletionModal(true);
                                }
                            } else if (type === "cards" && !isChained) {
                                const finalDuration = startTimeRef.current
                                    ? Math.floor((Date.now() - startTimeRef.current) / 1000)
                                    : 0;
                                setCompletionStats({
                                    type: "cards",
                                    totalItems: capturedItems.length,
                                    duration: finalDuration,
                                });
                                setShowCompletionModal(true);
                            }
                        }
                    } catch (e) {
                        console.error("Failed to parse stream line:", line, e);
                    }
                }
            }
        } catch (err: any) {
            if (err.name === "AbortError") {
                setSteps((prev) => [
                    ...prev,
                    {
                        timestamp: new Date().toLocaleTimeString(),
                        message: "🛑 Scraping stopped by user.",
                    },
                ]);
                return;
            }
            console.error("Scrape error:", err);
            setError(err.message || "An unexpected error occurred");
        } finally {
            abortControllerRef.current = null;
            if (!isChained) {
                setLoading(false);
            }
        }
    };

    return (
        <Box bg="gray.0" mih="100vh">
            <Container size="xl" py="xl">
                <Stack gap="lg">
                    <PageHeader
                        title={`${franchise?.toUpperCase()} ${language?.toUpperCase()} Card Scraper`}
                        icon={<IconSearch size={24} />}
                        backHref="/card-scraper"
                    />

                    <Group justify="flex-end">
                        <ScraperAction
                            franchise={franchise || "mtg"}
                            language={language || "en"}
                            loading={loading}
                            onRefresh={() => handleScrape("collections", url)}
                            onDelete={() => {
                                setCollections([]);
                                setCards([]);
                                setSteps([]);
                                setScrapedMeta(null);
                                setCompletionStats(null);
                                setCollectionsRefreshKey(prev => prev + 1);
                            }}
                            onStop={() => {
                                if (abortControllerRef.current) {
                                    abortControllerRef.current.abort();
                                    stopScrapingRef.current = true;
                                }
                            }}
                        />
                    </Group>

                    {error && (
                        <Alert
                            variant="light"
                            color="red"
                            title="Scraping Error"
                            icon={<IconAlertCircle />}
                            radius="md"
                        >
                            {error}
                        </Alert>
                    )}

                    <Grid gutter="xl">
                        <Grid.Col span={{ base: 12, md: 4 }}>
                            <Stack gap="xs">
                                <ScraperSummary
                                    collections={referenceCollections}
                                    scrapingDuration={scrapingDuration}
                                    processedCollectionsCount={processedCollectionsCount}
                                    activeWorkers={activeWorkers}
                                />
                                <ScraperRunningSteps steps={steps} />

                                <ScraperDebugger opened={true} debugInfo={debugInfo} />
                            </Stack>
                        </Grid.Col>

                        <Grid.Col span={{ base: 12, md: 8 }}>
                            <ScraperCardsGrid
                                cards={cards}
                                onCollectionSelect={handleCollectionSelect}
                                selectedCollectionId={selectedCollectionId}
                                referenceCollections={referenceCollections}
                                loading={loading && !!selectedCollectionId}
                                onScrape={() => {
                                    const selectedCol = referenceCollections.find(c => String(c.id) === String(selectedCollectionId));
                                    if (selectedCol?.collectionUrl) {
                                        handleScrape("cards", selectedCol.collectionUrl, false, selectedCol.id);
                                    }
                                }}
                            />
                        </Grid.Col>
                    </Grid>
                </Stack>
            </Container>

            <Modal
                opened={showCompletionModal}
                onClose={() => setShowCompletionModal(false)}
                title={
                    <Group gap="xs">
                        <IconCheck size={20} color="var(--mantine-color-teal-6)" />
                        <Text fw={700}>Scraping Complete</Text>
                    </Group>
                }
                centered
                radius="md"
                size="sm"
            >
                <Stack gap="md" py="xs">
                    <Text size="sm">
                        The scraping process has finished successfully.
                    </Text>

                    <Box p="sm" bg="gray.1" style={{ borderRadius: "8px" }}>
                        <Stack gap="xs">
                            <Group justify="space-between">
                                <Text size="xs" c="dimmed">
                                    Type
                                </Text>
                                <Text size="xs" fw={600}>
                                    {completionStats?.type === "collections" ? "Batch Collections" : "Single Collection"}
                                </Text>
                            </Group>
                            {completionStats?.collectionsProcessed && (
                                <Group justify="space-between">
                                    <Text size="xs" c="dimmed">
                                        Collections
                                    </Text>
                                    <Text size="xs" fw={600}>
                                        {completionStats.collectionsProcessed}
                                    </Text>
                                </Group>
                            )}
                            <Group justify="space-between">
                                <Text size="xs" c="dimmed">
                                    Time Taken
                                </Text>
                                <Text size="xs" fw={600}>
                                    {completionStats ? `${Math.floor(completionStats.duration / 60)}m ${completionStats.duration % 60}s` : "--"}
                                </Text>
                            </Group>
                        </Stack>
                    </Box>

                    <Button onClick={() => setShowCompletionModal(false)} color="teal" fullWidth radius="md">
                        Acknowledge
                    </Button>
                </Stack>
            </Modal>
        </Box>
    );
}
