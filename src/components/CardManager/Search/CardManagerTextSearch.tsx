"use client";

import { CloseButton, Loader, TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { CARD_MANAGER_CONFIG } from "@/constants/card_manager";

interface CardManagerTextSearchProps {
    query: string;
    setQuery: (query: string) => void;
    loading: boolean;
}

export function CardManagerTextSearch({ query, setQuery, loading }: CardManagerTextSearchProps) {
    return (
        <TextInput
            placeholder={`Type card name (min ${CARD_MANAGER_CONFIG.SEARCH.MIN_CHARS} chars)...`}
            size="md"
            w="100%"
            leftSection={<IconSearch size={18} />}
            rightSection={
                loading ? <Loader size="xs" /> : query !== "" ? <CloseButton onClick={() => setQuery("")} /> : null
            }
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
        />
    );
}
