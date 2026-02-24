"use client";

import { Card, SimpleGrid, Image, Text, Stack, Group, Badge, ScrollArea, ActionIcon, Box } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";

interface CardItem {
    id: string | number;
    name: string;
    cardNo?: string;
    rarity?: string;
    imageUrl: string;
}

interface CardScraperCardListProps {
    cards?: CardItem[];
    collectionCode?: string;
    loading?: boolean;
    onDeleteCard?: (id: string | number) => void;
    onDeleteAllCards?: () => void;
    canDownload?: boolean;
}

export function CardScraperCardList({
    cards = [],
    collectionCode,
    loading,
    onDeleteCard,
    onDeleteAllCards,
    canDownload
}: CardScraperCardListProps) {
    return (
        <Card withBorder radius="md" padding="md" shadow="sm">
            <Stack gap="md">
                <Group justify="space-between">
                    <Text fw={600}>
                        Scraped Cards {collectionCode ? `(${collectionCode})` : ""}
                    </Text>
                    <Group gap="xs">
                        {cards.length > 0 && (
                            <ActionIcon
                                variant="light"
                                color="red"
                                size="sm"
                                onClick={onDeleteAllCards}
                                title="Delete all cards in this collection"
                            >
                                <IconTrash size={14} />
                            </ActionIcon>
                        )}
                        <Badge variant="light" color="gray">
                            {cards.length} Cards
                        </Badge>
                    </Group>
                </Group>

                <ScrollArea h={600} offsetScrollbars>
                    <SimpleGrid cols={2} spacing="xs">
                        {cards.map((card, index) => (
                            <Card key={card.id || index} withBorder padding="xs" radius="sm" style={{ position: 'relative' }}>
                                <ActionIcon
                                    variant="subtle"
                                    color="red"
                                    size="sm"
                                    onClick={() => onDeleteCard?.(card.id)}
                                    style={{
                                        position: 'absolute',
                                        top: 5,
                                        right: 5,
                                        zIndex: 10,
                                        backgroundColor: 'rgba(255,255,255,0.8)'
                                    }}
                                >
                                    <IconTrash size={14} />
                                </ActionIcon>

                                <Stack gap="xs">
                                    <Image
                                        src={card.imageUrl}
                                        fallbackSrc="https://placehold.co/200x280?text=No+Image"
                                        alt={card.name}
                                        radius="xs"
                                        style={{ aspectRatio: '2.5 / 3.5', objectFit: 'contain' }}
                                    />
                                    <Stack gap={2}>
                                        <Text size="xs" fw={700} lineClamp={1}>
                                            {card.name}
                                        </Text>
                                        <Group justify="space-between" align="center">
                                            <Text size="10px" c="dimmed">
                                                {card.cardNo || "---"}
                                            </Text>
                                            <Badge size="xs" variant="outline" radius="xs">
                                                {card.rarity || "---"}
                                            </Badge>
                                        </Group>
                                    </Stack>
                                </Stack>
                            </Card>
                        ))}
                    </SimpleGrid>
                    {cards.length === 0 && !loading && (
                        <Text size="sm" c="dimmed" ta="center" py="xl">
                            {canDownload ? "Download items to see cards." : "Select a collection first."}
                        </Text>
                    )}
                    {loading && (
                        <Text size="sm" c="dimmed" ta="center" py="xl">
                            Scraping cards...
                        </Text>
                    )}
                </ScrollArea>
            </Stack>
        </Card>
    );
}
