"use client";

import { Box, Loader, Stack, Text } from "@mantine/core";
import { CARD_MANAGER_CONFIG } from "@/constants/card_manager";

interface SearchResultInfoProps {
    loading: boolean;
    resultsCount: number;
    info: string;
}

export function SearchResultInfo({
    loading,
    resultsCount,
    info,
}: SearchResultInfoProps) {
    if (resultsCount > 0) return null;

    return (
        <Box py="xl" ta="center">
            {loading ? (
                <Stack align="center" gap="xs">
                    <Loader size="sm" />
                    <Text c="dimmed" size="sm">
                        Scanning and looking for cards...
                    </Text>
                </Stack>
            ) : (
                <>
                    {info.length >= CARD_MANAGER_CONFIG.SEARCH.MIN_CHARS ? (
                        <Text c="dimmed" size="sm">
                            No cards found matching "{info}"
                        </Text>
                    ) : (
                        <Text c="dimmed" size="sm">
                            Waiting for next searching
                        </Text>
                    )}
                </>
            )}
        </Box>
    );
}
