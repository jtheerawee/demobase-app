"use client";

import { Box, Stack, Loader, Text } from "@mantine/core";

export function SearchResultLoader() {
    return (
        <Box py="xl" ta="center">
            <Stack align="center" gap="xs">
                <Loader size="sm" />
                <Text c="dimmed" size="xs">
                    Scanning and looking for cards...
                </Text>
            </Stack>
        </Box>
    );
}
