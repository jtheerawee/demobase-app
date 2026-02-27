"use client";

import { Badge, Group, Text, Title } from "@mantine/core";
import { IconTrendingUp } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

interface MarketTrendAnalysisHeaderProps {
    query?: string;
    service?: string;
    grade?: string;
    minPrice?: number | string;
    maxPrice?: number | string;
    excludeJp?: boolean;
    onlyUs?: boolean;
    listingType?: string;
}

export function MarketTrendAnalysisHeader({
    query,
    service,
    grade,
    minPrice,
    maxPrice,
    excludeJp,
    onlyUs,
    listingType,
}: MarketTrendAnalysisHeaderProps) {
    const t = useTranslations("EbayAssistance.analysis");

    return (
        <Group gap="xs">
            <IconTrendingUp size={20} color="#27AE60" />
            <Title
                order={5}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                }}
            >
                {t("title")}
                {query && (
                    <Badge
                        variant="light"
                        color="orange"
                        size="sm"
                        radius="sm"
                    >
                        {query}
                    </Badge>
                )}
                {service && service !== "---" && (
                    <Badge
                        variant="light"
                        color="orange"
                        size="sm"
                        radius="sm"
                    >
                        {service.toUpperCase()} {grade}
                    </Badge>
                )}
                {(minPrice || maxPrice) && (
                    <Badge
                        variant="light"
                        color="orange"
                        size="sm"
                        radius="sm"
                    >
                        ${minPrice || 0} - $
                        {maxPrice || "∞"}
                    </Badge>
                )}
                {excludeJp && (
                    <Badge
                        variant="light"
                        color="orange"
                        size="sm"
                        radius="sm"
                    >
                        {t("noJp")}
                    </Badge>
                )}
                {onlyUs && (
                    <Badge
                        variant="light"
                        color="orange"
                        size="sm"
                        radius="sm"
                    >
                        {t("usOnly")}
                    </Badge>
                )}
                {listingType && (
                    <Badge
                        variant="light"
                        color="orange"
                        size="sm"
                        radius="sm"
                    >
                        {listingType === "auction"
                            ? t("auctions")
                            : t("fixedPrice")}
                    </Badge>
                )}
            </Title>
        </Group>
    );
}
