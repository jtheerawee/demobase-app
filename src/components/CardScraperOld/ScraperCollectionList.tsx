"use client";

import { Select } from "@mantine/core";
import type { ScrapedCollection } from "./types";

interface ScraperCollectionListProps {
    onSelect: (collectionId: string | null) => void;
    selectedCollectionId?: string | null;
    collections?: ScrapedCollection[];
}

export function ScraperCollectionList({
    onSelect,
    selectedCollectionId,
    collections = [],
}: ScraperCollectionListProps) {
    const selectData = collections
        .filter((c) => c.id != null)
        .map((c) => ({
            value: c.id!.toString(),
            label: `${c.name} (${c.cardCount || 0} cards)`,
        }));

    return (
        <Select
            placeholder="Filter by Collection"
            data={selectData}
            value={selectedCollectionId ? selectedCollectionId.toString() : null}
            onChange={(value) => onSelect(value)}
            searchable
            clearable
            nothingFoundMessage="No collections found"
            disabled={collections.length === 0}
            rightSection={null}
            style={{ flexGrow: 1, maxWidth: 300 }}
        />
    );
}
