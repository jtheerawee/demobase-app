"use client";

import { Card, Group, ActionIcon, Stack, Text, Badge, ScrollArea, TextInput, Tooltip } from "@mantine/core";
import { IconDownload, IconTrash, IconSearch, IconX, IconSortAZ, IconSortZA, IconSortDescendingNumbers, IconSortAscendingNumbers, IconDatabaseImport } from "@tabler/icons-react";
import { useState } from "react";
import { CardScraperCollectionItem, type CollectionItem } from "./CardScraperCollectionItem";

interface CardScraperCollectionListProps {
    collections?: CollectionItem[];
    selectedId?: string | number | null;
    onSelect?: (id: string | number) => void;
    onDownloadAllCollections?: () => void;
    onDownloadAllCards?: () => void;
    onDeleteAllCollections?: () => void;
    loading?: boolean;
}

export function CardScraperCollectionList({
    collections = [],
    selectedId,
    onSelect,
    onDownloadAllCollections,
    onDownloadAllCards,
    onDeleteAllCollections,
    loading
}: CardScraperCollectionListProps) {
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<"name" | "cards">("name");
    const [sortAsc, setSortAsc] = useState(true);
    const totalCount = collections.length;

    const handleSort = (field: "name" | "cards") => {
        if (sortBy === field) {
            setSortAsc((prev) => !prev);
        } else {
            setSortBy(field);
            setSortAsc(field === "name"); // name: asc by default, cards: desc by default
        }
    };

    const filteredCollections = collections
        .filter(item => {
            const query = search.toLowerCase();
            return (
                item.name.toLowerCase().includes(query) ||
                (item.collectionCode && item.collectionCode.toLowerCase().includes(query))
            );
        })
        .sort((a, b) => {
            if (sortBy === "name") {
                return sortAsc
                    ? a.name.localeCompare(b.name)
                    : b.name.localeCompare(a.name);
            } else {
                const ca = a.cardCount ?? 0;
                const cb = b.cardCount ?? 0;
                return sortAsc ? ca - cb : cb - ca;
            }
        });

    return (
        <Card withBorder radius="md" padding="md" shadow="sm">
            <Stack gap="md">
                <Group justify="space-between">
                    <Text fw={700}>Collections</Text>
                    <Group gap="xs">
                        <Tooltip label="Fetch collections from source" withArrow>
                            <ActionIcon
                                variant="light"
                                color="violet"
                                size="sm"
                                onClick={onDownloadAllCollections}
                                loading={loading}
                            >
                                <IconDatabaseImport size={16} />
                            </ActionIcon>
                        </Tooltip>
                        <ActionIcon
                            variant="light"
                            color="red"
                            size="sm"
                            onClick={onDeleteAllCollections}
                            title="Delete all collections"
                            loading={loading}
                            disabled={totalCount === 0}
                        >
                            <IconTrash size={16} />
                        </ActionIcon>
                        <Tooltip label={`Sort by name (${sortBy === "name" ? (sortAsc ? "A→Z" : "Z→A") : "A→Z"})`} withArrow>
                            <ActionIcon
                                variant={sortBy === "name" ? "light" : "subtle"}
                                color={sortBy === "name" ? "blue" : "gray"}
                                size="sm"
                                onClick={() => handleSort("name")}
                                disabled={totalCount === 0}
                            >
                                {sortBy === "name" && !sortAsc ? <IconSortZA size={14} /> : <IconSortAZ size={14} />}
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label={`Sort by cards (${sortBy === "cards" ? (sortAsc ? "low→high" : "high→low") : "high→low"})`} withArrow>
                            <ActionIcon
                                variant={sortBy === "cards" ? "light" : "subtle"}
                                color={sortBy === "cards" ? "blue" : "gray"}
                                size="sm"
                                onClick={() => handleSort("cards")}
                                disabled={totalCount === 0}
                            >
                                {sortBy === "cards" && sortAsc ? <IconSortAscendingNumbers size={14} /> : <IconSortDescendingNumbers size={14} />}
                            </ActionIcon>
                        </Tooltip>
                        <ActionIcon
                            variant="light"
                            color="green"
                            size="sm"
                            onClick={onDownloadAllCards}
                            title="Download cards for all collections"
                            loading={loading}
                            disabled={totalCount === 0}
                        >
                            <IconDownload size={16} />
                        </ActionIcon>
                        <Badge variant="light" color="blue">
                            {totalCount} Total
                        </Badge>
                    </Group>
                </Group>

                <TextInput
                    placeholder="Search by name or code..."
                    leftSection={<IconSearch size={14} />}
                    rightSection={
                        search ? (
                            <ActionIcon
                                size="xs"
                                color="gray"
                                variant="subtle"
                                onClick={() => setSearch("")}
                            >
                                <IconX size={12} />
                            </ActionIcon>
                        ) : null
                    }
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    size="xs"
                    radius="md"
                />

                <ScrollArea h={600} offsetScrollbars>
                    <Stack gap="xs">
                        {filteredCollections.map((item) => (
                            <CardScraperCollectionItem
                                key={item.id}
                                item={item}
                                selected={selectedId === item.id}
                                onSelect={() => onSelect?.(item.id)}
                                onDelete={() => { /* TODO: handle per-item delete */ }}
                            />
                        ))}
                        {totalCount === 0 && !loading && (
                            <Text size="sm" c="dimmed" ta="center" py="xl">
                                No collections found. Click &quot;Download&quot; to fetch.
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
