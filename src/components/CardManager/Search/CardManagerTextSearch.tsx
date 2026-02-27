"use client";

import {
    TextInput,
    Loader,
    CloseButton,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { APP_CONFIG } from "@/constants/app";

interface CardManagerTextSearchProps {
    query: string;
    setQuery: (query: string) => void;
    loading: boolean;
}

export function CardManagerTextSearch({
    query,
    setQuery,
    loading,
}: CardManagerTextSearchProps) {
    return (
        <TextInput
            placeholder={`Type card name (min ${APP_CONFIG.SEARCH_MIN_CHARS} chars)...`}
            size="md"
            w="100%"
            leftSection={<IconSearch size={18} />}
            rightSection={
                loading ? (
                    <Loader size="xs" />
                ) : query !== "" ? (
                    <CloseButton
                        onClick={() => setQuery("")}
                    />
                ) : null
            }
            value={query}
            onChange={(e) =>
                setQuery(e.currentTarget.value)
            }
        />
    );
}
