"use client";

import {
    ScrollArea,
    Box,
    ActionIcon,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { CardManagerHeader } from "../Search";
import { SearchResultInfo } from "./SearchResultInfo";
import { SearchCardList } from "./SearchCardList";

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

interface SearchResultWidgetProps {
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

export function SearchResultWidget({
    results,
    loading,
    query,
    addingId,
    collectedCardIds,
    onAddToCollection,
    onImageClick,
    onReset,
    waitingForSelection,
}: SearchResultWidgetProps) {
    return (
        <>
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
                <ScrollArea
                    flex={1}
                    offsetScrollbars
                    type="always"
                    h="100%"
                >
                    <SearchCardList
                        results={results}
                        addingId={addingId}
                        collectedCardIds={collectedCardIds}
                        onAddToCollection={onAddToCollection}
                        onImageClick={onImageClick}
                    />

                    <SearchResultInfo
                        loading={loading}
                        resultsCount={results.length}
                        query={query}
                    />
                </ScrollArea>
            </Box>
        </>
    );
}
