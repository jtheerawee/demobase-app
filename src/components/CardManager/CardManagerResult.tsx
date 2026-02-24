"use client";

import { ScrollArea, SimpleGrid, Card, Group, Image, Stack, Text, ActionIcon, Badge } from "@mantine/core";
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
                                onClick={() => onImageClick(card.imageUrl)}
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
                                            onClick={() => onAddToCollection(card)}
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

            {results.length === 0 && !loading && query.length >= APP_CONFIG.SEARCH_MIN_CHARS && (
                <Text ta="center" py="xl" c="dimmed">No cards found matching "{query}"</Text>
            )}
        </ScrollArea>
    );
}
