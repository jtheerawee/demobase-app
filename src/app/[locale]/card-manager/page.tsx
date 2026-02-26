"use client";

import {
    Container,
    Stack,
    Image,
    Modal,
    Badge,
    Button,
    Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { PageHeader } from "@/components/PageHeader";
import { IconLayoutDashboard } from "@tabler/icons-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { MainLayout } from "@/components/CardManager/MainLayout";
import { useDebouncedValue } from "@mantine/hooks";
import { APP_CONFIG } from "@/constants/app";
import { OCR_CONFIG } from "@/constants/ocr";
import { CollectedCardWidget } from "@/components/CardManager/CardCollection";
import {
    SearchWidget,
    type SearchMode,
} from "@/components/CardManager/Search";
import {
    SearchResultWidget,
    SearchedCard,
} from "@/components/CardManager/SearchResult";
import { LANGUAGE_OPTIONS } from "@/constants/languages";
import { FRANCHISE_OPTIONS } from "@/constants/franchises";

export default function CardManagerPage() {
    const listRef = useRef<{ refresh: () => void }>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFranchise, setSelectedFranchise] = useState<string | null>(
        null,
    );
    const [selectedLanguage, setSelectedLanguage] = useState<string | null>(
        null,
    );
    const [debouncedQuery] = useDebouncedValue(searchQuery, 400);
    const [resultInfo, setResultInfo] = useState("");
    const [results, setResults] = useState<SearchedCard[]>([]);
    const [loading, setLoading] = useState(false);
    const [addingId, setAddingId] = useState<number | null>(null);
    const [searchMode, setSearchMode] = useState<SearchMode>("text");
    const [autoAdd, setAutoAdd] = useState(false);
    const [autoCapture, setAutoCapture] = useState(false);
    const [autoCaptureInterval, setAutoCaptureInterval] = useState<number>(
        OCR_CONFIG.AUTO_CAPTURE_INTERVAL,
    );
    const [autoCaptureActive, setAutoCaptureActive] = useState(false);
    const [waitingForSelection, setWaitingForSelection] = useState(false);
    const [resetTrigger, setResetTrigger] = useState(0);
    const [collectedCardIds, setCollectedCardIds] = useState<Set<number>>(
        new Set(),
    );
    const consecutiveNoCard = useRef(0);
    const consecutiveSameCard = useRef(0);
    const lastDetectedCardId = useRef<number | null>(null);

    const refreshCollection = () => listRef.current?.refresh();

    // Initial load from localStorage
    useEffect(() => {
        const savedFranchise =
            localStorage.getItem("manager_selected_franchise") || "all";
        const savedLanguage =
            localStorage.getItem("manager_selected_language") || "all";
        let savedMode =
            (localStorage.getItem("manager_search_mode") as SearchMode) ||
            "text";
        const savedAutoAdd =
            localStorage.getItem("manager_auto_add") === "true";
        const savedAutoCapture =
            localStorage.getItem("manager_auto_capture") === "true";
        const savedInterval = parseInt(
            localStorage.getItem("manager_auto_capture_interval") || "5",
        );
        setSelectedFranchise(savedFranchise);
        setSelectedLanguage(savedLanguage);
        setSearchMode(savedMode);
        setAutoAdd(savedAutoAdd);
        setAutoCapture(savedAutoCapture);
        setAutoCaptureInterval(Math.max(5, savedInterval));
    }, []);

    // Save to localStorage when changed
    useEffect(() => {
        if (selectedFranchise)
            localStorage.setItem(
                "manager_selected_franchise",
                selectedFranchise,
            );
        if (selectedLanguage)
            localStorage.setItem("manager_selected_language", selectedLanguage);
        localStorage.setItem("manager_search_mode", searchMode);
        localStorage.setItem("manager_auto_add", autoAdd.toString());
        localStorage.setItem("manager_auto_capture", autoCapture.toString());
        localStorage.setItem(
            "manager_auto_capture_interval",
            autoCaptureInterval.toString(),
        );
    }, [
        selectedFranchise,
        selectedLanguage,
        searchMode,
        autoAdd,
        autoCapture,
        autoCaptureInterval,
    ]);

    const languageOptions = useMemo(() => {
        if (!selectedFranchise || selectedFranchise === "all")
            return [{ value: "all", label: "All Languages" }];
        return [
            { value: "all", label: "All Languages" },
            ...(LANGUAGE_OPTIONS[selectedFranchise] || []),
        ];
    }, [selectedFranchise]);

    useEffect(() => {
        if (debouncedQuery.length >= APP_CONFIG.SEARCH_MIN_CHARS) {
            handleSearch(debouncedQuery);
        } else {
            setResults([]);
        }
    }, [debouncedQuery, selectedFranchise, selectedLanguage]);

    const handleSearch = async (query: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                q: query,
                franchise: selectedFranchise || "all",
                language: selectedLanguage || "all",
            });
            const res = await fetch(
                `/api/card-manager/search?${params.toString()}`,
            );
            const data = await res.json();
            if (data.success) {
                setResults(data.cards);
            }
        } catch (err) {
            console.error("Search failed:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleScanIds = async (ids: string[]) => {
        if (ids.length === 0) {
            setLoading(false);
            if (autoCapture) {
                consecutiveNoCard.current += 1;
                if (
                    consecutiveNoCard.current >=
                    OCR_CONFIG.AUTO_CAPTURE_MAX_NO_CARD
                ) {
                    consecutiveNoCard.current = 0;
                    setAutoCaptureActive(false);
                    notifications.show({
                        title: "Auto-capture Stopped",
                        message: `No card detected for ${OCR_CONFIG.AUTO_CAPTURE_MAX_NO_CARD} consecutive captures. Process paused.`,
                        color: "orange",
                        autoClose: APP_CONFIG.NOTIFICATION_AUTO_CLOSE,
                    });
                }
            }
            return;
        }

        setLoading(true);
        try {
            const params = new URLSearchParams({
                scan_ids: ids.join(","),
                franchise: selectedFranchise || "all",
                language: selectedLanguage || "all",
            });
            const res = await fetch(
                `/api/card-manager/search?${params.toString()}`,
            );
            const data = await res.json();
            if (data.success) {
                setResults(data.cards);

                if (data.cards.length > 0) {
                    consecutiveNoCard.current = 0;
                } else {
                    consecutiveNoCard.current += 1;
                }

                // Track consecutive same card
                if (autoCapture && data.cards.length === 1) {
                    const cardId = data.cards[0].id;
                    if (cardId === lastDetectedCardId.current) {
                        consecutiveSameCard.current += 1;
                    } else {
                        consecutiveSameCard.current = 1;
                        lastDetectedCardId.current = cardId;
                    }
                } else {
                    consecutiveSameCard.current = 0;
                    lastDetectedCardId.current = null;
                }

                // Stop auto-capture loop if X times in a row no card detected
                if (
                    autoCapture &&
                    consecutiveNoCard.current >=
                    OCR_CONFIG.AUTO_CAPTURE_MAX_NO_CARD
                ) {
                    consecutiveNoCard.current = 0;
                    setAutoCaptureActive(false);
                    notifications.show({
                        title: "Auto-capture Stopped",
                        message: `No card detected for ${OCR_CONFIG.AUTO_CAPTURE_MAX_NO_CARD} consecutive captures. Process paused.`,
                        color: "orange",
                        autoClose: APP_CONFIG.NOTIFICATION_AUTO_CLOSE,
                    });
                }

                // Stop auto-capture if the same card detected too many times in a row
                if (
                    autoCapture &&
                    consecutiveSameCard.current >=
                    OCR_CONFIG.AUTO_CAPTURE_MAX_SAME_CARD
                ) {
                    consecutiveSameCard.current = 0;
                    lastDetectedCardId.current = null;
                    setAutoCaptureActive(false);
                    notifications.show({
                        title: "Auto-capture Stopped",
                        message: `Same card detected ${OCR_CONFIG.AUTO_CAPTURE_MAX_SAME_CARD} times in a row. Process paused.`,
                        color: "orange",
                        autoClose: APP_CONFIG.NOTIFICATION_AUTO_CLOSE,
                    });
                }

                // Auto-add if exactly one card found and autoAdd is enabled
                if (autoAdd && data.cards.length === 1) {
                    handleAddToCollection(data.cards[0]);
                } else if (data.cards.length > 1) {
                    setWaitingForSelection(true);
                } else {
                    setWaitingForSelection(false);
                }
            }
        } catch (err) {
            console.error("Scan fetch failed:", err);
            consecutiveNoCard.current += 1;
            if (
                autoCapture &&
                consecutiveNoCard.current >= OCR_CONFIG.AUTO_CAPTURE_MAX_NO_CARD
            ) {
                consecutiveNoCard.current = 0;
                setAutoCaptureActive(false);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCollection = async (card: SearchedCard) => {
        setAddingId(card.id);
        try {
            const res = await fetch("/api/card-manager/collected", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cardId: card.id,
                    variant: "nf",
                    condition: "nm",
                    checkVariantCondition: false,
                }),
            });
            const data = await res.json();
            if (data.success) {
                refreshCollection();
                setWaitingForSelection(false);

                notifications.show({
                    title: data.alreadyInCollection
                        ? "Already in Collection"
                        : "Added to Collection",
                    message: data.alreadyInCollection
                        ? `${card.name} (${card.collectionCode}) is already in your collection.`
                        : `${card.name} (${card.collectionCode}) added.`,
                    color: "green",
                    autoClose: APP_CONFIG.NOTIFICATION_AUTO_CLOSE,
                });
            } else {
                notifications.show({
                    title: "Failed to Add",
                    message: data.error || "Could not add card to collection.",
                    color: "red",
                    autoClose: APP_CONFIG.NOTIFICATION_AUTO_CLOSE,
                });
            }
        } catch (err) {
            console.error("Failed to add card:", err);
            notifications.show({
                title: "Error",
                message: "Network error while adding card.",
                color: "red",
                autoClose: APP_CONFIG.NOTIFICATION_AUTO_CLOSE,
            });
        } finally {
            setAddingId(null);
        }
    };

    const handleReset = () => {
        setSearchQuery("");
        setResultInfo("");
        setResults([]);
        setWaitingForSelection(false);
        setResetTrigger((prev) => prev + 1);
        notifications.show({
            title: "Scanner Reset",
            message: "Clear results and snapshot",
            color: "gray",
            autoClose: APP_CONFIG.NOTIFICATION_AUTO_CLOSE,
        });
    };

    return (
        <Container size="xl" py="md">
            <Stack gap="lg">
                <PageHeader
                    title="Card Manager"
                    description="Manage your card collection"
                    icon={
                        <IconLayoutDashboard
                            size={32}
                            color="var(--mantine-color-grape-6)"
                        />
                    }
                />

                <MainLayout
                    collection={
                        <CollectedCardWidget
                            ref={listRef}
                            onCollectionChange={setCollectedCardIds}
                        />
                    }
                    results={
                        <SearchResultWidget
                            results={results}
                            loading={loading}
                            info={searchMode === "text" ? searchQuery : resultInfo}
                            addingId={addingId}
                            collectedCardIds={collectedCardIds}
                            onAddToCollection={handleAddToCollection}
                            onReset={handleReset}
                            waitingForSelection={waitingForSelection}
                        />
                    }
                    controls={
                        <SearchWidget
                            query={searchQuery}
                            setQuery={setSearchQuery}
                            loading={loading}
                            searchMode={searchMode}
                            onSearchModeChange={setSearchMode}
                            onScanIds={handleScanIds}
                            onScanStart={() => {
                                setResults([]);
                                setResultInfo("");
                                setLoading(true);
                            }}
                            onResultInfo={setResultInfo}
                            autoAdd={autoAdd}
                            onAutoAddChange={setAutoAdd}
                            autoCapture={autoCapture}
                            onAutoCaptureChange={(val) => {
                                setAutoCapture(val);
                                if (val) setAutoAdd(true);
                                else setAutoCaptureActive(false);
                            }}
                            loopActive={autoCaptureActive}
                            onLoopActiveChange={(val) => {
                                if (!val) {
                                    consecutiveNoCard.current = 0;
                                    consecutiveSameCard.current = 0;
                                    lastDetectedCardId.current = null;
                                }
                                setAutoCaptureActive(val);
                            }}
                            autoCaptureInterval={autoCaptureInterval}
                            onAutoCaptureIntervalChange={
                                setAutoCaptureInterval
                            }
                            paused={waitingForSelection}
                            onClear={() => {
                                setWaitingForSelection(false);
                                setResultInfo("");
                            }}
                            resetTrigger={resetTrigger}
                            selectedFranchise={selectedFranchise}
                            onFranchiseChange={(val) => {
                                setSelectedFranchise(val);
                                setSelectedLanguage("all");
                            }}
                            franchiseOptions={[
                                { value: "all", label: "All Franchises" },
                                ...FRANCHISE_OPTIONS,
                            ]}
                            selectedLanguage={selectedLanguage}
                            onLanguageChange={setSelectedLanguage}
                            languageOptions={languageOptions}
                        />
                    }
                />
            </Stack>
        </Container>
    );
}
