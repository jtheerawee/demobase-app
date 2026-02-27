"use client";

import {
    Badge,
    Card,
    Group,
    SimpleGrid,
    Stack,
    Text,
    Tooltip,
} from "@mantine/core";

export interface ScraperStats {
    collections: {
        added: number;
        matched: number;
        missed: number;
        discarded: number;
        discardedItems?: any[];
    };
    cards: {
        added: number;
        matched: number;
        missed: number;
        discarded: number;
        discardedItems?: any[];
    };
}

interface StatWidgetProps {
    label: string;
    color: string;
    collections: number;
    cards: number;
    tooltipContent?: React.ReactNode;
    badgeTooltip?: string;
}

function StatWidget({
    label,
    color,
    collections,
    cards,
    tooltipContent,
    badgeTooltip,
}: StatWidgetProps) {
    const card = (
        <Card withBorder radius="sm" padding="sm">
            <Stack gap={4}>
                {badgeTooltip ? (
                    <Tooltip label={badgeTooltip} withArrow position="top" multiline w={220}>
                        <div style={{ width: "max-content" }}>
                            <Badge variant="light" color={color} size="xs" radius="sm">
                                {label}
                            </Badge>
                        </div>
                    </Tooltip>
                ) : (
                    <Badge variant="light" color={color} size="xs" radius="sm">
                        {label}
                    </Badge>
                )}
                <Group justify="space-between" align="baseline">
                    <Text size="xs" c="dimmed">
                        Collections
                    </Text>
                    <Text size="sm" fw={700}>
                        {collections}
                    </Text>
                </Group>
                <Group justify="space-between" align="baseline">
                    <Text size="xs" c="dimmed">
                        Cards
                    </Text>
                    <Text size="sm" fw={700}>
                        {cards}
                    </Text>
                </Group>
            </Stack>
        </Card>
    );

    if (tooltipContent) {
        return (
            <Tooltip
                label={tooltipContent}
                position="bottom"
                withArrow
                multiline
                w={300}
            >
                <div>{card}</div>
            </Tooltip>
        );
    }

    return card;
}

interface CardScraperStatsProps {
    stats: ScraperStats;
}

export function CardScraperStats({ stats }: CardScraperStatsProps) {
    const discardedCards = stats.cards.discardedItems ?? [];
    const discardedTooltip =
        discardedCards.length > 0 ? (
            <Stack gap={4}>
                <Text size="xs" fw={700}>
                    Last {Math.min(10, discardedCards.length)} Discarded Cards:
                </Text>
                {discardedCards.slice(-10).map((c, i) => (
                    <Text key={i} size="xs">
                        #{c.cardNo} {c.name}
                    </Text>
                ))}
                {discardedCards.length > 10 && (
                    <Text size="xs" c="dimmed">
                        ... and {discardedCards.length - 10} more
                    </Text>
                )}
            </Stack>
        ) : null;

    return (
        <SimpleGrid cols={2} spacing="xs">
            <StatWidget
                label="Added"
                color="green"
                collections={stats.collections.added}
                cards={stats.cards.added}
                badgeTooltip="New items successfully scraped and saved to the database"
            />
            <StatWidget
                label="Matched"
                color="blue"
                collections={stats.collections.matched}
                cards={stats.cards.matched}
                badgeTooltip="Items that already exist in the database (skipped to prevent duplicates)"
            />
            <StatWidget
                label="Missed"
                color="orange"
                collections={stats.collections.missed}
                cards={stats.cards.missed}
                badgeTooltip="Items that failed during scraping or were missed due to errors"
            />
            <StatWidget
                label="Discarded"
                color="red"
                collections={stats.collections.discarded}
                cards={stats.cards.discarded}
                badgeTooltip="Items explicitly skipped based on rules or limits"
                tooltipContent={discardedTooltip}
            />
        </SimpleGrid>
    );
}
