"use client";

import { Group, Paper, rem, SimpleGrid, Text, ThemeIcon } from "@mantine/core";
import { IconCards, IconCheck, IconClock, IconFolder, IconUsers } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import type { ScrapedCollection } from "./types";

interface ScraperSummaryProps {
    collections?: ScrapedCollection[];
    scrapingDuration?: number | null;
    processedCollectionsCount?: number | null;
    activeWorkers?: number | null;
}

const formatDuration = (seconds: number | null) => {
    if (seconds == null) return "---";
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
};

export function ScraperSummary({
    collections = [],
    scrapingDuration = null,
    processedCollectionsCount = null,
    activeWorkers = null,
}: ScraperSummaryProps) {
    const [stats, setStats] = useState<{ totalCollections: number; totalCards: number } | null>(null);

    useEffect(() => {
        if (!collections) return;

        const totalCollections = collections.length;
        const totalCards = collections.reduce((sum, c) => sum + (c.cardCount || 0), 0);

        setStats({
            totalCollections,
            totalCards,
        });
    }, [collections]);

    if (!stats) return null;

    return (
        <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} mb="xs">
            <Paper p="xs" radius="md" withBorder shadow="xs">
                <Group gap="xs">
                    <ThemeIcon size="lg" radius="md" variant="light" color="blue">
                        <IconFolder style={{ width: rem(20), height: rem(20) }} stroke={1.5} />
                    </ThemeIcon>
                    <div>
                        <Text c="dimmed" size="10px" tt="uppercase" fw={700}>
                            Collections
                        </Text>
                        <Text fw={700} size="sm">
                            {stats.totalCollections.toLocaleString()}
                        </Text>
                    </div>
                </Group>
            </Paper>

            <Paper p="xs" radius="md" withBorder shadow="xs">
                <Group gap="xs">
                    <ThemeIcon size="lg" radius="md" variant="light" color="teal">
                        <IconCards style={{ width: rem(20), height: rem(20) }} stroke={1.5} />
                    </ThemeIcon>
                    <div>
                        <Text c="dimmed" size="10px" tt="uppercase" fw={700}>
                            Cards
                        </Text>
                        <Text fw={700} size="sm">
                            {stats.totalCards.toLocaleString()}
                        </Text>
                    </div>
                </Group>
            </Paper>

            <Paper p="xs" radius="md" withBorder shadow="xs">
                <Group gap="xs">
                    <ThemeIcon size="lg" radius="md" variant="light" color="green">
                        <IconCheck style={{ width: rem(20), height: rem(20) }} stroke={1.5} />
                    </ThemeIcon>
                    <div>
                        <Text c="dimmed" size="10px" tt="uppercase" fw={700}>
                            Done
                        </Text>
                        <Text fw={700} size="sm">
                            {processedCollectionsCount !== null ? processedCollectionsCount.toLocaleString() : "0"}
                        </Text>
                    </div>
                </Group>
            </Paper>

            <Paper p="xs" radius="md" withBorder shadow="xs">
                <Group gap="xs">
                    <ThemeIcon size="lg" radius="md" variant="light" color="grape">
                        <IconUsers style={{ width: rem(20), height: rem(20) }} stroke={1.5} />
                    </ThemeIcon>
                    <div>
                        <Text c="dimmed" size="10px" tt="uppercase" fw={700}>
                            Workers
                        </Text>
                        <Text fw={700} size="sm">
                            {activeWorkers ?? 0}
                        </Text>
                    </div>
                </Group>
            </Paper>

            <Paper p="xs" radius="md" withBorder shadow="xs">
                <Group gap="xs">
                    <ThemeIcon size="lg" radius="md" variant="light" color="orange">
                        <IconClock style={{ width: rem(20), height: rem(20) }} stroke={1.5} />
                    </ThemeIcon>
                    <div>
                        <Text c="dimmed" size="10px" tt="uppercase" fw={700}>
                            Time
                        </Text>
                        <Text fw={700} size="sm">
                            {formatDuration(scrapingDuration)}
                        </Text>
                    </div>
                </Group>
            </Paper>
        </SimpleGrid>
    );
}
