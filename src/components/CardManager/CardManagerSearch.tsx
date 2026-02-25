"use client";

import { SegmentedControl, Stack, Center } from "@mantine/core";
import { IconAlphabetLatin, IconCamera } from "@tabler/icons-react";
import { CardManagerOCR } from "./CardManagerOCR";
import { CardManagerTextSearch } from "./CardManagerTextSearch";

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
    resetTrigger?: number;
}

export function CardManagerSearch({ query, setQuery, loading, searchMode, onSearchModeChange, onScanIds, autoAdd, onAutoAddChange, autoCapture, onAutoCaptureChange, paused, onClear, loopActive, onLoopActiveChange, autoCaptureInterval, onAutoCaptureIntervalChange, resetTrigger }: CardManagerSearchProps) {
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
                                    <span>Camera</span>
                                </Center>
                            ),
                        },
                    ]}
                />
            </Center>

            {searchMode === "text" ? (
                <CardManagerTextSearch
                    query={query}
                    setQuery={setQuery}
                    loading={loading}
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
                    resetTrigger={resetTrigger}
                />
            )}
        </Stack>
    );
}
