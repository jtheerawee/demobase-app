"use client";

import { ScrollArea, Box, Text, Stack, Divider } from "@mantine/core";
import { CollectedCard } from "./CollectedCard";

interface CollectedCardListProps {
    cards: CollectedCard[];
    loading: boolean;
    onImageClick?: (url: string) => void;
    onUpdateQuantity: (id: number, newQuantity: number) => void;
    onUpdateCondition: (id: number, newCondition: string) => void;
    onUpdateVariant: (id: number, newVariant: string) => void;
    onDelete: (id: number) => void;
    onAddEntry: (card: CollectedCard) => void;
}

export function CollectedCardList({
    cards,
    loading,
    onImageClick,
    onUpdateQuantity,
    onUpdateCondition,
    onUpdateVariant,
    onDelete,
    onAddEntry,
}: CollectedCardListProps) {
    return (
        <ScrollArea flex={1}>
            {cards.length === 0 && !loading ? (
                <Box py="xl" style={{ textAlign: "center" }}>
                    <Text c="dimmed" size="sm">
                        Your collection is empty.
                    </Text>
                    <Text c="dimmed" size="xs">
                        Search cards and click "+" to add them.
                    </Text>
                </Box>
            ) : (
                <Stack gap={0}>
                    {cards.map((card, index) => (
                        <Box key={card.id}>
                            <CollectedCard
                                card={card}
                                onImageClick={onImageClick}
                                onUpdateQuantity={onUpdateQuantity}
                                onUpdateCondition={onUpdateCondition}
                                onUpdateVariant={onUpdateVariant}
                                onDelete={onDelete}
                                onAddEntry={onAddEntry}
                            />
                            {index < cards.length - 1 && <Divider />}
                        </Box>
                    ))}
                </Stack>
            )}
        </ScrollArea>
    );
}
