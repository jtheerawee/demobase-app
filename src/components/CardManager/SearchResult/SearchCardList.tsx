"use client";

import { SimpleGrid } from "@mantine/core";
import { APP_CONFIG } from "@/constants/app";
import { SearchCard } from "./SearchCard";
import { SearchedCard } from "./SearchResult";

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
        <SimpleGrid
            cols={{
                base: 1,
                sm: 1,
                md: 2,
                lg: APP_CONFIG.SEARCH_RESULTS_PER_ROW,
            }}
            spacing="xs"
        >
            {results.map((card) => (
                <SearchCard
                    key={card.id}
                    card={card}
                    addingId={addingId}
                    collectedCardIds={collectedCardIds}
                    onAddToCollection={onAddToCollection}
                    onImageClick={onImageClick}
                />
            ))}
        </SimpleGrid>
    );
}
