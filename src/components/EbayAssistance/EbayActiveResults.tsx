"use client";

import { Button, Center, SimpleGrid } from "@mantine/core";
import type { EbayItem } from "@/services/ebayService";
import { EbayItemCard } from "./EbayItemCard";

interface EbayActiveResultsProps {
    results: EbayItem[];
    loadingMore: boolean;
    onLoadMore: () => void;
    cols?: number;
    onHover?: (date: string | null) => void;
}

export function EbayActiveResults({ results, loadingMore, onLoadMore, cols = 4, onHover }: EbayActiveResultsProps) {
    if (results.length === 0) return null;

    return (
        <>
            <SimpleGrid cols={{ base: 1, sm: 2, md: cols }} spacing="lg">
                {results.map((item, index) => (
                    <EbayItemCard
                        key={item.itemId ? `${item.itemId}-${index}` : index}
                        item={item}
                        index={index}
                        onHover={onHover}
                    />
                ))}
            </SimpleGrid>

            <Center mt="xl">
                <Button
                    variant="subtle"
                    color="orange"
                    onClick={onLoadMore}
                    loading={loadingMore}
                    size="lg"
                    radius="md"
                >
                    Load More Results
                </Button>
            </Center>
        </>
    );
}
