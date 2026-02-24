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
                    <Stack gap="lg">
                        {filteredGroups.map((group) => (
                            <Stack key={group.franchise} gap="xs">
                                <Text size="xs" fw={700} tt="uppercase" c="dimmed" lts={1}>
                                    {group.franchise.replace("-", " ")}
                                </Text>
                                <Stack gap="xs">
                                    {group.collections.map((item) => (
                                        <Card key={item.id} withBorder padding="sm" radius="sm">
                                            <Group justify="space-between" align="center">
                                                <Stack gap={0}>
                                                    <Text size="sm" fw={600}>
                                                        {item.name}
                                                    </Text>
                                                    <Text size="xs" c="dimmed">
                                                        {item.count} items • {item.updatedAt}
                                                    </Text>
                                                </Stack>
                                                <Group gap={4}>
                                                    <ActionIcon variant="subtle" color="blue" size="sm">
                                                        <IconExternalLink size={14} />
                                                    </ActionIcon>
                                                    <ActionIcon variant="subtle" color="red" size="sm">
                                                        <IconTrash size={14} />
                                                    </ActionIcon>
                                                </Group>
                                            </Group>
                                        </Card>
                                    ))}
                                </Stack>
                            </Stack>
                        ))}
                        {filteredGroups.length === 0 && (
                            <Text size="sm" c="dimmed" ta="center" py="xl">
                                No collections found for this franchise
                            </Text>
                        )}
                    </Stack>
                </ScrollArea>
            </Stack>
        </Card>
    );
}
