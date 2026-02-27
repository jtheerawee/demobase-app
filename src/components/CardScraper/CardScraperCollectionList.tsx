"use client";

import {
    ActionIcon,
    Card,
    Group,
    ScrollArea,
    Stack,
    Text,
    TextInput,
} from "@mantine/core";
import {
    IconSearch,
    IconX,
} from "@tabler/icons-react";
import { useState } from "react";
import {
    CardScraperCollectionItem,
    type CollectionItem,
} from "./CardScraperCollectionItem";
import { CardScraperCount } from "./CardScraperCount";
import { CollectionIcons } from "./CollectionIcons";

interface CardScraperCollectionListProps {
    collections?: CollectionItem[];
    franchise?: string | null;
    language?: string | null;
    selectedId?: string | number | null;
    onSelect?: (id: string | number) => void;
    onDownloadAllCollections?: () => void;
    onDownloadAllCards?: () => void;
    onDeleteAllCollections?: () => void;
    onDeleteCollection?: (id: string | number) => void;
    onRefresh?: () => void;
    loading?: boolean;
}

export function CardScraperCollectionList({
    collections = [],
    franchise,
    language,
    selectedId,
    onSelect,
    onDownloadAllCollections,
    onDownloadAllCards,
    onDeleteAllCollections,
    onDeleteCollection,
    onRefresh,
    loading,
}: CardScraperCollectionListProps) {
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<"name" | "cards" | "year">("name");
    const [sortAsc, setSortAsc] = useState(true);
    const totalCount = collections.length;

    const handleSort = (field: "name" | "cards" | "year") => {
        if (sortBy === field) {
            setSortAsc((prev) => !prev);
        } else {
            setSortBy(field);
            // Default: name A-Z, cards high-low, year high-low (newest first)
            setSortAsc(field === "name");
        }
    };

    const filteredCollections = collections
        .filter((item) => {
            const query = search.toLowerCase();
            return (
                item.name.toLowerCase().includes(query) ||
                (item.collectionCode &&
                    item.collectionCode.toLowerCase().includes(query))
            );
        })
        .sort((a, b) => {
            if (sortBy === "name") {
                return sortAsc
                    ? a.name.localeCompare(b.name)
                    : b.name.localeCompare(a.name);
            } else if (sortBy === "cards") {
                const ca = a.cardCount ?? 0;
                const cb = b.cardCount ?? 0;
                return sortAsc ? ca - cb : cb - ca;
            } else {
                const ya = a.releaseYear ?? 0;
                const yb = b.releaseYear ?? 0;
                return sortAsc ? ya - yb : yb - ya;
            }
        });

    return (
        <Card withBorder radius="sm" padding="sm" shadow="sm" h="100%" style={{ display: "flex", flexDirection: "column" }}>
            <Stack gap="md" style={{ flex: 1, minHeight: 0 }}>
                <Group justify="space-between">
                    <CardScraperCount
                        label="Collections"
                        count={totalCount}
                        subLabel="Cols"
                        color="blue"
                    />
                </Group>
                <CollectionIcons
                    onRefresh={onRefresh}
                    onDownloadAllCollections={onDownloadAllCollections}
                    onDeleteAllCollections={onDeleteAllCollections}
                    onSortChange={handleSort}
                    onDownloadAllCards={onDownloadAllCards}
                    sortBy={sortBy}
                    sortAsc={sortAsc}
                    loading={loading}
                    totalCount={totalCount}
                    franchise={franchise}
                    language={language}
                />

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

                <ScrollArea style={{ flex: 1, minHeight: 0 }}>
                    <Stack gap="xs">
                        {filteredCollections.map((item) => (
                            <CardScraperCollectionItem
                                key={item.id}
                                item={item}
                                selected={selectedId === item.id}
                                onSelect={() => onSelect?.(item.id)}
                                onDelete={() => onDeleteCollection?.(item.id)}
                            />
                        ))}
                        {totalCount === 0 && !loading && (
                            <Text size="sm" c="dimmed" ta="center" py="xl">
                                No collections found. Click &quot;Download&quot;
                                to fetch.
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
