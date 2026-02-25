"use client";

import { Container, Stack, Group, Card, Image, Text, Grid, Modal, Select, Badge } from "@mantine/core";
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

    // Initial load from localStorage
    useEffect(() => {
        const savedFranchise = localStorage.getItem("manager_selected_franchise") || "all";
        const savedLanguage = localStorage.getItem("manager_selected_language") || "all";
        setSelectedFranchise(savedFranchise);
        setSelectedLanguage(savedLanguage);
    }, []);

    // Save to localStorage when changed
    useEffect(() => {
        if (selectedFranchise) localStorage.setItem("manager_selected_franchise", selectedFranchise);
        if (selectedLanguage) localStorage.setItem("manager_selected_language", selectedLanguage);
    }, [selectedFranchise, selectedLanguage]);

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

    const handleAddToCollection = async (card: SearchedCard) => {
        setAddingId(card.id);
        try {
            const res = await fetch("/api/card-manager/collected", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cardId: card.id,
                    variant: "NF", // Default to Non-Foil for now
                    condition: "NM" // Default to Near Mint
                })
            });
            const data = await res.json();
            if (data.success) {
                // Refresh the left sidebar list
                listRef.current?.refresh();
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
                    description="Manage your card collection and inventory"
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
                        <Grid.Col span={{ base: 12, md: APP_CONFIG.ENABLED_WIDGETS.CARD_MANAGER_SEARCH ? 3 : 12 }} h="100%">
                            <CollectedCardsList ref={listRef} onImageClick={setPreviewImage} />
                        </Grid.Col>
                    )}

                    {/* Right Content: Search (3/4) */}
                    {APP_CONFIG.ENABLED_WIDGETS.CARD_MANAGER_SEARCH && (
                        <Grid.Col span={{ base: 12, md: APP_CONFIG.ENABLED_WIDGETS.CARD_MANAGER_COLLECTION ? 9 : 12 }} h="100%">
                            <Card withBorder padding="md" radius="md" shadow="sm" h="100%">
                                <Stack gap="md" h="100%">
                                    <Group justify="space-between">
                                        <Text fw={700} size="lg">Search Database</Text>
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
                                    />

                                    {results.length > 0 && (
                                        <Text size="sm" fw={600} c="dimmed">
                                            Found {results.length} cards
                                        </Text>
                                    )}

                                    <CardManagerResult
                                        results={results}
                                        loading={loading}
                                        query={searchQuery}
                                        addingId={addingId}
                                        onAddToCollection={handleAddToCollection}
                                        onImageClick={setPreviewImage}
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
