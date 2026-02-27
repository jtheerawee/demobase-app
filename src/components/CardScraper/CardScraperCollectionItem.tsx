"use client";

import { Card, Group, Stack, Text, Badge, ActionIcon } from "@mantine/core";
import { IconExternalLink, IconTrash } from "@tabler/icons-react";
import { APP_CONFIG } from "@/constants/app";

export interface CollectionItem {
    id: string | number;
    name: string;
    cardCount?: number;
    updatedAt?: string;
    franchise?: string;
    collectionCode?: string;
    collectionUrl?: string;
    releaseYear?: number;
}

interface CardScraperCollectionItemProps {
    item: CollectionItem;
    selected?: boolean;
    onSelect?: () => void;
    onDelete?: () => void;
}

export function CardScraperCollectionItem({
    item,
    selected,
    onSelect,
    onDelete,
}: CardScraperCollectionItemProps) {
    const mappedCode = (() => {
        if (item.franchise === "pokemon" && item.collectionCode) {
            const map = APP_CONFIG.POKEMON_SET_MAP as Record<string, string>;
            const code = item.collectionCode.toLowerCase();
            // Try to find the key by value (case-insensitive)
            const keyByValue = Object.keys(map).find(
                (key) => map[key].toLowerCase() === code
            );
            return keyByValue ?? item.collectionCode;
        }
        return item.collectionCode;
    })();

    return (
        <Card
            withBorder
            padding="sm"
            radius="sm"
            style={{
                cursor: "pointer",
                borderColor: selected
                    ? "var(--mantine-color-blue-filled)"
                    : undefined,
                backgroundColor: selected
                    ? "var(--mantine-color-blue-light)"
                    : undefined,
            }}
            onClick={onSelect}
        >
            <Group justify="space-between" align="center" wrap="nowrap">
                <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                    <Group gap={6}>
                        <Text size="sm" fw={600} lineClamp={1}>
                            {item.name}
                        </Text>
                        {item.collectionCode && (
                            <Badge
                                size="xs"
                                variant="outline"
                                color="gray"
                                style={{ flexShrink: 0 }}
                            >
                                {item.collectionCode}
                                {mappedCode && mappedCode !== item.collectionCode && ` (${mappedCode})`}
                            </Badge>
                        )}
                        {item.releaseYear && (
                            <Badge
                                size="xs"
                                variant="light"
                                color="orange"
                                style={{ flexShrink: 0 }}
                            >
                                {item.releaseYear}
                            </Badge>
                        )}
                    </Group>
                    <Text size="xs" c="dimmed">
                        {item.cardCount ?? 0} cards
                        {item.updatedAt ? ` • ${item.updatedAt}` : ""}
                    </Text>
                </Stack>

                <Group gap={4}>
                    {item.collectionUrl && (
                        <ActionIcon
                            variant="subtle"
                            color="blue"
                            size="sm"
                            component="a"
                            href={item.collectionUrl}
                            target="_blank"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <IconExternalLink size={16} />
                        </ActionIcon>
                    )}
                    <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.();
                        }}
                    >
                        <IconTrash size={16} />
                    </ActionIcon>
                </Group>
            </Group>
        </Card>
    );
}
