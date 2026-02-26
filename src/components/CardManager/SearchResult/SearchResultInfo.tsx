"use client";

import { Box, Stack, Loader, Text } from "@mantine/core";
import { APP_CONFIG } from "@/constants/app";

interface SearchResultInfoProps {
    loading: boolean;
    resultsCount: number;
    query: string;
}

export function SearchResultInfo({
    loading,
    resultsCount,
    query,
}: SearchResultInfoProps) {
    if (resultsCount > 0) return null;

    return (
        <Box py="xl" ta="center">
            {loading ? (
                <Stack align="center" gap="xs">
                    <Loader size="sm" />
                    <Text c="dimmed" size="xs">
                        Scanning and looking for cards...
                    </Text>
                </Stack>
            ) : (
                <>
                    {query.length >= APP_CONFIG.SEARCH_MIN_CHARS ? (
                        <Text c="dimmed" size="xs">
                            No cards found matching "{query}"
                        </Text>
                    ) : (
                        <Text c="dimmed" size="xs">
                            Waiting for next searching
                        </Text>
                    )}
                </>
            )}
        </Box>
    );
}
