"use client";

import { ScrollArea, SimpleGrid, Text, Box, Loader, Stack } from "@mantine/core";
import { APP_CONFIG } from "@/constants/app";
import { CardManagerSearchCard } from "./CardManagerSearchCard";

export interface SearchedCard {
    id: number;
    name: string;
    imageUrl: string;
    cardUrl: string;
    cardNo: string;
    rarity: string;
    collectionName: string;
    collectionCode: string;
}

interface CardManagerResultProps {
    results: SearchedCard[];
    loading: boolean;
    query: string;
    addingId: number | null;
    collectedCardIds: Set<number>;
    onAddToCollection: (card: SearchedCard) => void;
    onImageClick: (url: string) => void;
}

export function CardManagerResult({
    results,
    loading,
    query,
    addingId,
    collectedCardIds,
    onAddToCollection,
    onImageClick
}: CardManagerResultProps) {
    return (
        <ScrollArea flex={1} offsetScrollbars type="always">
            <SimpleGrid cols={{ base: 1, sm: 1, md: 2, lg: APP_CONFIG.SEARCH_RESULTS_PER_ROW }} spacing="xs">
                {results.map((card) => (
                    <CardManagerSearchCard
                        key={card.id}
                        card={card}
                        addingId={addingId}
                        collectedCardIds={collectedCardIds}
                        onAddToCollection={onAddToCollection}
                        onImageClick={onImageClick}
                    />
                ))}
            </SimpleGrid>

            {loading && results.length === 0 && (
                <Box py="xl" ta="center">
                    <Stack align="center" gap="xs">
                        <Loader size="sm" />
                        <Text c="dimmed" size="xs">Scanning and looking for cards...</Text>
                    </Stack>
                </Box>
            )}

            {results.length === 0 && !loading && (
                <Box py="xl" ta="center">
                    {query.length >= APP_CONFIG.SEARCH_MIN_CHARS ? (
                        <Text c="dimmed" size="xs">No cards found matching "{query}"</Text>
                    ) : (
                        <Text c="dimmed" size="xs">Waiting for next searching</Text>
                    )}
                </Box>
            )}
        </ScrollArea>
    );
}
