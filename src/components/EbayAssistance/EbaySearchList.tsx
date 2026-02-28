"use client";

import { ActionIcon, Badge, Group, Loader, Paper, Stack, Text, Tooltip } from "@mantine/core";
import { IconRefresh, IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

interface EbaySearch {
    id: number;
    keyword: string;
    service: string | null;
    grade: number | null;
    min_price: number | null;
    max_price: number | null;
    listing_type: string | null;
    exclude_jp: boolean;
    only_us: boolean;
    created_at: string;
}

interface EbaySearchListProps {
    onSelect: (search: {
        query: string;
        service: string;
        psa: string;
        minPrice: number | string;
        maxPrice: number | string;
        listingType: string;
        excludeJp: boolean;
        onlyUs: boolean;
    }) => void;
    onExecute: (search: {
        query: string;
        service: string;
        psa: string;
        minPrice: number | string;
        maxPrice: number | string;
        listingType: string;
        excludeJp: boolean;
        onlyUs: boolean;
    }) => void;
    refreshTrigger?: number;
}

export function EbaySearchList({ onSelect, onExecute, refreshTrigger }: EbaySearchListProps) {
    const t = useTranslations("EbayAssistance.searchList");
    const supabase = createClient();
    const [searches, setSearches] = useState<EbaySearch[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const fetchSearches = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("ebay_searches")
            .select("*")
            .order("created_at", { ascending: false });

        if (!error && data) setSearches(data as EbaySearch[]);
        setLoading(false);
    };

    useEffect(() => {
        fetchSearches();
    }, [refreshTrigger]);

    const handleDelete = async (id: number) => {
        setDeletingId(id);
        await supabase.from("ebay_searches").delete().eq("id", id);
        setSearches((prev) => prev.filter((s) => s.id !== id));
        setDeletingId(null);
    };

    const handleSelect = (s: EbaySearch) => {
        const params = {
            query: s.keyword,
            service: s.service || "psa",
            psa: s.grade != null ? String(s.grade) : "10",
            minPrice: s.min_price ?? "",
            maxPrice: s.max_price ?? "",
            listingType: s.listing_type || "auction",
            excludeJp: s.exclude_jp,
            onlyUs: s.only_us,
        };
        onSelect(params);
    };

    const handleExecute = (s: EbaySearch) => {
        const params = {
            query: s.keyword,
            service: s.service || "psa",
            psa: s.grade != null ? String(s.grade) : "10",
            minPrice: s.min_price ?? "",
            maxPrice: s.max_price ?? "",
            listingType: s.listing_type || "auction",
            excludeJp: s.exclude_jp,
            onlyUs: s.only_us,
        };
        onExecute(params);
    };

    if (loading) {
        return (
            <Paper withBorder p="md" radius="md">
                <Group justify="center" py="sm">
                    <Loader size="xs" color="orange" />
                </Group>
            </Paper>
        );
    }

    if (searches.length === 0) {
        return (
            <Paper withBorder p="md" radius="md" bg="rgba(255,255,255,0.8)">
                <Text size="xs" c="dimmed" ta="center">
                    {t("noSaved")}
                </Text>
            </Paper>
        );
    }

    return (
        <Paper
            withBorder
            radius="md"
            bg="rgba(255, 255, 255, 0.8)"
            style={{
                backdropFilter: "blur(10px)",
                overflow: "hidden",
            }}
        >
            <Stack gap={0}>
                {searches.map((s, i) => (
                    <Group
                        key={s.id}
                        px="md"
                        py="xs"
                        justify="space-between"
                        wrap="nowrap"
                        style={{
                            borderBottom: i < searches.length - 1 ? "1px solid var(--mantine-color-gray-2)" : undefined,
                            cursor: "pointer",
                            transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--mantine-color-gray-0)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                        {/* Main info */}
                        <Stack gap={2} style={{ flex: 1, minWidth: 0 }} onClick={() => handleSelect(s)}>
                            <Text size="sm" fw={600} truncate>
                                {s.keyword}
                            </Text>
                            <Group gap={4} wrap="nowrap">
                                {s.service && s.service !== "---" && (
                                    <Badge size="xs" variant="light" color="orange" radius="sm">
                                        {s.service.toUpperCase()} {s.grade != null ? s.grade : ""}
                                    </Badge>
                                )}
                                {s.listing_type && (
                                    <Badge size="xs" variant="light" color="gray" radius="sm">
                                        {s.listing_type === "auction" ? "Auction" : "Fixed"}
                                    </Badge>
                                )}
                                {s.exclude_jp && (
                                    <Badge size="xs" variant="light" color="red" radius="sm">
                                        {t("noJp")}
                                    </Badge>
                                )}
                                {s.only_us && (
                                    <Badge size="xs" variant="light" color="blue" radius="sm">
                                        {t("usOnly")}
                                    </Badge>
                                )}
                                {s.min_price != null && (
                                    <Badge size="xs" variant="outline" color="green" radius="sm">
                                        &gt; ${s.min_price}
                                    </Badge>
                                )}
                                {s.max_price != null && (
                                    <Badge size="xs" variant="outline" color="red" radius="sm">
                                        &lt; ${s.max_price}
                                    </Badge>
                                )}
                            </Group>
                        </Stack>

                        <Group gap={4} wrap="nowrap">
                            <Tooltip label={t("fetchNow")} withArrow>
                                <ActionIcon
                                    size="sm"
                                    variant="subtle"
                                    color="orange"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleExecute(s);
                                    }}
                                >
                                    <IconRefresh size={13} />
                                </ActionIcon>
                            </Tooltip>
                            <Tooltip label={t("delete")} withArrow>
                                <ActionIcon
                                    size="sm"
                                    variant="subtle"
                                    color="red"
                                    loading={deletingId === s.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(s.id);
                                    }}
                                >
                                    <IconTrash size={13} />
                                </ActionIcon>
                            </Tooltip>
                        </Group>
                    </Group>
                ))}
            </Stack>
        </Paper>
    );
}
