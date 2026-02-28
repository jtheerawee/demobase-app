"use client";

import { Badge, Group, Paper, Text, Tooltip, Stack } from "@mantine/core";
import { useMemo } from "react";
import { FRANCHISES } from "@/constants/franchises";

interface CardItem {
    id: string | number;
    name: string;
    rarity?: string;
    cardNo?: string;
}

interface ScrapedCardSummaryProps {
    cards: CardItem[];
    franchise?: string | null;
}

export function ScrapedCardSummary({ cards, franchise }: ScrapedCardSummaryProps) {
    const validRarities = useMemo(() => {
        if (!franchise) return new Set<string>();
        const config = FRANCHISES.find((f) => f.value === franchise)?.config;
        if (!config?.RARITY_MAP) return new Set<string>();

        const validParams = new Set<string>();
        Object.keys(config.RARITY_MAP).forEach(k => validParams.add(k.toLowerCase()));
        Object.values(config.RARITY_MAP).forEach(v => validParams.add(v.toLowerCase()));
        return validParams;
    }, [franchise]);

    const rarityGroups = useMemo(() => {
        const groups: Record<string, CardItem[]> = {};
        cards.forEach((card) => {
            const rarity = card.rarity || "Unknown";
            if (!groups[rarity]) groups[rarity] = [];
            groups[rarity].push(card);
        });

        // Sort by count descending
        return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
    }, [cards]);

    if (cards.length === 0) return null;

    return (
        <Paper withBorder p="xs" radius="sm" bg="var(--mantine-color-gray-0)">
            <Group gap="xs">
                {rarityGroups.map(([rarity, groupCards]) => {
                    const displayCards = groupCards.slice(0, 15);
                    const remaining = groupCards.length - 15;
                    const isUnknown = rarity === "Unknown";
                    const isMapped = isUnknown || validRarities.size === 0 || validRarities.has(rarity.toLowerCase());
                    const badgeColor = isUnknown ? "gray" : (isMapped ? "blue" : "red");

                    return (
                        <Tooltip
                            key={rarity}
                            position="bottom"
                            withArrow
                            multiline
                            label={
                                <Stack gap={2}>
                                    <Text size="xs" fw={700}>
                                        {rarity} Cards ({groupCards.length})
                                        {!isMapped && <Text span c="red"> (Not in Franchise config)</Text>}
                                    </Text>
                                    {displayCards.map((c, i) => (
                                        <Text key={i} size="xs" maw={250} truncate>
                                            {c.cardNo ? `#${c.cardNo} ` : ""}{c.name}
                                        </Text>
                                    ))}
                                    {remaining > 0 && <Text size="xs" c="dimmed">... {remaining} more</Text>}
                                </Stack>
                            }
                        >
                            <Badge
                                variant="dot"
                                color={badgeColor}
                                size="sm"
                                styles={{ label: { textTransform: "none" } }}
                                style={{ cursor: "help" }}
                            >
                                <Text component="span" fw={700} size="xs" mr={4}>
                                    {groupCards.length}
                                </Text>
                                {rarity}
                            </Badge>
                        </Tooltip>
                    );
                })}
            </Group>
        </Paper>
    );
}
