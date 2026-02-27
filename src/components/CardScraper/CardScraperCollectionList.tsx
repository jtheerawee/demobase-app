"use client";

import {
    ActionIcon,
    Badge,
    Card,
    Group,
    ScrollArea,
    Stack,
    Text,
    TextInput,
    Tooltip,
} from "@mantine/core";
import {
    IconCalendar,
    IconDatabaseImport,
    IconDownload,
    IconRefresh,
    IconSearch,
    IconSortAscendingNumbers,
    IconSortAZ,
    IconSortDescendingNumbers,
    IconSortZA,
    IconTrash,
    IconX,
} from "@tabler/icons-react";
import { useState } from "react";
import {
    CardScraperCollectionItem,
    type CollectionItem,
} from "./CardScraperCollectionItem";

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
        <Card withBorder radius="sm" padding="sm" shadow="sm">
            <Stack gap="md">
                <Group justify="space-between">
                    <Group gap="xs" align="center">
                        <Text fw={700}>Collections</Text>
                        <Badge variant="light" color="blue">
                            {totalCount} Cols
                        </Badge>
                    </Group>
                    <Group gap="xs">
                        <Tooltip label="Refresh from database" withArrow>
                            <ActionIcon
                                variant="light"
                                color="blue"
                                size="sm"
                                onClick={onRefresh}
                                loading={loading}
                            >
                                <IconRefresh size={16} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip
                            label="Fetch collections from source"
                            withArrow
                        >
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
                        <Tooltip label={`Delete all ${franchise ? franchise.toUpperCase() + " " : ""}${language ? language.toUpperCase() + " " : ""}collections`} withArrow>
                            <ActionIcon
                                variant="light"
                                color="red"
                                size="sm"
                                onClick={onDeleteAllCollections}
                                loading={loading}
                                disabled={totalCount === 0}
                            >
                                <IconTrash size={16} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip
                            label={`Sort by name (${sortBy === "name" ? (sortAsc ? "A→Z" : "Z→A") : "A→Z"})`}
                            withArrow
                        >
                            <ActionIcon
                                variant={sortBy === "name" ? "light" : "subtle"}
                                color={sortBy === "name" ? "blue" : "gray"}
                                size="sm"
                                onClick={() => handleSort("name")}
                                disabled={totalCount === 0}
                            >
                                {sortBy === "name" && !sortAsc ? (
                                    <IconSortZA size={14} />
                                ) : (
                                    <IconSortAZ size={14} />
                                )}
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip
                            label={`Sort by year (${sortBy === "year" ? (sortAsc ? "old→new" : "new→old") : "new→old"})`}
                            withArrow
                        >
                            <ActionIcon
                                variant={sortBy === "year" ? "light" : "subtle"}
                                color={sortBy === "year" ? "blue" : "gray"}
                                size="sm"
                                onClick={() => handleSort("year")}
                                disabled={totalCount === 0}
                            >
                                <IconCalendar size={14} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip
                            label={`Sort by cards (${sortBy === "cards" ? (sortAsc ? "low→high" : "high→low") : "high→low"})`}
                            withArrow
                        >
                            <ActionIcon
                                variant={
                                    sortBy === "cards" ? "light" : "subtle"
                                }
                                color={sortBy === "cards" ? "blue" : "gray"}
                                size="sm"
                                onClick={() => handleSort("cards")}
                                disabled={totalCount === 0}
                            >
                                {sortBy === "cards" && sortAsc ? (
                                    <IconSortAscendingNumbers size={14} />
                                ) : (
                                    <IconSortDescendingNumbers size={14} />
                                )}
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label={`Download cards for all ${franchise ? franchise.toUpperCase() + " " : ""}${language ? language.toUpperCase() + " " : ""}collections`} withArrow>
                            <ActionIcon
                                variant="light"
                                color="green"
                                size="sm"
                                onClick={onDownloadAllCards}
                                loading={loading}
                                disabled={totalCount === 0}
                            >
                                <IconDownload size={16} />
                            </ActionIcon>
                        </Tooltip>
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

                <ScrollArea h={480}>
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
