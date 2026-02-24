"use client";

import { Card, Group, Stack, Text, SimpleGrid, Badge } from "@mantine/core";

export interface ScraperStats {
    collections: { added: number; matched: number; missed: number };
    cards: { added: number; matched: number; missed: number };
}

interface StatWidgetProps {
    label: string;
    color: string;
    collections: number;
    cards: number;
}

function StatWidget({ label, color, collections, cards }: StatWidgetProps) {
    return (
        <Card withBorder radius="sm" padding="sm">
            <Stack gap={4}>
                <Badge variant="light" color={color} size="xs" radius="sm">{label}</Badge>
                <Group justify="space-between" align="baseline">
                    <Text size="xs" c="dimmed">Collections</Text>
                    <Text size="sm" fw={700}>{collections}</Text>
                </Group>
                <Group justify="space-between" align="baseline">
                    <Text size="xs" c="dimmed">Cards</Text>
                    <Text size="sm" fw={700}>{cards}</Text>
                </Group>
            </Stack>
        </Card>
    );
}

interface CardScraperStatsProps {
    stats: ScraperStats;
}

export function CardScraperStats({ stats }: CardScraperStatsProps) {
    return (
        <SimpleGrid cols={3} spacing="xs">
            <StatWidget
                label="Added"
                color="green"
                collections={stats.collections.added}
                cards={stats.cards.added}
            />
            <StatWidget
                label="Matched"
                color="blue"
                collections={stats.collections.matched}
                cards={stats.cards.matched}
            />
            <StatWidget
                label="Missed"
                color="orange"
                collections={stats.collections.missed}
                cards={stats.cards.missed}
            />
        </SimpleGrid>
    );
}
