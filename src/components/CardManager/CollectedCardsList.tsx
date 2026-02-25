"use client";

import { Card, Stack, Text, ScrollArea, Group, Image, Badge, ActionIcon, Box, Loader, Menu } from "@mantine/core";
import { IconTrash, IconPlus, IconMinus, IconDownload } from "@tabler/icons-react";
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";

const CONDITIONS = [
    { value: "NM", label: "Near Mint" },
    { value: "LP", label: "Lightly Played" },
    { value: "MP", label: "Moderately Played" },
    { value: "HP", label: "Heavily Played" },
    { value: "DMG", label: "Damaged" },
];
const VARIANTS = ["NF", "F"];

export interface CollectedCard {
    id: number;
    cardId: number;
    collectionId?: number;
    name: string;
    imageUrl: string;
    cardNo: string;
    rarity: string;
    collectionName: string;
    franchise?: string;
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

    const handleUpdateCondition = async (id: number, newCondition: string) => {
        // Optimistic update
        setCollectedCards(prev => prev.map(c => c.id === id ? { ...c, condition: newCondition } : c));

        try {
            const res = await fetch("/api/card-manager/collected", {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, condition: newCondition })
            });
            if (!res.ok) fetchCollection(); // Revert on failure
        } catch (err) {
            console.error("Update failed:", err);
            fetchCollection();
        }
    };

    const handleUpdateVariant = async (id: number, newVariant: string) => {
        // Optimistic update
        setCollectedCards(prev => prev.map(c => c.id === id ? { ...c, variant: newVariant } : c));

        try {
            const res = await fetch("/api/card-manager/collected", {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, variant: newVariant })
            });
            if (!res.ok) fetchCollection(); // Revert on failure
        } catch (err) {
            console.error("Update failed:", err);
            fetchCollection();
        }
    };

    const handleExport = () => {
        if (collectedCards.length === 0) return;

        const headers = ["Franchise", "Collection", "Collection ID", "Card ID", "Name", "Card No", "Rarity", "Quantity", "Variant", "Condition"];
        const rows = collectedCards.map(c => [
            `"${c.franchise || "---"}"`,
            `"${c.collectionName}"`,
            c.collectionId || "---",
            c.cardId,
            `"${c.name}"`,
            c.cardNo,
            c.rarity,
            c.quantity,
            c.variant || "NF",
            c.condition || "NM"
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `my_collection_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
                <Group justify="space-between" align="center">
                    <Text fw={700} size="lg">My Collection</Text>
                    <Group gap="xs">
                        {loading ? <Loader size="xs" /> : (
                            <Badge color="grape" variant="filled" h={18} styles={{ label: { fontSize: '10px' } }}>
                                {collectedCards.length}
                            </Badge>
                        )}
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            title="Export to CSV"
                            onClick={handleExport}
                            disabled={collectedCards.length === 0}
                        >
                            <IconDownload size={18} />
                        </ActionIcon>
                    </Group>
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
                                <Card
                                    key={card.id}
                                    withBorder
                                    padding="xs"
                                    radius="sm"
                                    h={115}
                                    style={{
                                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                        cursor: 'default'
                                    }}
                                >
                                    <Group gap="sm" wrap="nowrap" h="100%" align="center">
                                        <Box w={65} style={{ display: 'flex', justifyContent: 'center' }}>
                                            <Image
                                                src={card.imageUrl}
                                                w={60}
                                                h={85}
                                                radius="xs"
                                                style={{
                                                    objectFit: 'contain',
                                                    cursor: 'pointer',
                                                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                                                }}
                                                onClick={() => onImageClick?.(card.imageUrl)}
                                            />
                                        </Box>

                                        <Stack gap={2} style={{ flex: 1, minWidth: 0, height: '100%', justifyContent: 'center' }}>
                                            <Text size="xs" fw={700} lineClamp={1} style={{ lineHeight: 1.2 }}>{card.name}</Text>
                                            <Text size="10px" c="dimmed" lineClamp={1}>
                                                {card.franchise ? `${card.franchise.toUpperCase()} • ` : ""}{card.collectionName}
                                            </Text>

                                            <Group gap={6} mt={2} align="center">
                                                <Text size="10px" fw={600} c="blue.7" bg="blue.0" px={4} style={{ borderRadius: '2px' }}>#{card.cardNo}</Text>
                                                <Text size="10px" fw={500} bg="gray.1" px={4} style={{ borderRadius: '2px' }}>{card.rarity}</Text>
                                            </Group>

                                            <Group gap={4} mt={4} align="center" wrap="nowrap">
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

                                                <Menu shadow="md">
                                                    <Menu.Target>
                                                        <Badge
                                                            size="9px"
                                                            h={18}
                                                            px={6}
                                                            variant="outline"
                                                            color="orange"
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            {card.variant || "NF"}
                                                        </Badge>
                                                    </Menu.Target>
                                                    <Menu.Dropdown>
                                                        <Menu.Label>Variant</Menu.Label>
                                                        {VARIANTS.map(v => (
                                                            <Menu.Item
                                                                key={v}
                                                                onClick={() => handleUpdateVariant(card.id, v)}
                                                                style={{ fontSize: '10px' }}
                                                            >
                                                                {v === "NF" ? "Non-Foil" : "Foil"}
                                                            </Menu.Item>
                                                        ))}
                                                    </Menu.Dropdown>
                                                </Menu>

                                                <Menu shadow="md">
                                                    <Menu.Target>
                                                        <Badge
                                                            size="9px"
                                                            h={18}
                                                            px={6}
                                                            variant="outline"
                                                            color="gray"
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            {card.condition || "NM"}
                                                        </Badge>
                                                    </Menu.Target>
                                                    <Menu.Dropdown>
                                                        <Menu.Label>Condition</Menu.Label>
                                                        {CONDITIONS.map(cond => (
                                                            <Menu.Item
                                                                key={cond.value}
                                                                onClick={() => handleUpdateCondition(card.id, cond.value)}
                                                                style={{ fontSize: '10px' }}
                                                            >
                                                                {cond.label}
                                                            </Menu.Item>
                                                        ))}
                                                    </Menu.Dropdown>
                                                </Menu>
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
