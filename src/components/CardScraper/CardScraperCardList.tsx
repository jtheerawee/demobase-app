"use client";

import { Card, SimpleGrid, Image, Text, Stack, Group, Badge, ScrollArea } from "@mantine/core";

interface CardItem {
    id: string | number;
    name: string;
    cardNo?: string;
    rarity?: string;
    imageUrl: string;
}

interface CardScraperCardListProps {
    cards?: CardItem[];
    loading?: boolean;
    onDownloadCards?: () => void;
    canDownload?: boolean;
}

export function CardScraperCardList({ cards = [], loading, onDownloadCards, canDownload }: CardScraperCardListProps) {
    return (
        <Card withBorder radius="md" padding="md" shadow="sm">
            <Stack gap="md">
                <Group justify="space-between">
                    <Text fw={600}>Scraped Cards</Text>
                    <Group gap="xs">
                        {canDownload && (
                            <Badge
                                variant="light"
                                color="blue"
                                style={{ cursor: 'pointer' }}
                                onClick={onDownloadCards}
                            >
                                Download Cards
                            </Badge>
                        )}
                        <Badge variant="light" color="gray">
                            {cards.length} Items
                        </Badge>
                    </Group>
                </Group>

                <ScrollArea h={400} offsetScrollbars>
                    <SimpleGrid cols={2} spacing="xs">
                        {cards.map((card, index) => (
                            <Card key={card.id || index} withBorder padding="xs" radius="sm">
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
                                        <Group justify="space-between">
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
                            {canDownload ? "Click 'Download Cards' to fetch." : "Select a collection first."}
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
