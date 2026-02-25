"use client";

import { ScrollArea, SimpleGrid, Card, Group, Image, Stack, Text, ActionIcon, Badge, Box, Loader } from "@mantine/core";
import { IconExternalLink, IconPlus } from "@tabler/icons-react";
import { APP_CONFIG } from "@/constants/app";

export interface SearchedCard {
    id: number;
    name: string;
    imageUrl: string;
    cardUrl: string;
    cardNo: string;
    rarity: string;
    collectionName: string;
    collectionCode: string;
}

interface CardManagerResultProps {
    results: SearchedCard[];
    loading: boolean;
    query: string;
    addingId: number | null;
    onAddToCollection: (card: SearchedCard) => void;
    onImageClick: (url: string) => void;
}

export function CardManagerResult({
    results,
    loading,
    query,
    addingId,
    onAddToCollection,
    onImageClick
}: CardManagerResultProps) {
    return (
        <ScrollArea flex={1} offsetScrollbars type="always">
            <SimpleGrid cols={{ base: 1, sm: 1, md: 2, lg: APP_CONFIG.SEARCH_RESULTS_PER_ROW }} spacing="xs">
                {results.map((card) => (
                    <Card
                        key={card.id}
                        withBorder
                        padding="xs"
                        radius="sm"
                        h={115}
                        style={{
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                            cursor: 'default'
                        }}
                    >
                        <Group gap="sm" wrap="nowrap" h="100%" align="center">
                            <Box w={65} style={{ display: 'flex', justifyContent: 'center' }}>
                                <Image
                                    src={card.imageUrl}
                                    fallbackSrc="https://placehold.co/100x140?text=No+Image"
                                    w={60}
                                    h={85}
                                    radius="xs"
                                    style={{
                                        objectFit: 'contain',
                                        cursor: 'pointer',
                                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                                    }}
                                    onClick={() => onImageClick(card.imageUrl)}
                                />
                            </Box>

                            <Stack gap={2} style={{ flex: 1, minWidth: 0, height: '100%', justifyContent: 'center' }}>
                                <Group justify="space-between" wrap="nowrap" gap={4}>
                                    <Text size="xs" fw={700} lineClamp={1} style={{ lineHeight: 1.2 }}>
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
                                            onClick={() => onAddToCollection(card)}
                                            loading={addingId === card.id}
                                        >
                                            <IconPlus size={12} />
                                        </ActionIcon>
                                    </Group>
                                </Group>

                                <Text size="10px" c="dimmed" lineClamp={1}>
                                    {card.collectionName}
                                </Text>

                                <Group gap={6} mt={2} align="center">
                                    <Text size="10px" fw={600} c="blue.7" bg="blue.0" px={4} style={{ borderRadius: '2px' }}>
                                        #{card.cardNo || "---"}
                                    </Text>
                                    <Text size="10px" fw={500} bg="gray.1" px={4} style={{ borderRadius: '2px' }}>
                                        {card.rarity || "---"}
                                    </Text>
                                </Group>
                            </Stack>
                        </Group>
                    </Card>
                ))}
            </SimpleGrid>

            {loading && results.length === 0 && (
                <Box py="xl" ta="center">
                    <Stack align="center" gap="xs">
                        <Loader size="sm" />
                        <Text c="dimmed" size="xs">Scanning and looking for cards...</Text>
                    </Stack>
                </Box>
            )}

            {results.length === 0 && !loading && (
                <Box py="xl" ta="center">
                    {query.length >= APP_CONFIG.SEARCH_MIN_CHARS ? (
                        <Text c="dimmed" size="xs">No cards found matching "{query}"</Text>
                    ) : (
                        <Text c="dimmed" size="xs">Waiting for next searching</Text>
                    )}
                </Box>
            )}
        </ScrollArea>
    );
}
