"use client";

import { Select, Stack } from "@mantine/core";
import { useMemo } from "react";

const LANGUAGE_OPTIONS: Record<string, { value: string; label: string }[]> = {
    mtg: [
        { value: "en", label: "English" },
        { value: "jp", label: "Japanese" },
    ],
    pokemon: [
        { value: "en", label: "English" },
        { value: "jp", label: "Japanese" },
        { value: "th", label: "Thai" },
    ],
    "one-piece": [
        { value: "en", label: "English" },
        { value: "jp", label: "Japanese" },
    ],
    lorcana: [
        { value: "en", label: "English" },
    ],
};

interface CardScraperInputsProps {
    franchise?: string | null;
    language?: string | null;
    onFranchiseChange?: (value: string | null) => void;
    onLanguageChange?: (value: string | null) => void;
}

export function CardScraperInputs({ franchise, language, onFranchiseChange, onLanguageChange }: CardScraperInputsProps) {
    const languageOptions = useMemo(() => {
        return franchise ? (LANGUAGE_OPTIONS[franchise] ?? []) : [];
    }, [franchise]);

    return (
        <Stack gap="sm">
            <Select
                placeholder="Choose a franchise"
                value={franchise}
                onChange={onFranchiseChange}
                data={[
                    { value: "mtg", label: "MTG" },
                    { value: "pokemon", label: "Pokémon" },
                    { value: "one-piece", label: "One Piece" },
                    { value: "lorcana", label: "Lorcana" },
                ]}
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
