"use client";

import { Container, SimpleGrid, Stack, Alert } from "@mantine/core";
import { PageHeader } from "@/components/PageHeader";
import { CardScraperCollectionList } from "@/components/CardScraper/CardScraperCollectionList";
import { CardScraperInputs } from "@/components/CardScraper/CardScraperInputs";
import { CardScraperRunningSteps } from "@/components/CardScraper/CardScraperRunningSteps";
import { CardScraperCardList } from "@/components/CardScraper/CardScraperCardList";
import { IconDatabaseExport, IconAlertCircle } from "@tabler/icons-react";
import { useState, useRef, useEffect } from "react";
import { APP_CONFIG } from "@/constants/app";

export default function CardScraperPage() {
    const [selectedFranchise, setSelectedFranchise] = useState<string | null>("mtg");
    const [collections, setCollections] = useState<any[]>([]);
    const [cards, setCards] = useState<any[]>([]);
    const [steps, setSteps] = useState<any[]>([]);
    const [collectionLoading, setCollectionLoading] = useState(false);
    const [cardLoading, setCardLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedCollection, setSelectedCollection] = useState<any | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (selectedFranchise) {
            fetchExistingCollections(selectedFranchise);
        }
    }, [selectedFranchise]);

    const fetchExistingCollections = async (franchise: string) => {
        setCollectionLoading(true);
        try {
            const res = await fetch(`/api/scraper/collections?franchise=${franchise}&language=en`);
            const data = await res.json();
            if (data.success) {
                setCollections(data.collections);
            }
        } catch (err) {
            console.error("Failed to fetch collections:", err);
        } finally {
            setCollectionLoading(false);
        }
    };

    const handleDeleteAll = async () => {
        if (!selectedFranchise) return;
        if (!confirm(`Are you sure you want to delete all ${selectedFranchise.toUpperCase()} collections? This will also delete all scraped cards.`)) return;

        setCollectionLoading(true);
        try {
            const res = await fetch(`/api/scraper/collections?franchise=${selectedFranchise}&language=en`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (data.success) {
                setCollections([]);
                setCards([]);
                setSelectedCollection(null);
            } else {
                setError(data.error || "Failed to delete collections");
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred during deletion");
        } finally {
            setCollectionLoading(false);
        }
    };

    const handleDownloadAllCards = async () => {
        if (collections.length === 0) return;
        if (!confirm(`Are you sure you want to download cards for ALL ${collections.length} collections? This may take a long time.`)) return;

        setCardLoading(true);
        setError(null);

        for (const col of collections) {
            setSteps((prev) => [
                ...prev,
                {
                    id: Date.now(),
                    message: `Starting bulk download for: ${col.name}`,
                    status: "running",
                    timestamp: new Date().toLocaleTimeString(),
                }
            ]);

            const requestData = {
                url: col.collectionUrl,
                type: "cards",
                franchise: selectedFranchise,
                language: "en",
                skipSave: false,
                deepScrape: true,
                collectionId: col.id,
            };

            await runScraperStream(requestData, (items) => {
                // We update step logs but don't necessarily need to show all cards in the list during bulk
                // though it might be nice.
            });
        }

        setCardLoading(false);
        if (selectedFranchise) fetchExistingCollections(selectedFranchise);
    };

    const handleDownloadCollections = async () => {
        if (!selectedFranchise) return;

        setCollectionLoading(true);
        setSteps([]);
        setCollections([]);
        setCards([]);
        setError(null);
        setSelectedCollection(null);

        const targetUrl = selectedFranchise === "mtg" ? APP_CONFIG.MTG_URL_EN : "";

        const requestData = {
            url: targetUrl,
            type: "collections",
            franchise: selectedFranchise,
            language: "en",
            skipSave: false, // Now saving to database
        };

        await runScraperStream(requestData, (items) => {
            setCollections((prev) => {
                // When streaming new collections, we merge them but avoid duplicates if they were already saved
                const existingCodes = new Set(prev.map(c => c.collectionCode));
                const newItems = items.filter(it => !existingCodes.has(it.collectionCode));
                return [...prev, ...newItems];
            });
        });
        setCollectionLoading(false);
    };

    const handleDownloadCards = async (specificCollection?: any) => {
        const targetCollection = specificCollection || selectedCollection;
        if (!targetCollection?.collectionUrl) return;

        // If it's a specific download, also select it to show in the cards list
        if (specificCollection) {
            setSelectedCollection(specificCollection);
        }

        setCardLoading(true);
        setCards([]);
        setError(null);

        const requestData = {
            url: targetCollection.collectionUrl,
            type: "cards",
            franchise: selectedFranchise,
            language: "en",
            skipSave: false,
            deepScrape: true,
            collectionId: targetCollection.id,
        };

        await runScraperStream(requestData, (items) => {
            setCards((prev) => [...prev, ...items]);
        });
        setCardLoading(false);
        if (selectedFranchise) fetchExistingCollections(selectedFranchise);
    };

    const handleDeleteCard = async (id: string | number) => {
        try {
            const res = await fetch(`/api/scraper/cards?id=${id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (data.success) {
                setCards((prev) => prev.filter((card) => card.id !== id));
            } else {
                setError(data.error || "Failed to delete card");
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred during card deletion");
        }
    };

    const handleDeleteAllCards = async () => {
        if (!selectedCollection?.id) return;
        if (!confirm(`Are you sure you want to delete all cards for ${selectedCollection.collectionCode}?`)) return;

        try {
            const res = await fetch(`/api/scraper/cards?collectionId=${selectedCollection.id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (data.success) {
                setCards([]);
                if (selectedFranchise) fetchExistingCollections(selectedFranchise);
            } else {
                setError(data.error || "Failed to delete cards");
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred during bulk card deletion");
        }
    };

    const runScraperStream = async (requestData: any, onItems: (items: any[]) => void) => {
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

            if (!response.ok) {
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

                        if (msg.success === false) {
                            setError(msg.error || "Scraping failed");
                            continue;
                        }

                        if (msg.type === "chunk") {
                            onItems(msg.items);
                        } else if (msg.type === "savedCollections") {
                            setCollections((prev) => {
                                const newMap = new Map(prev.map(c => [c.collectionCode, c]));
                                msg.items.forEach((saved: any) => {
                                    const existing = newMap.get(saved.collectionCode);
                                    newMap.set(saved.collectionCode, { ...existing, ...saved });
                                });
                                return Array.from(newMap.values());
                            });
                        } else if (msg.type === "savedCards") {
                            setCards((prev) => {
                                // Match by name or URL to update with DB IDs if needed
                                return prev;
                            });
                        } else if (msg.type === "step") {
                            setSteps((prev) => {
                                const newSteps = prev.map(s => ({ ...s, status: "completed" as const }));
                                return [
                                    ...newSteps,
                                    {
                                        id: Date.now() + Math.random(),
                                        message: msg.message,
                                        status: "running" as const,
                                        timestamp: new Date().toLocaleTimeString(),
                                    },
                                ];
                            });
                        } else if (msg.type === "complete") {
                            setSteps((prev) => {
                                const newSteps = prev.map(s => ({ ...s, status: "completed" as const }));
                                return [
                                    ...newSteps,
                                    {
                                        id: "complete",
                                        message: "Scraping session finished successfully.",
                                        status: "completed" as const,
                                        timestamp: new Date().toLocaleTimeString(),
                                    },
                                ];
                            });
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
                        id: "abort",
                        message: "Scraping stopped by user.",
                        status: "error",
                        timestamp: new Date().toLocaleTimeString(),
                    },
                ]);
                return;
            }
            setError(err.message || "An unexpected error occurred");
        } finally {
            abortControllerRef.current = null;
        }
    };

    return (
        <Container size="xl" py="md">
            <Stack gap="lg">
                <PageHeader
                    title="Card Scraper"
                    description="Scrape and import cards from various sources"
                    icon={
                        <IconDatabaseExport
                            size={32}
                            color="var(--mantine-color-blue-6)"
                        />
                    }
                />

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

                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                    <Stack gap="md">
                        <CardScraperInputs
                            value={selectedFranchise}
                            onChange={(val) => {
                                setSelectedFranchise(val);
                                setCollections([]);
                                setSteps([]);
                                setCards([]);
                                setSelectedCollection(null);
                            }}
                            onDownload={handleDownloadCollections}
                            loading={collectionLoading}
                        />
                        <CardScraperRunningSteps steps={steps} />
                    </Stack>

                    <div>
                        <CardScraperCollectionList
                            collections={collections}
                            selectedId={selectedCollection?.id}
                            loading={collectionLoading}
                            onDeleteAll={handleDeleteAll}
                            onDownloadAll={handleDownloadAllCards}
                            onDownloadItem={handleDownloadCards}
                            onSelect={async (id) => {
                                const col = collections.find(c => c.id === id);
                                setSelectedCollection(col);
                                setCards([]);

                                // Automatically fetch cards from database if they exist
                                if (id && typeof id === 'number') {
                                    setCardLoading(true);
                                    try {
                                        const res = await fetch(`/api/scraper/cards?collectionId=${id}`);
                                        const data = await res.json();
                                        if (data.success) {
                                            setCards(data.cards);
                                        }
                                    } finally {
                                        setCardLoading(false);
                                    }
                                }
                            }}
                        />
                    </div>

                    <div>
                        <CardScraperCardList
                            cards={cards}
                            collectionCode={selectedCollection?.collectionCode}
                            loading={cardLoading}
                            onDeleteCard={handleDeleteCard}
                            onDeleteAllCards={handleDeleteAllCards}
                            canDownload={!!selectedCollection}
                        />
                    </div>
                </SimpleGrid>
            </Stack>
        </Container>
    );
}
