"use client";

import { Card, Group, ActionIcon, Stack, Text, Badge, ScrollArea } from "@mantine/core";
import { IconTrash, IconExternalLink, IconPackage } from "@tabler/icons-react";

interface CollectionItem {
    id: string;
    name: string;
    count: number;
    updatedAt: string;
}

interface FranchiseGroup {
    franchise: string;
    collections: CollectionItem[];
}

const MOCK_GROUPS: FranchiseGroup[] = [
    {
        franchise: "pokemon",
        collections: [
            { id: "p1", name: "Scarlet & Violet", count: 156, updatedAt: "2024-02-23" },
            { id: "p2", name: "Crown Zenith", count: 89, updatedAt: "2024-02-22" },
        ],
    },
    {
        franchise: "mtg",
        collections: [
            { id: "m1", name: "Modern Horizons 3", count: 42, updatedAt: "2024-02-20" },
        ],
    },
    {
        franchise: "one-piece",
        collections: [
            { id: "o1", name: "Romance Dawn", count: 120, updatedAt: "2024-02-18" },
        ],
    },
    {
        franchise: "lorcana",
        collections: [
            { id: "l1", name: "The First Chapter", count: 12, updatedAt: "2024-02-19" },
        ],
    },
];

interface CardScraperCollectionListProps {
    selectedFranchise?: string | null;
}

export function CardScraperCollectionList({ selectedFranchise }: CardScraperCollectionListProps) {
    const filteredGroups = selectedFranchise
        ? MOCK_GROUPS.filter(g => g.franchise === selectedFranchise)
        : MOCK_GROUPS;

    const totalCount = filteredGroups.reduce((acc, group) => acc + group.collections.length, 0);

    return (
        <Card withBorder radius="md" padding="md" shadow="sm">
            <Stack gap="md">
                <Group justify="space-between">
                    <Badge variant="light" color="blue">
                        {totalCount} Total
                    </Badge>
                </Group>

                <ScrollArea h={400} offsetScrollbars>
                    <Stack gap="xs">
                        {filteredGroups.flatMap(group => group.collections).map((item) => (
                            <Card key={item.id} withBorder padding="sm" radius="sm">
                                <Group justify="space-between" align="center" wrap="nowrap">
                                    <Stack gap={0} style={{ flex: 1 }}>
                                        <Text size="sm" fw={600} lineClamp={1}>
                                            {item.name}
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            {item.count} items • {item.updatedAt}
                                        </Text>
                                    </Stack>
                                    <ActionIcon variant="subtle" color="red" size="sm">
                                        <IconTrash size={16} />
                                    </ActionIcon>
                                </Group>
                            </Card>
                        ))}
                        {totalCount === 0 && (
                            <Text size="sm" c="dimmed" ta="center" py="xl">
                                No collections found
                            </Text>
                        )}
                    </Stack>
                </ScrollArea>
            </Stack>
        </Card>
    );
}
