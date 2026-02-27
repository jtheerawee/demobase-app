"use client";

import { Box, Divider, Stack } from "@mantine/core";
import { APP_CONFIG } from "@/constants/app";
import { SearchCard } from "./SearchCard";
import type { SearchedCard } from "./SearchResultWidget";

interface SearchCardListProps {
    results: SearchedCard[];
    addingId: number | null;
    collectedCardIds: Set<number>;
    onAddToCollection: (card: SearchedCard) => void;
    onImageClick: (url: string) => void;
}

export function SearchCardList({
    results,
    addingId,
    collectedCardIds,
    onAddToCollection,
    onImageClick,
}: SearchCardListProps) {
    if (results.length === 0) return null;

    return (
        <Stack gap={0}>
            {results.map((card, index) => (
                <Box key={card.id}>
                    <SearchCard
                        card={card}
                        addingId={addingId}
                        collectedCardIds={collectedCardIds}
                        onAddToCollection={onAddToCollection}
                        onImageClick={onImageClick}
                    />
                    {index < results.length - 1 && <Divider />}
                </Box>
            ))}
        </Stack>
    );
}
