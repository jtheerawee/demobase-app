import { Stack, Select } from "@mantine/core";
import { CardManagerOCR } from "./CardManagerOCR";
import { CardManagerTextSearch } from "./CardManagerTextSearch";
import { CardManagerHeader } from "./CardManagerHeader";
import { SearchModeSwitcher, type SearchMode } from "./SearchModeSwitcher";


interface SearchWidgetProps {
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
    franchiseOptions: { value: string; label: string }[];
    selectedLanguage: string | null;
    onLanguageChange: (val: string | null) => void;
    languageOptions: { value: string; label: string }[];
    onInfoClick?: () => void;
}

export function SearchWidget({
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
    languageOptions,
    onInfoClick,
}: SearchWidgetProps) {
    return (
        <>
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
                <SearchModeSwitcher
                    value={searchMode}
                    onChange={onSearchModeChange}
                    onInfoClick={onInfoClick}
                />

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
                        autoCaptureInterval={autoCaptureInterval}
                        onAutoCaptureIntervalChange={
                            onAutoCaptureIntervalChange
                        }
                        resetTrigger={resetTrigger}
                    />
                )}
            </Stack>
        </>
    );
}
