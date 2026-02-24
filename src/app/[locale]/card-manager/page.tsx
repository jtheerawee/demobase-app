"use client";

import { Container, Stack, TextInput, Group, Card, Image, Text, Badge, ScrollArea, SimpleGrid, Loader, ActionIcon, Grid, CloseButton, Modal } from "@mantine/core";
import { PageHeader } from "@/components/PageHeader";
import { IconLayoutDashboard, IconSearch, IconExternalLink, IconPlus } from "@tabler/icons-react";
import { useState, useEffect, useRef } from "react";
import { useDebouncedValue } from "@mantine/hooks";
import { APP_CONFIG } from "@/constants/app";
import { CollectedCardsList } from "@/components/CardManager/CollectedCardsList";

interface SearchedCard {
    id: number;
    name: string;
    imageUrl: string;
    cardUrl: string;
    cardNo: string;
    rarity: string;
    collectionName: string;
    collectionCode: string;
}

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
                    {/* Left Sidebar: Collected Cards (1/3) */}
                    <Grid.Col span={{ base: 12, md: 4 }} h="100%">
                        <CollectedCardsList ref={listRef} onImageClick={setPreviewImage} />
                    </Grid.Col>

                    {/* Right Content: Search (2/3) */}
                    <Grid.Col span={{ base: 12, md: 8 }} h="100%">
                        <Card withBorder padding="md" radius="md" shadow="sm" h="100%">
                            <Stack gap="md" h="100%">
                                <Group justify="space-between">
                                    <Text fw={700} size="lg">Search Database</Text>
                                </Group>

                                <Group justify="center" w="100%">
                                    <TextInput
                                        placeholder={`Type card name (min ${APP_CONFIG.SEARCH_MIN_CHARS} chars)...`}
                                        size="md"
                                        w="100%"
                                        leftSection={<IconSearch size={18} />}
                                        rightSection={
                                            loading ? (
                                                <Loader size="xs" />
                                            ) : searchQuery !== "" ? (
                                                <CloseButton
                                                    onClick={() => setSearchQuery("")}
                                                    style={{ display: searchQuery ? 'block' : 'none' }}
                                                />
                                            ) : null
                                        }
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.currentTarget.value)}
                                    />
                                </Group>

                                {results.length > 0 && (
                                    <Text size="sm" fw={600} c="dimmed">
                                        Found {results.length} cards
                                    </Text>
                                )}

                                <ScrollArea flex={1} offsetScrollbars type="always">
                                    <SimpleGrid cols={{ base: 1, sm: 1, md: 2, lg: APP_CONFIG.SEARCH_RESULTS_PER_ROW }} spacing="xs">
                                        {results.map((card) => (
                                            <Card key={card.id} withBorder padding={6} radius="xs" h={120} style={{ position: 'relative' }}>
                                                <Group gap="xs" wrap="nowrap" align="center">
                                                    <Image
                                                        src={card.imageUrl}
                                                        fallbackSrc="https://placehold.co/100x140?text=No+Image"
                                                        alt={card.name}
                                                        radius="xs"
                                                        w={70}
                                                        h={108}
                                                        style={{ objectFit: 'contain', cursor: 'pointer' }}
                                                        onClick={() => setPreviewImage(card.imageUrl)}
                                                    />
                                                    <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                                                        <Group justify="space-between" wrap="nowrap" gap={4}>
                                                            <Text size="xs" fw={700} lineClamp={1}>
                                                                {card.name}
                                                            </Text>
                                                            <Group gap={2}>
                                                                <ActionIcon
                                                                    variant="subtle"
                                                                    color="blue"
                                                                    size="xs"
                                                                    component="a"
                                                                    href={card.cardUrl}
                                                                    target="_blank"
                                                                >
                                                                    <IconExternalLink size={12} />
                                                                </ActionIcon>
                                                                <ActionIcon
                                                                    variant="light"
                                                                    color="grape"
                                                                    size="xs"
                                                                    title="Add to collection"
                                                                    onClick={() => handleAddToCollection(card)}
                                                                    loading={addingId === card.id}
                                                                >
                                                                    <IconPlus size={12} />
                                                                </ActionIcon>
                                                            </Group>
                                                        </Group>

                                                        <Text size="10px" c="dimmed" lineClamp={1}>
                                                            Set: {card.collectionName}
                                                        </Text>

                                                        <Group gap={4} mt="auto">
                                                            <Badge size="10px" variant="light" color="blue" radius="xs" px={4} h={18}>
                                                                No: {card.cardNo || "---"}
                                                            </Badge>
                                                            <Badge size="10px" variant="outline" color="gray" radius="xs" px={4} h={18}>
                                                                {card.rarity || "---"}
                                                            </Badge>
                                                        </Group>
                                                    </Stack>
                                                </Group>
                                            </Card>
                                        ))}
                                    </SimpleGrid>

                                    {results.length === 0 && !loading && searchQuery.length >= APP_CONFIG.SEARCH_MIN_CHARS && (
                                        <Text ta="center" py="xl" c="dimmed">No cards found matching "{searchQuery}"</Text>
                                    )}
                                </ScrollArea>
                            </Stack>
                        </Card>
                    </Grid.Col>
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
                        style={{ maxHeight: '85vh', width: 'auto' }}
                        onClick={() => setPreviewImage(null)}
                    />
                )}
            </Modal>
        </Container>
    );
}
