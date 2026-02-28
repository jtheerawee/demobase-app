"use client";

import { ActionIcon, Box, ScrollArea, Stack } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { ImagePreviewModal } from "@/components/ImagePreviewModal";
import { WidgetHeader } from "@/components/WidgetHeader";
import { SearchCardList } from "./SearchCardList";
import { SearchResultInfo } from "./SearchResultInfo";

export interface SearchedCard {
    id: number;
    name: string;
    imageUrl: string;
    cardUrl: string;
    cardNo: string;
    rarity: string;
    collectionName: string;
    collectionCode: string;
    franchise?: string;
}

interface SearchResultWidgetProps {
    results: SearchedCard[];
    loading: boolean;
    info: string;
    addingId: number | null;
    collectedCardIds: Set<number>;
    onAddToCollection: (card: SearchedCard) => void;
    onImageClick?: (url: string) => void;
    onReset: () => void;
    waitingForSelection: boolean;
}

export function SearchResultWidget({
    results,
    loading,
    info,
    addingId,
    collectedCardIds,
    onAddToCollection,
    onImageClick,
    onReset,
    waitingForSelection,
}: SearchResultWidgetProps) {
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    return (
        <Stack gap={0} h="100%">
            <WidgetHeader
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
                        disabled={loading || (results.length === 0 && info === "" && !waitingForSelection)}
                    >
                        <IconTrash size={16} />
                    </ActionIcon>
                }
            />
            <Box style={{ flex: 1, minHeight: 0 }}>
                <ScrollArea flex={1} type="hover" h="100%">
                    <SearchCardList
                        results={results}
                        addingId={addingId}
                        collectedCardIds={collectedCardIds}
                        onAddToCollection={onAddToCollection}
                        onImageClick={(url) => {
                            setPreviewImage(url);
                            if (onImageClick) {
                                onImageClick(url);
                            }
                        }}
                    />

                    <SearchResultInfo loading={loading} resultsCount={results.length} info={info} />
                </ScrollArea>
            </Box>

            <ImagePreviewModal
                opened={!!previewImage}
                onClose={() => setPreviewImage(null)}
                src={previewImage}
                title={(() => {
                    const card = results.find((c) => c.imageUrl === previewImage);
                    return card ? `${card.name} (${card.collectionCode} #${card.cardNo})` : undefined;
                })()}
            />
        </Stack>
    );
}
