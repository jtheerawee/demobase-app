"use client";

import { Tooltip, ActionIcon } from "@mantine/core";
import { IconExternalLink, IconPlus } from "@tabler/icons-react";
import { SearchedCard } from "./SearchResultWidget";
import { BaseCard } from "../BaseCard";

interface SearchCardProps {
    card: SearchedCard;
    addingId: number | null;
    collectedCardIds: Set<number>;
    onAddToCollection: (card: SearchedCard) => void;
    onImageClick: (url: string) => void;
}

export function SearchCard({
    card,
    addingId,
    collectedCardIds,
    onAddToCollection,
    onImageClick,
}: SearchCardProps) {
    const isCollected = collectedCardIds.has(card.id);

    return (
        <BaseCard
            card={{
                name: card.name,
                imageUrl: card.imageUrl,
                cardNo: card.cardNo || "",
                rarity: card.rarity || "",
                collectionName: card.collectionName || "",
                collectionCode: card.collectionCode || "",
                franchise: card.franchise || "",
            }}
            onImageClick={onImageClick}
            rightActions={
                <>
                    <ActionIcon
                        variant="subtle"
                        color="blue"
                        size="sm"
                        component="a"
                        href={card.cardUrl}
                        target="_blank"
                    >
                        <IconExternalLink size={14} />
                    </ActionIcon>
                    <Tooltip
                        label={
                            isCollected
                                ? "Already in your collection"
                                : "Add to collection"
                        }
                        position="left"
                        withArrow
                    >
                        <ActionIcon
                            variant="light"
                            color={isCollected ? "gray" : "green"}
                            size="sm"
                            disabled={isCollected}
                            onClick={() => onAddToCollection(card)}
                            loading={addingId === card.id}
                        >
                            <IconPlus size={14} />
                        </ActionIcon>
                    </Tooltip>
                </>
            }
        />
    );
}
