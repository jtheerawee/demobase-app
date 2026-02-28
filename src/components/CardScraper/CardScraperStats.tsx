"use client";

import { ActionIcon, Badge, Card, Group, SimpleGrid, Stack, Text, Tooltip } from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useState } from "react";
import { StatsModal } from "@/components/CardScraper/StatsModal";

export type StatCategory = "added" | "matched" | "missed" | "discarded";

export type CategoryStats = Partial<Record<StatCategory, number>> & {
    [K in StatCategory as `${K}Items`]?: any[];
};

export interface ScraperStats {
    collections: CategoryStats;
    cards: CategoryStats;
}

interface StatWidgetProps {
    label: string;
    color: string;
    collections: number;
    cards: number;
    collectionItems?: any[];
    cardItems?: any[];
    badgeTooltip?: string;
    onCopy?: () => void;
}

function StatWidget({
    label,
    color,
    collections,
    cards,
    collectionItems,
    cardItems,
    badgeTooltip,
    onCopy,
}: StatWidgetProps) {
    const [copied, setCopied] = useState(false);
    const [modalContent, setModalContent] = useState<{
        title: string;
        items: any[];
    } | null>(null);

    const handleCopy = () => {
        onCopy?.();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            <StatsModal
                opened={!!modalContent}
                onClose={() => setModalContent(null)}
                title={modalContent?.title}
                items={modalContent?.items}
            />

            <Card withBorder radius="sm" padding="sm" style={{ position: "relative" }}>
                <Stack gap={4}>
                    <Group justify="space-between" align="center">
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
                        {onCopy && (
                            <Tooltip
                                label={
                                    collections === 0 && cards === 0
                                        ? "No items to copy"
                                        : `Copy ${label.toLowerCase()} items for investigation`
                                }
                                withArrow
                            >
                                <ActionIcon
                                    variant="subtle"
                                    color="gray"
                                    size="xs"
                                    disabled={collections === 0 && cards === 0}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopy();
                                    }}
                                >
                                    {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                                </ActionIcon>
                            </Tooltip>
                        )}
                    </Group>
                    <Group justify="space-between" align="baseline">
                        <Text size="xs" c="dimmed">
                            Collections
                        </Text>
                        {collections > 0 && collectionItems && collectionItems.length > 0 ? (
                            <Text
                                size="sm"
                                fw={700}
                                style={{
                                    cursor: "pointer",
                                    borderBottom: `1px dashed var(--mantine-color-${color}-6)`,
                                    color: `var(--mantine-color-${color}-6)`,
                                }}
                                onClick={() =>
                                    setModalContent({
                                        title: `${label} Collections`,
                                        items: collectionItems,
                                    })
                                }
                            >
                                {collections}
                            </Text>
                        ) : (
                            <Text size="sm" fw={700}>
                                {collections}
                            </Text>
                        )}
                    </Group>
                    <Group justify="space-between" align="baseline">
                        <Text size="xs" c="dimmed">
                            Cards
                        </Text>
                        {cards > 0 && cardItems && cardItems.length > 0 ? (
                            <Text
                                size="sm"
                                fw={700}
                                style={{
                                    cursor: "pointer",
                                    borderBottom: `1px dashed var(--mantine-color-${color}-6)`,
                                    color: `var(--mantine-color-${color}-6)`,
                                }}
                                onClick={() =>
                                    setModalContent({
                                        title: `${label} Cards`,
                                        items: cardItems,
                                    })
                                }
                            >
                                {cards}
                            </Text>
                        ) : (
                            <Text size="sm" fw={700}>
                                {cards}
                            </Text>
                        )}
                    </Group>
                </Stack>
            </Card>
        </>
    );
}

interface CardScraperStatsProps {
    stats: ScraperStats;
}

export function CardScraperStats({ stats }: CardScraperStatsProps) {
    const handleCopyItems = (category: StatCategory) => {
        const itemKey = `${category}Items` as keyof CategoryStats;
        const data = {
            collections: stats.collections[itemKey] ?? [],
            cards: stats.cards[itemKey] ?? [],
        };
        navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    };

    const renderStat = (label: string, category: StatCategory, color: string, badgeTooltip: string) => {
        const itemKey = `${category}Items` as keyof CategoryStats;
        const itemCount = ((stats.cards[itemKey] as any[])?.length ?? 0) || (stats.cards[category] ?? 0);
        const colCount = ((stats.collections[itemKey] as any[])?.length ?? 0) || (stats.collections[category] ?? 0);

        return (
            <StatWidget
                label={label}
                color={color}
                collections={colCount}
                cards={itemCount}
                badgeTooltip={badgeTooltip}
                collectionItems={stats.collections[itemKey] as any[]}
                cardItems={stats.cards[itemKey] as any[]}
                onCopy={() => handleCopyItems(category)}
            />
        );
    };

    return (
        <SimpleGrid cols={2} spacing="xs">
            {renderStat("Added", "added", "green", "New items successfully scraped and saved to the database")}
            {renderStat(
                "Matched",
                "matched",
                "blue",
                "Items that already exist in the database (skipped to prevent duplicates)",
            )}
            {renderStat("Missed", "missed", "orange", "Items that failed during scraping or were missed due to errors")}
            {renderStat("Discarded", "discarded", "red", "Items explicitly skipped based on rules or limits")}
        </SimpleGrid>
    );
}
