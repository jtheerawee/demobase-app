"use client";

import { Card, Group, ActionIcon, Stack, Text, Badge, ScrollArea, TextInput } from "@mantine/core";
import { IconTrash, IconExternalLink, IconPackage, IconDownload, IconSearch } from "@tabler/icons-react";
import { useState } from "react";

interface CollectionItem {
    id: string | number;
    name: string;
    cardCount?: number;
    updatedAt?: string;
    franchise?: string;
    collectionCode?: string;
    collectionUrl?: string;
}

interface CardScraperCollectionListProps {
    collections?: CollectionItem[];
    onSelect?: (id: string | number) => void;
    onDownloadItem?: (item: CollectionItem) => void;
    onDownloadAll?: () => void;
    onDeleteAll?: () => void;
    loading?: boolean;
}

export function CardScraperCollectionList({
    collections = [],
    onSelect,
    onDownloadItem,
    onDownloadAll,
    onDeleteAll,
    loading
}: CardScraperCollectionListProps) {
    const [search, setSearch] = useState("");
    const totalCount = collections.length;

    const filteredCollections = collections.filter(item => {
        const query = search.toLowerCase();
        return (
            item.name.toLowerCase().includes(query) ||
            (item.collectionCode && item.collectionCode.toLowerCase().includes(query))
        );
    });

    return (
        <Card withBorder radius="md" padding="md" shadow="sm">
            <Stack gap="md">
                <Group justify="space-between">
                    <Text fw={700}>Collections</Text>
                    <Group gap="xs">
                        {totalCount > 0 && (
                            <>
                                <ActionIcon
                                    variant="light"
                                    color="green"
                                    size="sm"
                                    onClick={onDownloadAll}
                                    title="Download cards for all collections"
                                    loading={loading}
                                >
                                    <IconDownload size={16} />
                                </ActionIcon>
                                <ActionIcon
                                    variant="light"
                                    color="red"
                                    size="sm"
                                    onClick={onDeleteAll}
                                    title="Delete all collections"
                                    loading={loading}
                                >
                                    <IconTrash size={16} />
                                </ActionIcon>
                            </>
                        )}
                        <Badge variant="light" color="blue">
                            {totalCount} Total
                        </Badge>
                    </Group>
                </Group>

                <TextInput
                    placeholder="Search by name or code..."
                    leftSection={<IconSearch size={14} />}
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    size="xs"
                    radius="md"
                />

                <ScrollArea h={400} offsetScrollbars>
                    <Stack gap="xs">
                        {filteredCollections.map((item) => (
                            <Card
                                key={item.id}
                                withBorder
                                padding="sm"
                                radius="sm"
                                style={{ cursor: 'pointer' }}
                                onClick={() => onSelect?.(item.id)}
                            >
                                <Group justify="space-between" align="center" wrap="nowrap">
                                    <Stack gap={0} style={{ flex: 1 }}>
                                        <Group gap={6}>
                                            <Text size="sm" fw={600} lineClamp={1}>
                                                {item.name}
                                            </Text>
                                            {item.collectionCode && (
                                                <Badge size="xs" variant="outline" color="gray">
                                                    {item.collectionCode}
                                                </Badge>
                                            )}
                                        </Group>
                                        <Text size="xs" c="dimmed">
                                            {item.cardCount ?? 0} items {item.updatedAt ? `• ${item.updatedAt}` : ''}
                                        </Text>
                                    </Stack>
                                    <Group gap={4}>
                                        {onDownloadItem && (
                                            <ActionIcon
                                                variant="subtle"
                                                color="green"
                                                size="sm"
                                                title="Download cards for this collection"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDownloadItem(item);
                                                }}
                                            >
                                                <IconDownload size={16} />
                                            </ActionIcon>
                                        )}
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
                                        <ActionIcon variant="subtle" color="red" size="sm" onClick={(e) => {
                                            e.stopPropagation();
                                            // TODO: handle delete
                                        }}>
                                            <IconTrash size={16} />
                                        </ActionIcon>
                                    </Group>
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
