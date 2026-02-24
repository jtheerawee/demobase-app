"use client";

import { Container, Stack, Group, Card, Image, Text, Grid, Modal } from "@mantine/core";
import { PageHeader } from "@/components/PageHeader";
import { IconLayoutDashboard } from "@tabler/icons-react";
import { useState, useEffect, useRef } from "react";
import { useDebouncedValue } from "@mantine/hooks";
import { APP_CONFIG } from "@/constants/app";
import { CollectedCardsList } from "@/components/CardManager/CollectedCardsList";
import { CardManagerSearch } from "@/components/CardManager/CardManagerSearch";
import { CardManagerResult, SearchedCard } from "@/components/CardManager/CardManagerResult";

export default function CardManagerPage() {
    const listRef = useRef<{ refresh: () => void }>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery] = useDebouncedValue(searchQuery, 400);
    const [results, setResults] = useState<SearchedCard[]>([]);
    const [loading, setLoading] = useState(false);
    const [addingId, setAddingId] = useState<number | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    useEffect(() => {
        if (debouncedQuery.length >= APP_CONFIG.SEARCH_MIN_CHARS) {
            handleSearch(debouncedQuery);
        } else {
            setResults([]);
        }
    }, [debouncedQuery]);

    const handleSearch = async (query: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/card-manager/search?q=${encodeURIComponent(query)}`);
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
                                    </Group>

                                    <CardManagerSearch
                                        query={searchQuery}
                                        setQuery={setSearchQuery}
                                        loading={loading}
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
                onClose={() => setPreviewImage(null)}
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
                    <Image
                        src={previewImage}
                        alt="Card Preview"
                        style={{ maxHeight: '85vh', width: 'auto', cursor: 'pointer' }}
                        onClick={() => setPreviewImage(null)}
                    />
                )}
            </Modal>
        </Container>
    );
}
