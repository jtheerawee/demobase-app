"use client";

import { Group, TextInput, Loader, CloseButton, SegmentedControl, Stack, Center, Text } from "@mantine/core";
import { IconSearch, IconAlphabetLatin, IconScan } from "@tabler/icons-react";
import { APP_CONFIG } from "@/constants/app";
import { CardManagerOCR } from "./CardManagerOCR";

export type SearchMode = "text" | "scan";

interface CardManagerSearchProps {
    query: string;
    setQuery: (query: string) => void;
    loading: boolean;
    searchMode: SearchMode;
    onSearchModeChange: (mode: SearchMode) => void;
}

export function CardManagerSearch({ query, setQuery, loading, searchMode, onSearchModeChange }: CardManagerSearchProps) {
    const handleOCRResult = (text: string) => {
        setQuery(text);
        onSearchModeChange("text");
    };

    return (
        <Stack gap="sm" w="100%">
            <Center>
                <SegmentedControl
                    value={searchMode}
                    onChange={(val) => onSearchModeChange(val as SearchMode)}
                    data={[
                        {
                            value: "text",
                            label: (
                                <Center style={{ gap: 10 }}>
                                    <IconAlphabetLatin size={16} />
                                    <span>Text Search</span>
                                </Center>
                            ),
                        },
                        {
                            value: "scan",
                            label: (
                                <Center style={{ gap: 10 }}>
                                    <IconScan size={16} />
                                    <span>Scan Card</span>
                                </Center>
                            ),
                        },
                    ]}
                />
            </Center>

            {searchMode === "text" ? (
                <TextInput
                    placeholder={`Type card name (min ${APP_CONFIG.SEARCH_MIN_CHARS} chars)...`}
                    size="md"
                    w="100%"
                    leftSection={<IconSearch size={18} />}
                    rightSection={
                        loading ? (
                            <Loader size="xs" />
                        ) : query !== "" ? (
                            <CloseButton onClick={() => setQuery("")} />
                        ) : null
                    }
                    value={query}
                    onChange={(e) => setQuery(e.currentTarget.value)}
                />
            ) : (
                <CardManagerOCR onResult={handleOCRResult} />
            )}
        </Stack>
    );
}
