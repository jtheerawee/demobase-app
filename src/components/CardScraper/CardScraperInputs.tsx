"use client";

import { Select, Stack } from "@mantine/core";
import { useMemo } from "react";
import { FRANCHISE_OPTIONS, getLanguagesForFranchise } from "@/constants/franchises";

interface CardScraperInputsProps {
    franchise?: string | null;
    language?: string | null;
    onFranchiseChange?: (value: string | null) => void;
    onLanguageChange?: (value: string | null) => void;
}

export function CardScraperInputs({
    franchise,
    language,
    onFranchiseChange,
    onLanguageChange,
}: CardScraperInputsProps) {
    const languageOptions = useMemo(() => {
        return getLanguagesForFranchise(franchise);
    }, [franchise]);

    return (
        <Stack gap="sm">
            <Select
                placeholder="Choose a franchise"
                value={franchise}
                onChange={onFranchiseChange}
                data={FRANCHISE_OPTIONS}
            />
            <Select
                placeholder="Choose a language"
                value={language}
                onChange={onLanguageChange}
                data={languageOptions}
                disabled={!franchise || languageOptions.length === 0}
            />
        </Stack>
    );
}
