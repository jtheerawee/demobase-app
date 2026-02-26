"use client";

import {
    Card,
    Stack,
    Text,
    ScrollArea,
    Group,
    Image,
    ActionIcon,
    Box,
    Modal,
    Select,
    Button,
} from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { notifications } from "@mantine/notifications";
import { CollectedCard, CONDITIONS } from "./CollectedCard";
import { CardManagerHeader } from "./CardManagerHeader";

export const CollectedCardList = forwardRef(
    (
        {
            onImageClick,
            onCollectionChange,
        }: {
            onImageClick?: (url: string) => void;
            onCollectionChange?: (ids: Set<number>) => void;
        },
        ref,
    ) => {
        const [collectedCards, setCollectedCards] = useState<CollectedCard[]>(
            [],
        );
        const [loading, setLoading] = useState(true);
        const [addEntryCard, setAddEntryCard] = useState<CollectedCard | null>(
            null,
        );
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
                    onCollectionChange?.(
                        new Set(data.cards.map((c: CollectedCard) => c.cardId)),
                    );
                }
            } catch (err) {
                console.error("Failed to fetch collection:", err);
            } finally {
                setLoading(false);
            }
        };

        const handleDelete = async (id: number) => {
            try {
                const res = await fetch(
                    `/api/card-manager/collected?id=${id}`,
                    { method: "DELETE" },
                );
                if (res.ok) fetchCollection();
            } catch (err) {
                console.error("Delete failed:", err);
            }
        };

        const handleUpdateQuantity = async (
            id: number,
            newQuantity: number,
        ) => {
            if (newQuantity < 1) return;

            // Optimistic update
            setCollectedCards((prev) =>
                prev.map((c) =>
                    c.id === id ? { ...c, quantity: newQuantity } : c,
                ),
            );

            try {
                const res = await fetch("/api/card-manager/collected", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id, quantity: newQuantity }),
                });
                if (!res.ok) fetchCollection(); // Revert on failure
            } catch (err) {
                console.error("Update failed:", err);
                fetchCollection();
            }
        };

        const handleUpdateCondition = async (
            id: number,
            newCondition: string,
        ) => {
            // Optimistic update
            setCollectedCards((prev) =>
                prev.map((c) =>
                    c.id === id ? { ...c, condition: newCondition } : c,
                ),
            );

            try {
                const res = await fetch("/api/card-manager/collected", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id, condition: newCondition }),
                });
                if (!res.ok) fetchCollection(); // Revert on failure
            } catch (err) {
                console.error("Update failed:", err);
                fetchCollection();
            }
        };

        const handleUpdateVariant = async (id: number, newVariant: string) => {
            // Optimistic update
            setCollectedCards((prev) =>
                prev.map((c) =>
                    c.id === id ? { ...c, variant: newVariant } : c,
                ),
            );

            try {
                const res = await fetch("/api/card-manager/collected", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id, variant: newVariant }),
                });
                if (!res.ok) fetchCollection(); // Revert on failure
            } catch (err) {
                console.error("Update failed:", err);
                fetchCollection();
            }
        };

        const handleExport = () => {
            if (collectedCards.length === 0) return;

            const headers = [
                "Franchise",
                "Collection",
                "Collection ID",
                "Card ID",
                "Name",
                "Card No",
                "Rarity",
                "Quantity",
                "Variant",
                "Condition",
            ];
            const rows = collectedCards.map((c) => [
                `"${c.franchise || "---"}"`,
                `"${c.collectionName}"`,
                c.collectionId || "---",
                c.cardId,
                `"${c.name}"`,
                c.cardNo,
                c.rarity,
                c.quantity,
                c.variant || "NF",
                c.condition || "NM",
            ]);

            const csvContent = [headers, ...rows]
                .map((e) => e.join(","))
                .join("\n");
            const blob = new Blob([csvContent], {
                type: "text/csv;charset=utf-8;",
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute(
                "download",
                `my_collection_${new Date().toISOString().split("T")[0]}.csv`,
            );
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
                    <CardManagerHeader
                        title="My Collection"
                        count={collectedCards.length}
                        loading={loading}
                        badgeColor="grape"
                        actions={
                            <ActionIcon
                                variant="subtle"
                                color="gray"
                                title="Export to CSV"
                                onClick={handleExport}
                                disabled={collectedCards.length === 0}
                            >
                                <IconDownload size={18} />
                            </ActionIcon>
                        }
                    />

                    <ScrollArea flex={1} offsetScrollbars>
                        {collectedCards.length === 0 && !loading ? (
                            <Box py="xl" style={{ textAlign: "center" }}>
                                <Text c="dimmed" size="sm">
                                    Your collection is empty.
                                </Text>
                                <Text c="dimmed" size="xs">
                                    Search cards and click "+" to add them.
                                </Text>
                            </Box>
                        ) : (
                            <Stack gap="sm">
                                {collectedCards.map((card) => (
                                    <CollectedCard
                                        key={card.id}
                                        card={card}
                                        onImageClick={onImageClick}
                                        onUpdateQuantity={handleUpdateQuantity}
                                        onUpdateCondition={
                                            handleUpdateCondition
                                        }
                                        onUpdateVariant={handleUpdateVariant}
                                        onDelete={handleDelete}
                                        onAddEntry={(c) => {
                                            setAddEntryCard(c);
                                            setAddVariant("NF");
                                            setAddCondition("NM");
                                        }}
                                    />
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
                                    style={{
                                        objectFit: "contain",
                                        flexShrink: 0,
                                    }}
                                    onClick={() =>
                                        onImageClick?.(addEntryCard.imageUrl)
                                    }
                                />
                                <Stack gap={4}>
                                    <Text fw={700} size="sm">
                                        {addEntryCard.name}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                        {addEntryCard.collectionName}
                                    </Text>
                                    <Group gap={6}>
                                        <Text
                                            size="xs"
                                            fw={600}
                                            c="blue.7"
                                            bg="blue.0"
                                            px={4}
                                            style={{ borderRadius: "2px" }}
                                        >
                                            #{addEntryCard.cardNo}
                                        </Text>
                                        <Text
                                            size="xs"
                                            fw={500}
                                            bg="gray.1"
                                            px={4}
                                            style={{ borderRadius: "2px" }}
                                        >
                                            {addEntryCard.rarity}
                                        </Text>
                                    </Group>
                                </Stack>
                            </Group>
                            <Select
                                label="Variant"
                                value={addVariant}
                                onChange={(v) => setAddVariant(v || "NF")}
                                data={[
                                    { value: "NF", label: "Non-Foil" },
                                    { value: "F", label: "Foil" },
                                ]}
                                size="sm"
                            />
                            <Select
                                label="Condition"
                                value={addCondition}
                                onChange={(v) => setAddCondition(v || "NM")}
                                data={CONDITIONS.map((c) => ({
                                    value: c.value,
                                    label: c.label,
                                }))}
                                size="sm"
                            />
                            <Group justify="flex-end" gap="xs">
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => setAddEntryCard(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    color="green"
                                    loading={addingEntry}
                                    onClick={handleAddEntry}
                                >
                                    Add Entry
                                </Button>
                            </Group>
                        </Stack>
                    )}
                </Modal>
            </Card>
        );
    },
);

CollectedCardList.displayName = "CollectedCardList";
