import { ScrollArea, Select, Stack } from "@mantine/core";
import { useState } from "react";
import { WidgetHeader } from "@/components/WidgetHeader";
import { CardManagerOCR } from "./CardManagerOCR";
import { CardManagerTextSearch } from "./CardManagerTextSearch";
import { SearchInstructionModal } from "./SearchInstructionModal";
import { type SearchMode, SearchModeSwitcher } from "./SearchModeSwitcher";

interface SearchWidgetProps {
    query: string;
    setQuery: (query: string) => void;
    loading: boolean;
    searchMode: SearchMode;
    onSearchModeChange: (mode: SearchMode) => void;
    onScanIds: (ids: string[]) => void;
    onScanStart?: () => void;
    onResultInfo?: (info: string) => void;
    autoAdd: boolean;
    onAutoAddChange: (val: boolean) => void;
    autoCapture: boolean;
    onAutoCaptureChange: (val: boolean) => void;
    paused?: boolean;
    onClear?: () => void;
    loopActive?: boolean;
    onLoopActiveChange?: (val: boolean) => void;
    manualCaptureDelay: number;
    onManualCaptureDelayChange: (val: number) => void;
    autoCaptureDelay: number;
    onAutoCaptureDelayChange: (val: number) => void;
    resetTrigger?: number;
    selectedFranchise: string | null;
    onFranchiseChange: (val: string | null) => void;
    franchiseOptions: { value: string; label: string }[];
    selectedLanguage: string | null;
    onLanguageChange: (val: string | null) => void;
    languageOptions: { value: string; label: string }[];
}

export function SearchWidget({
    query,
    setQuery,
    loading,
    searchMode,
    onSearchModeChange,
    onScanIds,
    onScanStart,
    onResultInfo,
    autoAdd,
    onAutoAddChange,
    autoCapture,
    onAutoCaptureChange,
    paused,
    onClear,
    loopActive,
    onLoopActiveChange,
    manualCaptureDelay,
    onManualCaptureDelayChange,
    autoCaptureDelay,
    onAutoCaptureDelayChange,
    resetTrigger,
    selectedFranchise,
    onFranchiseChange,
    franchiseOptions,
    selectedLanguage,
    onLanguageChange,
    languageOptions,
}: SearchWidgetProps) {
    const [instructionOpened, setInstructionOpened] = useState(false);

    return (
        <Stack gap={0} h="100%">
            <WidgetHeader
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

            <ScrollArea flex={1} scrollbars="y" type="auto">
                <Stack gap="sm" w="100%" px="sm" py="sm">
                    <SearchModeSwitcher
                        value={searchMode}
                        onChange={onSearchModeChange}
                        onInfoClick={() => setInstructionOpened(true)}
                    />

                    {searchMode === "text" ? (
                        <CardManagerTextSearch query={query} setQuery={setQuery} loading={loading} />
                    ) : (
                        <CardManagerOCR
                            mode="camera"
                            onScan={onScanIds}
                            onScanStart={onScanStart}
                            onResultInfo={onResultInfo}
                            onClear={() => {
                                setQuery("");
                                onClear?.();
                            }}
                            autoAdd={autoAdd}
                            onAutoAddChange={onAutoAddChange}
                            autoCapture={autoCapture}
                            onAutoCaptureChange={onAutoCaptureChange}
                            paused={paused}
                            loopActive={loopActive}
                            onLoopActiveChange={onLoopActiveChange}
                            manualCaptureDelay={manualCaptureDelay}
                            onManualCaptureDelayChange={onManualCaptureDelayChange}
                            autoCaptureDelay={autoCaptureDelay}
                            onAutoCaptureDelayChange={onAutoCaptureDelayChange}
                            resetTrigger={resetTrigger}
                        />
                    )}
                </Stack>
            </ScrollArea>

            <SearchInstructionModal
                opened={instructionOpened}
                onClose={() => setInstructionOpened(false)}
                searchMode={searchMode}
            />
        </Stack>
    );
}
