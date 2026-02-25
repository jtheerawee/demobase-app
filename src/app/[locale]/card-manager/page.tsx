"use client";

import { Container, Stack, Group, Card, Image, Text, Grid, Modal, Select, Badge, Box, Loader as MantineLoader } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { PageHeader } from "@/components/PageHeader";
import { IconLayoutDashboard } from "@tabler/icons-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { useDebouncedValue } from "@mantine/hooks";
import { APP_CONFIG } from "@/constants/app";
import { CollectedCardsList } from "@/components/CardManager/CollectedCardsList";
import { CardManagerSearch, type SearchMode } from "@/components/CardManager/CardManagerSearch";
import { CardManagerResult, SearchedCard } from "@/components/CardManager/CardManagerResult";
import { LANGUAGE_OPTIONS, FRANCHISE_OPTIONS } from "@/constants/languages";

export default function CardManagerPage() {
    const listRef = useRef<{ refresh: () => void }>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFranchise, setSelectedFranchise] = useState<string | null>(null);
    const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
    const [debouncedQuery] = useDebouncedValue(searchQuery, 400);
    const [results, setResults] = useState<SearchedCard[]>([]);
    const [loading, setLoading] = useState(false);
    const [addingId, setAddingId] = useState<number | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [imgDimensions, setImgDimensions] = useState<{ w: number; h: number } | null>(null);
    const [searchMode, setSearchMode] = useState<SearchMode>("text");
    const [autoAdd, setAutoAdd] = useState(false);
    const [autoCapture, setAutoCapture] = useState(false);
    const [autoCaptureActive, setAutoCaptureActive] = useState(false);
    const [waitingForSelection, setWaitingForSelection] = useState(false);
    const consecutiveNoCard = useRef(0);

    // Initial load from localStorage
    useEffect(() => {
        const savedFranchise = localStorage.getItem("manager_selected_franchise") || "all";
        const savedLanguage = localStorage.getItem("manager_selected_language") || "all";
        const savedMode = localStorage.getItem("manager_search_mode") as SearchMode || "text";
        const savedAutoAdd = localStorage.getItem("manager_auto_add") === "true";
        const savedAutoCapture = localStorage.getItem("manager_auto_capture") === "true";
        setSelectedFranchise(savedFranchise);
        setSelectedLanguage(savedLanguage);
        setSearchMode(savedMode);
        setAutoAdd(savedAutoAdd);
        setAutoCapture(savedAutoCapture);
    }, []);

    // Save to localStorage when changed
    useEffect(() => {
        if (selectedFranchise) localStorage.setItem("manager_selected_franchise", selectedFranchise);
        if (selectedLanguage) localStorage.setItem("manager_selected_language", selectedLanguage);
        localStorage.setItem("manager_search_mode", searchMode);
        localStorage.setItem("manager_auto_add", autoAdd.toString());
        localStorage.setItem("manager_auto_capture", autoCapture.toString());
    }, [selectedFranchise, selectedLanguage, searchMode, autoAdd, autoCapture]);

    const languageOptions = useMemo(() => {
        if (!selectedFranchise || selectedFranchise === "all") return [{ value: "all", label: "All Languages" }];
        return [
            { value: "all", label: "All Languages" },
            ...(LANGUAGE_OPTIONS[selectedFranchise] || [])
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
                language: selectedLanguage || "all"
            });
            const res = await fetch(`/api/card-manager/search?${params.toString()}`);
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
            if (autoCapture) {
                consecutiveNoCard.current += 1;
                if (consecutiveNoCard.current >= APP_CONFIG.AUTO_CAPTURE_MAX_NO_CARD) {
                    setAutoCaptureActive(false);
                    notifications.show({
                        title: "Auto-capture Stopped",
                        message: `No card detected for ${APP_CONFIG.AUTO_CAPTURE_MAX_NO_CARD} consecutive captures. Process paused.`,
                        color: "orange"
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
                language: selectedLanguage || "all"
            });
            const res = await fetch(`/api/card-manager/search?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setResults(data.cards);

                if (data.cards.length > 0) {
                    consecutiveNoCard.current = 0;
                } else {
                    consecutiveNoCard.current += 1;
                }

                // Stop auto-capture loop if X times in a row no card detected
                if (autoCapture && consecutiveNoCard.current >= APP_CONFIG.AUTO_CAPTURE_MAX_NO_CARD) {
                    setAutoCaptureActive(false);
                    notifications.show({
                        title: "Auto-capture Stopped",
                        message: `No card detected for ${APP_CONFIG.AUTO_CAPTURE_MAX_NO_CARD} consecutive captures. Process paused.`,
                        color: "orange"
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
            if (autoCapture && consecutiveNoCard.current >= APP_CONFIG.AUTO_CAPTURE_MAX_NO_CARD) {
                setAutoCaptureActive(false);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCollection = async (card: SearchedCard) => {
        setAddingId(card.id);
        const autoMode = autoAdd || autoCapture;
        try {
            const res = await fetch("/api/card-manager/collected", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cardId: card.id,
                    variant: "NF", // Default to Non-Foil for now
                    condition: "NM", // Default to Near Mint
                    noIncrement: autoMode // Don't add more if in auto mode
                })
            });
            const data = await res.json();
            if (data.success) {
                // Refresh the left sidebar list
                listRef.current?.refresh();

                setWaitingForSelection(false);

                const isDuplicate = data.alreadyInCollection;

                if (isDuplicate && autoMode) {
                    notifications.show({
                        title: "Already in Collection",
                        message: `${card.name} (${card.collectionCode}) is already in your collection. No changes made.`,
                        color: "blue",
                        autoClose: 2000,
                    });
                } else {
                    notifications.show({
                        title: isDuplicate ? "Quantity Increased" : "Added to Collection",
                        message: `${card.name} (${card.collectionCode}) ${isDuplicate ? "count increased" : "added"}.`,
                        color: isDuplicate ? "blue" : "green",
                        autoClose: 2000,
                    });
                }

                // Stop auto-capture loop if card already in collection during auto-capture
                if (autoCapture && isDuplicate) {
                    setAutoCaptureActive(false);
                    notifications.show({
                        title: "Auto Loop Paused",
                        message: "Found a duplicate card. Automated capture has been suspended.",
                        color: "info"
                    });
                }
            }
        } catch (err) {
            console.error("Failed to add card:", err);
        } finally {
            setAddingId(null);
        }
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

                <Grid gutter="md" align="flex-start" style={{ height: 'calc(100vh - 180px)' }}>
                    {/* Left Sidebar: Collected Cards (1/4) */}
                    {APP_CONFIG.ENABLED_WIDGETS.CARD_MANAGER_COLLECTION && (
                        <Grid.Col span={{ base: 12, md: APP_CONFIG.CARD_MANAGER_LAYOUT.COLLECTION_SPAN }} h="100%">
                            <CollectedCardsList ref={listRef} onImageClick={setPreviewImage} />
                        </Grid.Col>
                    )}

                    {/* Middle: Search Results (1/4) */}
                    <Grid.Col span={{ base: 12, md: APP_CONFIG.CARD_MANAGER_LAYOUT.RESULTS_SPAN }} h="100%">
                        <Card withBorder padding="md" radius="md" shadow="sm" h="100%">
                            <Stack gap="md" h="100%">
                                <Group justify="space-between" align="center">
                                    <Text fw={700} size="lg">Search Results</Text>
                                    {results.length > 0 && (
                                        <Badge color="blue" variant="filled" h={18} styles={{ label: { fontSize: '10px' } }}>
                                            {results.length}
                                        </Badge>
                                    )}
                                </Group>
                                <Box style={{ flex: 1, minHeight: 0 }}>
                                    <CardManagerResult
                                        results={results}
                                        loading={loading}
                                        query={searchQuery}
                                        addingId={addingId}
                                        onAddToCollection={handleAddToCollection}
                                        onImageClick={setPreviewImage}
                                    />
                                </Box>
                            </Stack>
                        </Card>
                    </Grid.Col>

                    {/* Right: Camera / Search Input (2/4) */}
                    {APP_CONFIG.ENABLED_WIDGETS.CARD_MANAGER_SEARCH && (
                        <Grid.Col span={{ base: 12, md: APP_CONFIG.CARD_MANAGER_LAYOUT.CONTROLS_SPAN }} h="100%">
                            <Card withBorder padding="md" radius="md" shadow="sm" h="100%">
                                <Stack gap="md" h="100%">
                                    <Group justify="space-between">
                                        <Text fw={700} size="lg">Search</Text>
                                        <Group gap="xs">
                                            <Select
                                                size="xs"
                                                placeholder="Franchise"
                                                value={selectedFranchise}
                                                onChange={(val) => {
                                                    setSelectedFranchise(val);
                                                    setSelectedLanguage("all");
                                                }}
                                                data={[{ value: "all", label: "All Franchises" }, ...FRANCHISE_OPTIONS]}
                                                style={{ width: 140 }}
                                            />
                                            <Select
                                                size="xs"
                                                placeholder="Language"
                                                value={selectedLanguage}
                                                onChange={setSelectedLanguage}
                                                data={languageOptions}
                                                style={{ width: 140 }}
                                            />
                                        </Group>
                                    </Group>

                                    <CardManagerSearch
                                        query={searchQuery}
                                        setQuery={setSearchQuery}
                                        loading={loading}
                                        searchMode={searchMode}
                                        onSearchModeChange={setSearchMode}
                                        onScanIds={handleScanIds}
                                        autoAdd={autoAdd}
                                        onAutoAddChange={setAutoAdd}
                                        autoCapture={autoCapture}
                                        onAutoCaptureChange={(val) => {
                                            setAutoCapture(val);
                                            if (val) setAutoAdd(true);
                                            else setAutoCaptureActive(false);
                                        }}
                                        loopActive={autoCaptureActive}
                                        onLoopActiveChange={setAutoCaptureActive}
                                        paused={waitingForSelection}
                                        onClear={() => setWaitingForSelection(false)}
                                    />
                                </Stack>
                            </Card>
                        </Grid.Col>
                    )}
                </Grid>
            </Stack>

            <Modal
                opened={!!previewImage}
                onClose={() => {
                    setPreviewImage(null);
                    setImgDimensions(null);
                }}
                size="auto"
                padding={0}
                centered
                withCloseButton={false}
                overlayProps={{
                    backgroundOpacity: 0.55,
                    blur: 3,
                }}
            >
                {previewImage && (
                    <Stack gap={0} align="center" pos="relative">
                        <Image
                            src={previewImage}
                            alt="Card Preview"
                            style={{
                                width: APP_CONFIG.PREVIEW_IMAGE_WIDTH,
                                height: 'auto',
                                cursor: 'pointer'
                            }}
                            onClick={() => {
                                setPreviewImage(null);
                                setImgDimensions(null);
                            }}
                            onLoad={(e) => {
                                const img = e.currentTarget;
                                setImgDimensions({ w: img.naturalWidth, h: img.naturalHeight });
                            }}
                        />
                        {imgDimensions && (
                            <Badge
                                variant="filled"
                                color="dark"
                                size="sm"
                                radius="xs"
                                pos="absolute"
                                bottom={8}
                                right={8}
                                style={{ opacity: 0.8, pointerEvents: 'none' }}
                            >
                                {imgDimensions.w} × {imgDimensions.h} px
                            </Badge>
                        )}
                    </Stack>
                )}
            </Modal>
        </Container>
    );
}
