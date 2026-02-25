"use client";

import { Card, Stack, Text, ScrollArea, Group, Image, Badge, ActionIcon, Box, Loader, Menu, Modal, Select, Button, Tooltip } from "@mantine/core";
import { IconTrash, IconPlus, IconMinus, IconDownload } from "@tabler/icons-react";
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { notifications } from "@mantine/notifications";

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

export const CollectedCardsList = forwardRef(({ onImageClick, onCollectionChange }: { onImageClick?: (url: string) => void; onCollectionChange?: (ids: Set<number>) => void }, ref) => {
    const [collectedCards, setCollectedCards] = useState<CollectedCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [addEntryCard, setAddEntryCard] = useState<CollectedCard | null>(null);
    const [addVariant, setAddVariant] = useState<string>("NF");
    const [addCondition, setAddCondition] = useState<string>("NM");
    const [addingEntry, setAddingEntry] = useState(false);

    const fetchCollection = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/card-manager/collected");
            const data = await res.json();
            if (data.success) {
                setCollectedCards(data.cards);
                onCollectionChange?.(new Set(data.cards.map((c: CollectedCard) => c.cardId)));
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

    const handleAddEntry = async () => {
        if (!addEntryCard) return;
        setAddingEntry(true);
        try {
            const res = await fetch("/api/card-manager/collected", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cardId: addEntryCard.cardId,
                    variant: addVariant,
                    condition: addCondition,
                    checkVariantCondition: true,
                }),
            });
            const data = await res.json();
            if (data.success) {
                if (data.alreadyInCollection) {
                    notifications.show({
                        title: "Already Exists",
                        message: `${addEntryCard.name} (${addVariant} / ${addCondition}) is already in your collection.`,
                        color: "orange",
                        autoClose: 3000,
                    });
                } else {
                    notifications.show({
                        title: "Entry Added",
                        message: `${addEntryCard.name} — ${addVariant} / ${addCondition} added.`,
                        color: "green",
                        autoClose: 2000,
                    });
                    setAddEntryCard(null);
                    fetchCollection();
                }
            } else {
                notifications.show({
                    title: "Failed",
                    message: data.error || "Could not add entry.",
                    color: "red",
                    autoClose: 3000,
                });
            }
        } catch (err) {
            console.error("Add entry failed:", err);
        } finally {
            setAddingEntry(false);
        }
    };

    useImperativeHandle(ref, () => ({
        refresh: fetchCollection,
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
                                        <Stack gap={4}>
                                            <Tooltip label="Add new variant/condition entry" position="left" withArrow>
                                                <ActionIcon
                                                    variant="subtle"
                                                    color="green"
                                                    size="sm"
                                                    onClick={() => {
                                                        setAddEntryCard(card);
                                                        setAddVariant("NF");
                                                        setAddCondition("NM");
                                                    }}
                                                >
                                                    <IconPlus size={14} />
                                                </ActionIcon>
                                            </Tooltip>
                                            <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDelete(card.id)}>
                                                <IconTrash size={14} />
                                            </ActionIcon>
                                        </Stack>
                                    </Group>
                                </Card>
                            ))}
                        </Stack>
                    )}
                </ScrollArea>
            </Stack>

            <Modal
                opened={!!addEntryCard}
                onClose={() => setAddEntryCard(null)}
                title="Add Variant / Condition"
                centered
                size="sm"
                overlayProps={{ backgroundOpacity: 0.45, blur: 3 }}
            >
                {addEntryCard && (
                    <Stack gap="md">
                        <Group gap="md" wrap="nowrap">
                            <Image
                                src={addEntryCard.imageUrl}
                                w={50}
                                h={70}
                                radius="xs"
                                style={{ objectFit: 'contain', flexShrink: 0 }}
                            />
                            <Stack gap={4}>
                                <Text fw={700} size="sm">{addEntryCard.name}</Text>
                                <Text size="xs" c="dimmed">{addEntryCard.collectionName}</Text>
                                <Group gap={6}>
                                    <Text size="xs" fw={600} c="blue.7" bg="blue.0" px={4} style={{ borderRadius: '2px' }}>#{addEntryCard.cardNo}</Text>
                                    <Text size="xs" fw={500} bg="gray.1" px={4} style={{ borderRadius: '2px' }}>{addEntryCard.rarity}</Text>
                                </Group>
                            </Stack>
                        </Group>
                        <Select
                            label="Variant"
                            value={addVariant}
                            onChange={(v) => setAddVariant(v || "NF")}
                            data={[{ value: "NF", label: "Non-Foil" }, { value: "F", label: "Foil" }]}
                            size="sm"
                        />
                        <Select
                            label="Condition"
                            value={addCondition}
                            onChange={(v) => setAddCondition(v || "NM")}
                            data={CONDITIONS.map(c => ({ value: c.value, label: c.label }))}
                            size="sm"
                        />
                        <Group justify="flex-end" gap="xs">
                            <Button variant="default" size="sm" onClick={() => setAddEntryCard(null)}>Cancel</Button>
                            <Button size="sm" color="green" loading={addingEntry} onClick={handleAddEntry}>
                                Add Entry
                            </Button>
                        </Group>
                    </Stack>
                )}
            </Modal>
        </Card>
    );
});

CollectedCardsList.displayName = "CollectedCardsList";
