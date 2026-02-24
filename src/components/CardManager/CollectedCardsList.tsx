"use client";

import { Card, Stack, Text, ScrollArea, Group, Image, Badge, ActionIcon, Box, Loader } from "@mantine/core";
import { IconTrash, IconPlus, IconMinus } from "@tabler/icons-react";
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";

export interface CollectedCard {
    id: number;
    cardId: number;
    name: string;
    imageUrl: string;
    cardNo: string;
    rarity: string;
    collectionName: string;
    quantity: number;
    variant?: string;
    condition?: string;
}

export const CollectedCardsList = forwardRef(({ onImageClick }: { onImageClick?: (url: string) => void }, ref) => {
    const [collectedCards, setCollectedCards] = useState<CollectedCard[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCollection = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/card-manager/collected");
            const data = await res.json();
            if (data.success) {
                setCollectedCards(data.cards);
            }
        } catch (err) {
            console.error("Failed to fetch collection:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            const res = await fetch(`/api/card-manager/collected?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchCollection();
        } catch (err) {
            console.error("Delete failed:", err);
        }
    };

    const handleUpdateQuantity = async (id: number, newQuantity: number) => {
        if (newQuantity < 1) return;

        // Optimistic update
        setCollectedCards(prev => prev.map(c => c.id === id ? { ...c, quantity: newQuantity } : c));

        try {
            const res = await fetch("/api/card-manager/collected", {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, quantity: newQuantity })
            });
            if (!res.ok) fetchCollection(); // Revert on failure
        } catch (err) {
            console.error("Update failed:", err);
            fetchCollection();
        }
    };

    useImperativeHandle(ref, () => ({
        refresh: fetchCollection
    }));

    useEffect(() => {
        fetchCollection();
    }, []);

    return (
        <Card withBorder radius="md" padding="md" shadow="sm" h="100%">
            <Stack gap="md" h="100%">
                <Group justify="space-between">
                    <Text fw={700} size="lg">My Collection</Text>
                    {loading ? <Loader size="xs" /> : <Badge color="grape" variant="filled">{collectedCards.length}</Badge>}
                </Group>

                <ScrollArea flex={1} offsetScrollbars>
                    {collectedCards.length === 0 && !loading ? (
                        <Box py="xl" style={{ textAlign: 'center' }}>
                            <Text c="dimmed" size="sm">Your collection is empty.</Text>
                            <Text c="dimmed" size="xs">Search cards and click "+" to add them.</Text>
                        </Box>
                    ) : (
                        <Stack gap="sm">
                            {collectedCards.map((card) => (
                                <Card key={card.id} withBorder padding={4} radius="xs" h={100}>
                                    <Group gap="xs" wrap="nowrap" h="100%">
                                        <Image
                                            src={card.imageUrl}
                                            w={60}
                                            h={90}
                                            radius="xs"
                                            style={{ objectFit: 'contain', cursor: 'pointer' }}
                                            onClick={() => onImageClick?.(card.imageUrl)}
                                        />
                                        <Stack gap={0} style={{ flex: 1, minWidth: 0, height: '100%' }}>
                                            <Text size="xs" fw={700} lineClamp={2}>{card.name}</Text>
                                            <Text size="10px" c="dimmed" lineClamp={1}>{card.collectionName}</Text>

                                            <Group gap={4} mt="auto" align="center" wrap="nowrap">
                                                <Group gap={2} wrap="nowrap" bg="gray.1" px={4} py={2} style={{ borderRadius: '4px' }}>
                                                    <ActionIcon
                                                        size="xs"
                                                        variant="subtle"
                                                        color="gray"
                                                        onClick={() => handleUpdateQuantity(card.id, card.quantity - 1)}
                                                        disabled={card.quantity <= 1}
                                                    >
                                                        <IconMinus size={10} />
                                                    </ActionIcon>
                                                    <Text size="10px" fw={700} w={14} ta="center">{card.quantity}</Text>
                                                    <ActionIcon
                                                        size="xs"
                                                        variant="subtle"
                                                        color="gray"
                                                        onClick={() => handleUpdateQuantity(card.id, card.quantity + 1)}
                                                    >
                                                        <IconPlus size={10} />
                                                    </ActionIcon>
                                                </Group>

                                                {card.variant && <Badge size="9px" h={18} px={6} variant="outline" color="orange">{card.variant}</Badge>}
                                                {card.condition && <Badge size="9px" h={18} px={6} variant="outline" color="gray">{card.condition}</Badge>}
                                            </Group>
                                        </Stack>
                                        <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDelete(card.id)}>
                                            <IconTrash size={14} />
                                        </ActionIcon>
                                    </Group>
                                </Card>
                            ))}
                        </Stack>
                    )}
                </ScrollArea>
            </Stack>
        </Card>
    );
});

CollectedCardsList.displayName = "CollectedCardsList";
