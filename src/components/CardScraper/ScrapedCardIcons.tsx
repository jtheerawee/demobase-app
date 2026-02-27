"use client";

import { ActionIcon, Group, Tooltip } from "@mantine/core";
import {
    IconDownload,
    IconFilter,
    IconFilterOff,
    IconRefresh,
    IconTrash,
} from "@tabler/icons-react";

interface ScrapedCardIconsProps {
    onDownloadCards?: () => void;
    onDownloadAllImages?: () => void;
    onRefresh?: () => void;
    onDeleteAllCards?: () => void;
    filterInvalid: boolean;
    onFilterInvalidToggle: () => void;
    loading?: boolean;
    bulkDownloading?: boolean;
    downloadProgress: { current: number; total: number };
    canDownload?: boolean;
    cardsCount: number;
    invalidCount: number;
}

export function ScrapedCardIcons({
    onDownloadCards,
    onDownloadAllImages,
    onRefresh,
    onDeleteAllCards,
    filterInvalid,
    onFilterInvalidToggle,
    loading,
    bulkDownloading,
    downloadProgress,
    canDownload,
    cardsCount,
    invalidCount,
}: ScrapedCardIconsProps) {
    return (
        <Group gap="xs">
            <Tooltip label="Scrape cards for this collection" withArrow>
                <ActionIcon
                    variant="light"
                    color="green"
                    size="sm"
                    onClick={() => onDownloadCards?.()}
                    loading={loading}
                    disabled={!canDownload}
                >
                    <IconDownload size={14} />
                </ActionIcon>
            </Tooltip>
            <Tooltip
                label={
                    bulkDownloading
                        ? `Downloading ${downloadProgress.current}/${downloadProgress.total}...`
                        : "Download all images as zip"
                }
                withArrow
            >
                <ActionIcon
                    variant="filled"
                    color="green"
                    size="sm"
                    onClick={() => onDownloadAllImages?.()}
                    loading={bulkDownloading}
                    disabled={cardsCount === 0}
                >
                    <IconDownload size={14} />
                </ActionIcon>
            </Tooltip>
            <Tooltip label="Refresh from database" withArrow>
                <ActionIcon
                    variant="light"
                    color="blue"
                    size="sm"
                    onClick={() => onRefresh?.()}
                    loading={loading}
                    disabled={!canDownload}
                >
                    <IconRefresh size={14} />
                </ActionIcon>
            </Tooltip>
            <Tooltip
                label={
                    filterInvalid
                        ? "Show all cards"
                        : "Filter invalid cards (no rarity)"
                }
                withArrow
            >
                <ActionIcon
                    variant={filterInvalid ? "filled" : "light"}
                    color={filterInvalid ? "orange" : "gray"}
                    size="sm"
                    onClick={onFilterInvalidToggle}
                    disabled={invalidCount === 0 && !filterInvalid}
                >
                    {filterInvalid ? (
                        <IconFilterOff size={14} />
                    ) : (
                        <IconFilter size={14} />
                    )}
                </ActionIcon>
            </Tooltip>
            <Tooltip label="Delete all cards in this collection" withArrow>
                <ActionIcon
                    variant="light"
                    color="red"
                    size="sm"
                    onClick={() => onDeleteAllCards?.()}
                    disabled={cardsCount === 0}
                >
                    <IconTrash size={14} />
                </ActionIcon>
            </Tooltip>
        </Group>
    );
}
