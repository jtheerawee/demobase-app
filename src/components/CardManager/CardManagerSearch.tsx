import { SegmentedControl, Stack, Center, Card, Select } from "@mantine/core";
import { IconAlphabetLatin, IconCamera } from "@tabler/icons-react";
import { CardManagerOCR } from "./CardManagerOCR";
import { CardManagerTextSearch } from "./CardManagerTextSearch";
import { CardManagerHeader } from "./CardManagerHeader";

export type SearchMode = "text" | "scan_camera";

interface CardManagerSearchProps {
    query: string;
    setQuery: (query: string) => void;
    loading: boolean;
    searchMode: SearchMode;
    onSearchModeChange: (mode: SearchMode) => void;
    onScanIds: (ids: string[]) => void;
    onScanStart?: () => void;
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
    selectedFranchise: string | null;
    onFranchiseChange: (val: string | null) => void;
    franchiseOptions: { value: string, label: string }[];
    selectedLanguage: string | null;
    onLanguageChange: (val: string | null) => void;
    languageOptions: { value: string, label: string }[];
}

export function CardManagerSearch({
    query,
    setQuery,
    loading,
    searchMode,
    onSearchModeChange,
    onScanIds,
    onScanStart,
    autoAdd,
    onAutoAddChange,
    autoCapture,
    onAutoCaptureChange,
    paused,
    onClear,
    loopActive,
    onLoopActiveChange,
    autoCaptureInterval,
    onAutoCaptureIntervalChange,
    resetTrigger,
    selectedFranchise,
    onFranchiseChange,
    franchiseOptions,
    selectedLanguage,
    onLanguageChange,
    languageOptions
}: CardManagerSearchProps) {
    return (
        <Card withBorder padding="md" radius="md" shadow="sm" h="100%">
            <Stack gap="md" h="100%">
                <CardManagerHeader
                    title="Search"
                    actions={
                        <>
                            <Select
                                size="xs"
                                placeholder="Franchise"
                                value={selectedFranchise}
                                onChange={onFranchiseChange}
                                data={franchiseOptions}
                                style={{ width: 140 }}
                            />
                            <Select
                                size="xs"
                                placeholder="Language"
                                value={selectedLanguage}
                                onChange={onLanguageChange}
                                data={languageOptions}
                                style={{ width: 140 }}
                            />
                        </>
                    }
                />

                <Stack gap="sm" w="100%" flex={1}>
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
                            onScanStart={onScanStart}
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
            </Stack>
        </Card>
    );
}
