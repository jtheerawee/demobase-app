"use client";

import { ScrollArea, SimpleGrid, Text, Box, Loader, Stack, Card, ActionIcon } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { APP_CONFIG } from "@/constants/app";
import { CardManagerSearchCard } from "./CardManagerSearchCard";
import { CardManagerHeader } from "./CardManagerHeader";

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
    onReset: () => void;
    waitingForSelection: boolean;
}

export function CardManagerResult({
    results,
    loading,
    query,
    addingId,
    collectedCardIds,
    onAddToCollection,
    onImageClick,
    onReset,
    waitingForSelection,
}: CardManagerResultProps) {
    return (
        <Card withBorder padding="md" radius="md" shadow="sm" h="100%">
            <Stack gap="md" h="100%">
                <CardManagerHeader
                    title="Search Results"
                    count={results.length}
                    loading={loading}
                    actions={
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            title="Clear results and snapshot"
                            onClick={onReset}
                            disabled={
                                loading ||
                                (results.length === 0 &&
                                    query === "" &&
                                    !waitingForSelection)
                            }
                        >
                            <IconTrash size={16} />
                        </ActionIcon>
                    }
                />
                <Box style={{ flex: 1, minHeight: 0 }}>
                    <ScrollArea flex={1} offsetScrollbars type="always" h="100%">
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
                </Box>
            </Stack>
        </Card>
    );
}
