"use client";

import {
    ActionIcon,
    Alert,
    Button,
    Container,
    Group,
    Modal,
    NumberInput,
    SimpleGrid,
    Stack,
    Text,
    Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
    IconAlertCircle,
    IconCheck,
    IconDatabaseExport,
    IconSettings,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { CardScraperCardList } from "@/components/CardScraper/CardScraperCardList";
import { CardScraperCollectionList } from "@/components/CardScraper/CardScraperCollectionList";
import { CardScraperInputs } from "@/components/CardScraper/CardScraperInputs";
import { CardScraperRunningSteps } from "@/components/CardScraper/CardScraperRunningSteps";
import {
    CardScraperStats,
    type ScraperStats,
} from "@/components/CardScraper/CardScraperStats";
import { PageHeader } from "@/components/PageHeader";
import { APP_CONFIG } from "@/constants/app";

const DEFAULT_STATS: ScraperStats = {
    collections: {
        added: 0,
        matched: 0,
        missed: 0,
        discarded: 0,
        discardedItems: [],
    },
    cards: {
        added: 0,
        matched: 0,
        missed: 0,
        discarded: 0,
        discardedItems: [],
    },
};

export default function CardScraperPage() {
    const [selectedFranchise, setSelectedFranchise] =
        useState<string | null>(null);
    const [selectedLanguage, setSelectedLanguage] =
        useState<string | null>(null);
    const [collections, setCollections] = useState<any[]>(
        [],
    );
    const [cards, setCards] = useState<any[]>([]);
    const [steps, setSteps] = useState<any[]>([]);
    const [scraperStats, setScraperStats] =
        useState<ScraperStats>(DEFAULT_STATS);
    const [collectionLoading, setCollectionLoading] =
        useState(false);
    const [cardLoading, setCardLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedCollection, setSelectedCollection] =
        useState<any | null>(null);

    const abortControllerRef =
        useRef<AbortController | null>(null);
    const pendingActionRef = useRef<(() => void) | null>(
        null,
    );
    const [
        confirmOpened,
        { open: openConfirm, close: closeConfirm },
    ] = useDisclosure(false);
    const [confirmConfig, setConfirmConfig] = useState<{
        title: string;
        message: string;
    }>({
        title: "",
        message: "",
    });

    const [
        settingsOpened,
        { open: openSettings, close: closeSettings },
    ] = useDisclosure(false);
    const [cardScraperLimit, setCardScraperLimit] =
        useState<number>(
            APP_CONFIG.NUM_SCRAPED_CARDS_PER_COLLECTION,
        );

    const askConfirm = (
        title: string,
        message: string,
        action: () => void,
    ) => {
        setConfirmConfig({ title, message });
        pendingActionRef.current = action;
        openConfirm();
    };

    const handleConfirmed = () => {
        closeConfirm();
        pendingActionRef.current?.();
        pendingActionRef.current = null;
    };

    // 1. Load from localStorage on mount
    useEffect(() => {
        const savedFranchise =
            localStorage.getItem(
                "scraper_selected_franchise",
            ) || "mtg";
        const savedLanguage =
            localStorage.getItem(
                "scraper_selected_language",
            ) || "en";
        const savedLimit = localStorage.getItem(
            "scraper_card_limit",
        );

        setSelectedFranchise(savedFranchise);
        setSelectedLanguage(savedLanguage);
        if (savedLimit) {
            setCardScraperLimit(parseInt(savedLimit, 10));
        }
    }, []);

    // 2. Save to localStorage and fetch collections when selections change
    useEffect(() => {
        if (selectedFranchise) {
            localStorage.setItem(
                "scraper_selected_franchise",
                selectedFranchise,
            );
            if (selectedLanguage) {
                localStorage.setItem(
                    "scraper_selected_language",
                    selectedLanguage,
                );
            }
            fetchExistingCollections(
                selectedFranchise,
                selectedLanguage ?? "en",
            );
        }
    }, [selectedFranchise, selectedLanguage]);

    const fetchExistingCollections = async (
        franchise: string,
        language: string,
    ) => {
        setCollectionLoading(true);
        try {
            const res = await fetch(
                `/api/scraper/collections?franchise=${franchise}&language=${language}`,
            );
            const data = await res.json();
            if (data.success) {
                setCollections(data.collections);
                return data.collections;
            }
        } catch (err) {
            console.error(
                "Failed to fetch collections:",
                err,
            );
        } finally {
            setCollectionLoading(false);
        }
        return null;
    };

    const fetchCards = async (
        collectionId: number | string,
    ) => {
        setCardLoading(true);
        try {
            const res = await fetch(
                `/api/scraper/cards?collectionId=${collectionId}`,
            );
            const data = await res.json();
            if (data.success) {
                setCards(data.cards);
            }
        } catch (err) {
            console.error("Failed to fetch cards:", err);
        } finally {
            setCardLoading(false);
        }
    };

    const handleDeleteAll = async () => {
        if (!selectedFranchise) return;
        askConfirm(
            `Delete all ${selectedFranchise.toUpperCase()} collections`,
            `This will permanently delete all ${selectedFranchise.toUpperCase()} collections and every scraped card within them. This cannot be undone.`,
            async () => {
                setCollectionLoading(true);
                try {
                    const res = await fetch(
                        `/api/scraper/collections?franchise=${selectedFranchise}&language=${selectedLanguage ?? "en"}`,
                        {
                            method: "DELETE",
                        },
                    );
                    const data = await res.json();
                    if (data.success) {
                        setCollections([]);
                        setCards([]);
                        setSelectedCollection(null);
                    } else {
                        setError(
                            data.error ||
                            "Failed to delete collections",
                        );
                    }
                } catch (err: any) {
                    setError(
                        err.message ||
                        "An unexpected error occurred during deletion",
                    );
                } finally {
                    setCollectionLoading(false);
                }
            },
        );
    };

    const handleDeleteCollection = async (
        id: string | number,
    ) => {
        const collection = collections.find(
            (c) => c.id === id,
        );
        if (!collection) return;

        askConfirm(
            `Delete collection: ${collection.name}`,
            `This will permanently delete this collection and all its cards. This cannot be undone.`,
            async () => {
                setCollectionLoading(true);
                try {
                    const res = await fetch(
                        `/api/scraper/collections?id=${id}`,
                        {
                            method: "DELETE",
                        },
                    );
                    const data = await res.json();
                    if (data.success) {
                        setCollections((prev) =>
                            prev.filter((c) => c.id !== id),
                        );
                        if (selectedCollection?.id === id) {
                            setSelectedCollection(null);
                            setCards([]);
                        }
                    } else {
                        setError(
                            data.error ||
                            "Failed to delete collection",
                        );
                    }
                } catch (err: any) {
                    setError(
                        err.message ||
                        "An unexpected error occurred during deletion",
                    );
                } finally {
                    setCollectionLoading(false);
                }
            },
        );
    };

    const handleDownloadAllCards = async () => {
        if (collections.length === 0) return;

        setCardLoading(true);
        setError(null);
        setSteps([]); // Clear steps at the start of bulk
        setScraperStats(DEFAULT_STATS); // Reset global stats

        for (const col of collections) {
            setSelectedCollection(col);
            setCards([]); // Clear current cards view for this specific collection

            setSteps((prev) => [
                ...prev,
                {
                    id: Date.now(),
                    message: `Starting bulk download for: ${col.name}`,
                    status: "running",
                    timestamp:
                        new Date().toLocaleTimeString(),
                },
            ]);

            const requestData = {
                url: col.collectionUrl,
                type: "cards",
                franchise: selectedFranchise,
                language: selectedLanguage ?? "en",
                skipSave: false,
                deepScrape: true,
                collectionId: col.id,
                cardLimit: cardScraperLimit,
            };

            const aborted = await runScraperStream(requestData, (items) => {
                // Now streaming items into the UI so user can see progress
                setCards((prev) => [...prev, ...items]);
            });

            if (aborted) break;

            // Fresh pull from database to ensure metadata and details are correct
            if (col.id) await fetchCards(col.id);

            // After each collection is finished, refresh the collection list to see updated card counts
            if (selectedFranchise) {
                const updatedCols =
                    await fetchExistingCollections(
                        selectedFranchise,
                        selectedLanguage ?? "en",
                    );
                if (updatedCols) {
                    const freshCol = updatedCols.find(
                        (c: any) => c.id === col.id,
                    );
                    if (freshCol)
                        setSelectedCollection(freshCol);
                }
            }
        }

        setCardLoading(false);
        if (selectedFranchise)
            fetchExistingCollections(
                selectedFranchise,
                selectedLanguage ?? "en",
            );

        notifications.show({
            title: "Bulk Scraping Complete",
            message: `Successfully processed ${collections.length} collections.`,
            color: "green",
            icon: <IconCheck size={18} />,
        });
    };

    const handleDownloadCollections = async () => {
        if (!selectedFranchise) return;

        setCollectionLoading(true);
        setSteps([]);
        setError(null);
        setScraperStats(DEFAULT_STATS);

        const targetUrl =
            selectedFranchise === "mtg"
                ? APP_CONFIG.MTG_COLLECTION_URL
                : "";

        const requestData = {
            url: targetUrl,
            type: "collections",
            franchise: selectedFranchise,
            language: selectedLanguage ?? "en",
            skipSave: false, // Now saving to database
        };

        await runScraperStream(requestData, (items) => {
            setCollections((prev) => {
                // When streaming new collections, we merge them but avoid duplicates if they were already saved
                const existingCodes = new Set(
                    prev.map((c) => c.collectionCode),
                );
                const newItems = items.filter(
                    (it) =>
                        !existingCodes.has(
                            it.collectionCode,
                        ),
                );
                return [...prev, ...newItems];
            });
        });
        setCollectionLoading(false);

        notifications.show({
            title: "Collections Updated",
            message: `Successfully scraped collections for ${selectedFranchise.toUpperCase()}.`,
            color: "green",
            icon: <IconCheck size={18} />,
        });
    };

    const handleDownloadCards = async (
        specificCollection?: any,
    ) => {
        const targetCollection =
            specificCollection || selectedCollection;
        if (!targetCollection?.collectionUrl) return;

        // If it's a specific download, also select it to show in the cards list
        if (specificCollection) {
            setSelectedCollection(specificCollection);
        }

        setCardLoading(true);
        setCards([]);
        setSteps([]);
        setScraperStats(DEFAULT_STATS);
        setError(null);

        const requestData = {
            url: targetCollection.collectionUrl,
            type: "cards",
            franchise: selectedFranchise,
            language: selectedLanguage ?? "en",
            skipSave: false,
            deepScrape: true,
            collectionId: targetCollection.id,
            cardLimit: cardScraperLimit,
        };

        await runScraperStream(requestData, (items) => {
            setCards((prev) => [...prev, ...items]);
        });

        // Fresh pull from database after scraping is complete
        if (targetCollection.id)
            await fetchCards(targetCollection.id);
        setCardLoading(false);
        if (selectedFranchise) {
            const updatedCols =
                await fetchExistingCollections(
                    selectedFranchise,
                    selectedLanguage ?? "en",
                );
            if (updatedCols) {
                const freshCol = updatedCols.find(
                    (c: any) =>
                        c.id === targetCollection.id,
                );
                if (freshCol)
                    setSelectedCollection(freshCol);
            }
        }

        notifications.show({
            title: "Scraping Complete",
            message: `Successfully scraped cards for ${targetCollection.name}.`,
            color: "green",
            icon: <IconCheck size={18} />,
        });
    };

    const handleDeleteCard = async (
        id: string | number,
    ) => {
        try {
            const res = await fetch(
                `/api/scraper/cards?id=${id}`,
                {
                    method: "DELETE",
                },
            );
            const data = await res.json();
            if (data.success) {
                setCards((prev) =>
                    prev.filter((card) => card.id !== id),
                );
            } else {
                setError(
                    data.error || "Failed to delete card",
                );
            }
        } catch (err: any) {
            setError(
                err.message ||
                "An unexpected error occurred during card deletion",
            );
        }
    };

    const handleDeleteAllCards = async () => {
        if (!selectedCollection?.id) return;
        askConfirm(
            `Delete all cards for ${selectedCollection.collectionCode}`,
            `This will permanently delete all scraped cards for the ${selectedCollection.collectionCode} collection. This cannot be undone.`,
            async () => {
                try {
                    const res = await fetch(
                        `/api/scraper/cards?collectionId=${selectedCollection.id}`,
                        {
                            method: "DELETE",
                        },
                    );
                    const data = await res.json();
                    if (data.success) {
                        setCards([]);
                        if (selectedFranchise)
                            fetchExistingCollections(
                                selectedFranchise,
                                selectedLanguage ?? "en",
                            );
                    } else {
                        setError(
                            data.error ||
                            "Failed to delete cards",
                        );
                    }
                } catch (err: any) {
                    setError(
                        err.message ||
                        "An unexpected error occurred during bulk card deletion",
                    );
                }
            },
        );
    };

    const runScraperStream = async (
        requestData: any,
        onItems: (items: any[]) => void,
    ) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const response = await fetch("/api/scraper", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestData),
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(
                    `Server error: ${response.status}`,
                );
            }

            const reader = response.body?.getReader();
            if (!reader)
                throw new Error("No response body");

            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, {
                    stream: true,
                });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const msg = JSON.parse(line);

                        if (msg.success === false) {
                            setError(
                                msg.error ||
                                "Scraping failed",
                            );
                            continue;
                        }

                        if (msg.type === "chunk") {
                            onItems(msg.items);
                        } else if (
                            msg.type === "savedCollections"
                        ) {
                            setCollections((prev) => {
                                const newMap = new Map(
                                    prev.map((c) => [
                                        c.collectionCode,
                                        c,
                                    ]),
                                );
                                msg.items.forEach(
                                    (saved: any) => {
                                        const existing =
                                            newMap.get(
                                                saved.collectionCode,
                                            );
                                        newMap.set(
                                            saved.collectionCode,
                                            {
                                                ...existing,
                                                ...saved,
                                            },
                                        );
                                    },
                                );
                                return Array.from(
                                    newMap.values(),
                                );
                            });
                        } else if (
                            msg.type === "savedCards"
                        ) {
                            setCards((prev) => {
                                // Match by name or URL to update with DB IDs if needed
                                return prev;
                            });
                        } else if (msg.type === "stats") {
                            console.log(
                                `[Frontend] Received stats:`,
                                msg,
                            );
                            setScraperStats((prev) => {
                                const category =
                                    msg.category as keyof ScraperStats;
                                const current =
                                    prev[category];

                                return {
                                    ...prev,
                                    [category]: {
                                        added:
                                            (current?.added ??
                                                0) +
                                            (msg.added ??
                                                0),
                                        matched:
                                            (current?.matched ??
                                                0) +
                                            (msg.matched ??
                                                0),
                                        missed:
                                            (current?.missed ??
                                                0) +
                                            (msg.missed ??
                                                0),
                                        discarded:
                                            (current?.discarded ??
                                                0) +
                                            (msg.discarded ??
                                                0),
                                        discardedItems: [
                                            ...(current?.discardedItems ??
                                                []),
                                            ...(msg.discardedItems ??
                                                []),
                                        ],
                                    },
                                };
                            });
                        } else if (msg.type === "step") {
                            setSteps((prev) => {
                                const newSteps = prev.map(
                                    (s) => ({
                                        ...s,
                                        status: "completed" as const,
                                    }),
                                );
                                return [
                                    ...newSteps,
                                    {
                                        id:
                                            Date.now() +
                                            Math.random(),
                                        message:
                                            msg.message,
                                        status: "running" as const,
                                        timestamp:
                                            new Date().toLocaleTimeString(),
                                    },
                                ];
                            });
                        } else if (
                            msg.type === "complete"
                        ) {
                            setSteps((prev) => {
                                const newSteps = prev.map(
                                    (s) => ({
                                        ...s,
                                        status: "completed" as const,
                                    }),
                                );
                                return [
                                    ...newSteps,
                                    {
                                        id: "complete",
                                        message:
                                            "Scraping session finished successfully.",
                                        status: "completed" as const,
                                        timestamp:
                                            new Date().toLocaleTimeString(),
                                    },
                                ];
                            });
                        }
                    } catch (e) {
                        console.error(
                            "Failed to parse stream line:",
                            line,
                            e,
                        );
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
                return true;
            }
            const errorMessage =
                err.message || "An unexpected error occurred";
            setError(errorMessage);
            notifications.show({
                title: "Scraping Failed",
                message: errorMessage,
                color: "red",
                icon: <IconAlertCircle size={18} />,
            });
            return false;
        } finally {
            abortControllerRef.current = null;
        }
        return false;
    };

    return (
        <Container size="xl" py="md">
            <Modal
                opened={confirmOpened}
                onClose={closeConfirm}
                title={
                    <Text fw={700} size="sm">
                        {confirmConfig.title}
                    </Text>
                }
                size="sm"
                radius="md"
                centered
            >
                <Stack gap="md">
                    <Text size="sm" c="dimmed">
                        {confirmConfig.message}
                    </Text>
                    <Group justify="flex-end" gap="sm">
                        <Button
                            variant="default"
                            size="sm"
                            onClick={closeConfirm}
                        >
                            Cancel
                        </Button>
                        <Button
                            color="red"
                            size="sm"
                            onClick={handleConfirmed}
                        >
                            Delete
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal
                opened={settingsOpened}
                onClose={closeSettings}
                title={
                    <Text fw={700}>Scraper Settings</Text>
                }
                radius="md"
            >
                <Stack gap="md">
                    <NumberInput
                        label="Max cards per collection"
                        description="Limit the number of cards to scrape from each set."
                        value={cardScraperLimit}
                        onChange={(val) => {
                            const num = Number(val);
                            setCardScraperLimit(num);
                            localStorage.setItem(
                                "scraper_card_limit",
                                num.toString(),
                            );
                        }}
                        min={1}
                        max={1000}
                    />
                    <Button
                        onClick={closeSettings}
                        fullWidth
                    >
                        Save & Close
                    </Button>
                </Stack>
            </Modal>

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
                    actions={
                        <Tooltip label="Scraper Settings">
                            <ActionIcon
                                variant="subtle"
                                color="gray"
                                size="lg"
                                radius="md"
                                onClick={openSettings}
                            >
                                <IconSettings size={22} />
                            </ActionIcon>
                        </Tooltip>
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

                <SimpleGrid
                    cols={{ base: 1, sm: 3 }}
                    spacing="md"
                >
                    <Stack gap="md">
                        <CardScraperInputs
                            franchise={selectedFranchise}
                            language={selectedLanguage}
                            onFranchiseChange={(val) => {
                                setSelectedFranchise(val);
                                setSelectedLanguage("en");
                                setCollections([]);
                                setSteps([]);
                                setCards([]);
                                setSelectedCollection(null);
                            }}
                            onLanguageChange={(val) => {
                                setSelectedLanguage(val);
                                setCollections([]);
                                setCards([]);
                                setSelectedCollection(null);
                            }}
                        />
                        <CardScraperRunningSteps
                            steps={steps}
                            onStop={() => {
                                if (abortControllerRef.current) {
                                    abortControllerRef.current.abort();
                                    setCardLoading(false);
                                    setCollectionLoading(false);
                                }
                            }}
                        />
                        <CardScraperStats
                            stats={scraperStats}
                        />
                    </Stack>

                    <div>
                        <CardScraperCollectionList
                            collections={collections}
                            selectedId={
                                selectedCollection?.id
                            }
                            loading={collectionLoading}
                            onDeleteAllCollections={
                                handleDeleteAll
                            }
                            onDeleteCollection={
                                handleDeleteCollection
                            }
                            onRefresh={() =>
                                selectedFranchise &&
                                fetchExistingCollections(
                                    selectedFranchise,
                                    selectedLanguage ??
                                    "en",
                                )
                            }
                            onDownloadAllCollections={
                                handleDownloadCollections
                            }
                            onDownloadAllCards={
                                handleDownloadAllCards
                            }
                            onSelect={async (id) => {
                                const col =
                                    collections.find(
                                        (c) => c.id === id,
                                    );
                                setSelectedCollection(col);
                                setCards([]);
                                if (id) fetchCards(id);
                            }}
                        />
                    </div>

                    <div>
                        <CardScraperCardList
                            cards={cards}
                            collectionCode={
                                selectedCollection?.collectionCode
                            }
                            loading={cardLoading}
                            onDeleteCard={handleDeleteCard}
                            onDeleteAllCards={
                                handleDeleteAllCards
                            }
                            onDownloadCards={
                                handleDownloadCards
                            }
                            onRefresh={() =>
                                selectedCollection?.id &&
                                fetchCards(
                                    selectedCollection.id,
                                )
                            }
                            canDownload={
                                !!selectedCollection
                            }
                        />
                    </div>
                </SimpleGrid>
            </Stack>
        </Container>
    );
}
