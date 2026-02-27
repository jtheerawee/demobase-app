"use client";

import { Badge, Group, Paper, Text } from "@mantine/core";
import { useMemo } from "react";

interface CardItem {
    id: string | number;
    name: string;
    rarity?: string;
}

interface ScrapedCardSummaryProps {
    cards: CardItem[];
}

export function ScrapedCardSummary({ cards }: ScrapedCardSummaryProps) {
    const rarityCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        cards.forEach((card) => {
            const rarity = card.rarity || "Unknown";
            counts[rarity] = (counts[rarity] || 0) + 1;
        });

        // Sort by count descending
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }, [cards]);

    if (cards.length === 0) return null;

    return (
        <Paper withBorder p="xs" radius="sm" bg="var(--mantine-color-gray-0)">
            <Group gap="xs">
                {rarityCounts.map(([rarity, count]) => (
                    <Badge
                        key={rarity}
                        variant="dot"
                        color="blue"
                        size="sm"
                        styles={{ label: { textTransform: "none" } }}
                    >
                        <Text component="span" fw={700} size="xs" mr={4}>
                            {count}
                        </Text>
                        {rarity}
                    </Badge>
                ))}
            </Group>
        </Paper>
    );
}
