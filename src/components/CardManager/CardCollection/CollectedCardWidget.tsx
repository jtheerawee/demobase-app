"use client";

import {
    ActionIcon,
} from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { notifications } from "@mantine/notifications";
import { CollectedCard } from "./CollectedCard";
import { CollectedCardList } from "./CollectedCardList";
import { CollectedCardModal } from "./CollectedCardModal";
import { CardManagerHeader } from "../Search";
import { APP_CONFIG } from "@/constants/app";

export const CollectedCardWidget = forwardRef(
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
        const [addVariant, setAddVariant] = useState<string>("nf");
        const [addCondition, setAddCondition] = useState<string>("nm");
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
                c.variant || "nf",
                c.condition || "nm",
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
                            autoClose: APP_CONFIG.NOTIFICATION_AUTO_CLOSE,
                        });
                    } else {
                        notifications.show({
                            title: "Entry Added",
                            message: `${addEntryCard.name} — ${addVariant} / ${addCondition} added.`,
                            color: "green",
                            autoClose: APP_CONFIG.NOTIFICATION_AUTO_CLOSE,
                        });
                        setAddEntryCard(null);
                        fetchCollection();
                    }
                } else {
                    notifications.show({
                        title: "Failed",
                        message: data.error || "Could not add entry.",
                        color: "red",
                        autoClose: APP_CONFIG.NOTIFICATION_AUTO_CLOSE,
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
            <>
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

                <CollectedCardList
                    cards={collectedCards}
                    loading={loading}
                    onImageClick={onImageClick}
                    onUpdateQuantity={handleUpdateQuantity}
                    onUpdateCondition={handleUpdateCondition}
                    onUpdateVariant={handleUpdateVariant}
                    onDelete={handleDelete}
                    onAddEntry={(c) => {
                        setAddEntryCard(c);
                        setAddVariant("nf");
                        setAddCondition("nm");
                    }}
                />

                <CollectedCardModal
                    card={addEntryCard}
                    onClose={() => setAddEntryCard(null)}
                    variant={addVariant}
                    onVariantChange={setAddVariant}
                    condition={addCondition}
                    onConditionChange={setAddCondition}
                    onAdd={handleAddEntry}
                    adding={addingEntry}
                    onImageClick={onImageClick}
                />
            </>
        );
    },
);

CollectedCardWidget.displayName = "CollectedCardWidget";
