"use client";

import { Group, TextInput, Loader, CloseButton, SegmentedControl, Stack, Center, Text } from "@mantine/core";
import { IconSearch, IconAlphabetLatin, IconScan, IconCamera } from "@tabler/icons-react";
import { APP_CONFIG } from "@/constants/app";
import { CardManagerOCR } from "./CardManagerOCR";

export type SearchMode = "text" | "scan_camera";

interface CardManagerSearchProps {
    query: string;
    setQuery: (query: string) => void;
    loading: boolean;
    searchMode: SearchMode;
    onSearchModeChange: (mode: SearchMode) => void;
    onScanIds: (ids: string[]) => void;
    autoAdd: boolean;
    onAutoAddChange: (val: boolean) => void;
    autoCapture: boolean;
    onAutoCaptureChange: (val: boolean) => void;
    paused?: boolean;
    onClear?: () => void;
    loopActive?: boolean;
    onLoopActiveChange?: (val: boolean) => void;
    autoCaptureInterval: number;
    onAutoCaptureIntervalChange: (val: number) => void;
}

export function CardManagerSearch({ query, setQuery, loading, searchMode, onSearchModeChange, onScanIds, autoAdd, onAutoAddChange, autoCapture, onAutoCaptureChange, paused, onClear, loopActive, onLoopActiveChange, autoCaptureInterval, onAutoCaptureIntervalChange }: CardManagerSearchProps) {
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
                            value: "scan_camera",
                            label: (
                                <Center style={{ gap: 10 }}>
                                    <IconCamera size={16} />
                                    <span>Scan Card Using Camera</span>
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
                <CardManagerOCR
                    mode="camera"
                    onScan={onScanIds}
                    onTextResult={setQuery}
                    onClear={() => { setQuery(""); onClear?.(); }}
                    autoAdd={autoAdd}
                    onAutoAddChange={onAutoAddChange}
                    autoCapture={autoCapture}
                    onAutoCaptureChange={onAutoCaptureChange}
                    paused={paused}
                    loopActive={loopActive}
                    onLoopActiveChange={onLoopActiveChange}
                    autoCaptureInterval={autoCaptureInterval}
                    onAutoCaptureIntervalChange={onAutoCaptureIntervalChange}
                />
            )}
        </Stack>
    );
}
