"use client";

import { Anchor, Box, Divider, Group, Image, Paper, SimpleGrid, Stack, Text, Title, Tooltip, Button } from "@mantine/core";
import { APP_CONFIG } from "@/constants/app";
import { ScraperCollectionList } from "./ScraperCollectionList";
import type { ScrapedCard, ScrapedCollection } from "./types";

function CardDetailOverlay({ card }: { card: ScrapedCard }) {
    const cardName = card.name || card.alt || "Unknown";
    const cardNumber = card.cardNo || "---";
    const cardRarity = card.rarity || "---";
    const hasData = !!(card.name || card.alt);

    const tooltipContent = (
        <Box p="md" style={{ minWidth: "240px" }}>
            <Stack gap={8} align="center">
                <Text fw={900} size="md" color="red.7" ta="center" style={{ lineHeight: 1.2 }}>
                    {cardName}
                </Text>

                <Divider w="100%" color="gray.2" />

                <Group gap={8} justify="center" wrap="nowrap">
                    <Text size="sm" fw={800} color="gray.8">
                        {cardNumber}
                    </Text>
                    <Text size="sm" fw={500} color="gray.4">
                        /
                    </Text>
                    <Text size="sm" fw={800} color="yellow.7">
                        {cardRarity}
                    </Text>
                </Group>

                {!card.cardNo && !card.rarity && (
                    <Text size="10px" color="gray.5" fs="italic">
                        Deep scraping for details...
                    </Text>
                )}
            </Stack>
        </Box>
    );

    return (
        <Tooltip
            label={tooltipContent}
            position="top"
            withArrow
            bg="white"
            c="dark"
            offset={10}
            transitionProps={{ transition: "slide-up", duration: 200 }}
            multiline
            p={0}
            zIndex={5000}
            withinPortal
            disabled={!hasData}
            style={{
                border: "1px solid #d0d0d0",
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                color: "#333",
            }}
        >
            <Paper
                withBorder
                radius="sm"
                p={0}
                bg="gray.1"
                style={{ position: "relative", overflow: "hidden", aspectRatio: "2.5 / 3.5" }}
            >
                {card.cardUrl ? (
                    <Anchor href={card.cardUrl} target="_blank" style={{ display: "block", height: "100%" }}>
                        <Image
                            src={card.imageUrl}
                            alt={card.name || card.alt}
                            fit="contain"
                            radius="xs"
                            loading="lazy"
                            h="100%"
                            fallbackSrc="https://placehold.co/400x600?text=Card"
                        />
                    </Anchor>
                ) : (
                    <Image
                        src={card.imageUrl}
                        alt={card.name || card.alt}
                        fit="contain"
                        radius="xs"
                        loading="lazy"
                        h="100%"
                        fallbackSrc="https://placehold.co/400x600?text=Card"
                    />
                )}
            </Paper>
        </Tooltip>
    );
}

interface ScraperCardsGridProps {
    cards: ScrapedCard[];
    onCollectionSelect?: (collectionId: string | null) => void;
    selectedCollectionId?: string | null;
    referenceCollections?: ScrapedCollection[];
    onScrape?: () => void;
    loading?: boolean;
}

export function ScraperCardsGrid({
    cards,
    onCollectionSelect,
    selectedCollectionId,
    referenceCollections,
    onScrape,
    loading,
}: ScraperCardsGridProps) {
    return (
        <Stack gap="xs">
            <Group justify="space-between" px="xs" align="center">
                <Title order={4}>Cards ({cards.length})</Title>

                {onCollectionSelect && (
                    <Group gap="xs">
                        <ScraperCollectionList
                            onSelect={onCollectionSelect}
                            selectedCollectionId={selectedCollectionId}
                            collections={referenceCollections}
                        />
                        {onScrape && (
                            <Button
                                size="xs"
                                variant="light"
                                color="teal"
                                onClick={onScrape}
                                loading={loading}
                                disabled={!selectedCollectionId}
                            >
                                Scrape Cards
                            </Button>
                        )}
                    </Group>
                )}
            </Group>

            {cards.length > 0 ? (
                <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5, xl: APP_CONFIG.SCRAPER_GRID_COLS }} spacing="md">
                    {cards.map((card, index) => (
                        <CardDetailOverlay key={index} card={card} />
                    ))}
                </SimpleGrid>
            ) : (
                <Paper withBorder p="xl" radius="md" bg="gray.0" style={{ borderStyle: "dashed" }}>
                    <Stack align="center" gap="xs">
                        <Text c="dimmed" size="sm">
                            No cards on this collection.
                        </Text>
                    </Stack>
                </Paper>
            )}
        </Stack>
    );
}
