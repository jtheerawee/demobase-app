"use client";

import { Card, Group, ActionIcon, Stack, Text, Badge, ScrollArea } from "@mantine/core";
import { IconTrash, IconExternalLink, IconPackage } from "@tabler/icons-react";

interface CollectionItem {
    id: string | number;
    name: string;
    cardCount?: number;
    updatedAt?: string;
    franchise?: string;
}

interface CardScraperCollectionListProps {
    collections?: CollectionItem[];
    onSelect?: (id: string | number) => void;
    loading?: boolean;
}

export function CardScraperCollectionList({ collections = [], onSelect, loading }: CardScraperCollectionListProps) {
    const totalCount = collections.length;

    return (
        <Card withBorder radius="md" padding="md" shadow="sm">
            <Stack gap="md">
                <Group justify="space-between">
                    <Text fw={700}>Collections</Text>
                    <Badge variant="light" color="blue">
                        {totalCount} Total
                    </Badge>
                </Group>

                <ScrollArea h={400} offsetScrollbars>
                    <Stack gap="xs">
                        {collections.map((item) => (
                            <Card
                                key={item.id}
                                withBorder
                                padding="sm"
                                radius="sm"
                                style={{ cursor: onSelect ? 'pointer' : 'default' }}
                                onClick={() => onSelect?.(item.id)}
                            >
                                <Group justify="space-between" align="center" wrap="nowrap">
                                    <Stack gap={0} style={{ flex: 1 }}>
                                        <Text size="sm" fw={600} lineClamp={1}>
                                            {item.name}
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            {item.cardCount ?? 0} items {item.updatedAt ? `• ${item.updatedAt}` : ''}
                                        </Text>
                                    </Stack>
                                    <ActionIcon variant="subtle" color="red" size="sm" onClick={(e) => {
                                        e.stopPropagation();
                                        // TODO: handle delete
                                    }}>
                                        <IconTrash size={16} />
                                    </ActionIcon>
                                </Group>
                            </Card>
                        ))}
                        {totalCount === 0 && !loading && (
                            <Text size="sm" c="dimmed" ta="center" py="xl">
                                No collections found. Click "Download" to fetch.
                            </Text>
                        )}
                        {loading && (
                            <Text size="sm" c="dimmed" ta="center" py="xl">
                                Loading collections...
                            </Text>
                        )}
                    </Stack>
                </ScrollArea>
            </Stack>
        </Card>
    );
}
