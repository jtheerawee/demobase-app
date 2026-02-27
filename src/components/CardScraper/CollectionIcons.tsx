"use client";

import { ActionIcon, Group, Tooltip } from "@mantine/core";
import {
    IconCalendar,
    IconDatabaseImport,
    IconDownload,
    IconRefresh,
    IconSortAscendingNumbers,
    IconSortAZ,
    IconSortDescendingNumbers,
    IconSortZA,
    IconTrash,
} from "@tabler/icons-react";

interface CollectionIconsProps {
    onRefresh?: () => void;
    onDownloadAllCollections?: () => void;
    onDeleteAllCollections?: () => void;
    onSortChange: (field: "name" | "cards" | "year") => void;
    onDownloadAllCards?: () => void;
    sortBy: "name" | "cards" | "year";
    sortAsc: boolean;
    loading?: boolean;
    totalCount: number;
    franchise?: string | null;
    language?: string | null;
}

export function CollectionIcons({
    onRefresh,
    onDownloadAllCollections,
    onDeleteAllCollections,
    onSortChange,
    onDownloadAllCards,
    sortBy,
    sortAsc,
    loading,
    totalCount,
    franchise,
    language,
}: CollectionIconsProps) {
    return (
        <Group gap="xs">
            <Tooltip label="Refresh from database" withArrow>
                <ActionIcon
                    variant="light"
                    color="blue"
                    size="sm"
                    onClick={() => onRefresh?.()}
                    loading={loading}
                >
                    <IconRefresh size={16} />
                </ActionIcon>
            </Tooltip>
            <Tooltip label="Fetch collections from source" withArrow>
                <ActionIcon
                    variant="light"
                    color="violet"
                    size="sm"
                    onClick={() => onDownloadAllCollections?.()}
                    loading={loading}
                >
                    <IconDatabaseImport size={16} />
                </ActionIcon>
            </Tooltip>
            <Tooltip
                label={`Delete all ${franchise ? franchise.toUpperCase() + " " : ""}${language ? language.toUpperCase() + " " : ""}collections`}
                withArrow
            >
                <ActionIcon
                    variant="light"
                    color="red"
                    size="sm"
                    onClick={() => onDeleteAllCollections?.()}
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
                    onClick={() => onSortChange("name")}
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
                    onClick={() => onSortChange("year")}
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
                    variant={sortBy === "cards" ? "light" : "subtle"}
                    color={sortBy === "cards" ? "blue" : "gray"}
                    size="sm"
                    onClick={() => onSortChange("cards")}
                    disabled={totalCount === 0}
                >
                    {sortBy === "cards" && sortAsc ? (
                        <IconSortAscendingNumbers size={14} />
                    ) : (
                        <IconSortDescendingNumbers size={14} />
                    )}
                </ActionIcon>
            </Tooltip>
            <Tooltip
                label={`Download cards for all ${franchise ? franchise.toUpperCase() + " " : ""}${language ? language.toUpperCase() + " " : ""}collections`}
                withArrow
            >
                <ActionIcon
                    variant="light"
                    color="green"
                    size="sm"
                    onClick={() => onDownloadAllCards?.()}
                    loading={loading}
                    disabled={totalCount === 0}
                >
                    <IconDownload size={16} />
                </ActionIcon>
            </Tooltip>
        </Group>
    );
}
