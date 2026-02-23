"use client";

import {
    ActionIcon,
    Anchor,
    Badge,
    Card,
    Center,
    Group,
    Image,
    Stack,
    Text,
    Tooltip,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import type { EbayItem } from "@/services/ebayService";

const getTimeLeft = (endTime?: string) => {
    if (!endTime) return null;
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) {
        const date = new Date(endTime);
        return `Ended: ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${mins}m left`;
};

interface EbayItemCardProps {
    item: EbayItem;
    index: number;
    onHover?: (date: string | null) => void;
}

export function EbayItemCard({ item, index, onHover }: EbayItemCardProps) {
    const dateStr =
        item.endDate ||
        (item as any).soldTime ||
        (item as any).soldDate ||
        (item as any).timestamp;
    const timeLeft = getTimeLeft(dateStr);

    // Format date string to match chart's fullDate key (YYYY-MM-DD)
    const chartDateKey = dateStr
        ? new Date(dateStr).toISOString().split("T")[0]
        : null;

    const isShowTooltip = process.env.NEXT_PUBLIC_SHOW_TOOLTIP === "true";

    return (
        <Tooltip
            key={item.itemId ? `${item.itemId}-${index}` : index}
            disabled={!isShowTooltip}
            label={
                <div
                    style={{
                        fontSize: 9,
                        whiteSpace: "pre-wrap",
                        fontFamily: "monospace",
                    }}
                >
                    {JSON.stringify(item, null, 2)}
                </div>
            }
            multiline
            w={500}
            position="top"
            openDelay={200}
            withinPortal
            p="md"
        >
            <div style={{ height: "100%" }}>
                <Card
                    shadow="sm"
                    padding="md"
                    radius="lg"
                    withBorder
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        transition: "all 0.3s ease",
                        cursor: "pointer",
                        height: "100%",
                        backgroundColor: "white",
                        overflow: "hidden",
                    }}
                    className="ebay-card"
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-8px)";
                        e.currentTarget.style.boxShadow =
                            "var(--mantine-shadow-xl)";
                        if (onHover && chartDateKey) onHover(chartDateKey);
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                            "var(--mantine-shadow-sm)";
                        if (onHover) onHover(null);
                    }}
                >
                    <Card.Section pos="relative">
                        <Center
                            bg="gray.0"
                            h={250}
                            style={{ overflow: "hidden" }}
                        >
                            <Image
                                src={item.imageUrl}
                                alt={item.title}
                                fit="contain"
                                height="100%"
                                fallbackSrc="https://via.placeholder.com/200x250?text=No+Image"
                                p="md"
                            />
                        </Center>

                        {/* Floating Action Top-Right */}
                        <Group pos="absolute" top={12} right={12} gap={6}>
                            {timeLeft && (
                                <Badge
                                    color={
                                        timeLeft.includes("left") &&
                                        !timeLeft.includes("d")
                                            ? "red"
                                            : "blue"
                                    }
                                    variant="filled"
                                    size="xs"
                                    radius="sm"
                                    style={{
                                        backdropFilter: "blur(4px)",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                                    }}
                                >
                                    {timeLeft}
                                </Badge>
                            )}
                            <ActionIcon
                                color="blue"
                                variant="white"
                                component="a"
                                href={item.itemUrl}
                                target="_blank"
                                radius="md"
                                size="md"
                                style={{
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <IconExternalLink size={16} />
                            </ActionIcon>
                        </Group>
                    </Card.Section>

                    <Stack mt="md" gap="sm" style={{ flex: 1 }}>
                        <Text
                            fw={700}
                            size="sm"
                            lineClamp={2}
                            style={{ height: 40, lineHeight: 1.4 }}
                        >
                            {item.title}
                        </Text>

                        {/* Grade Info Box - Only for Supported Services */}
                        {(() => {
                            if (
                                !item.gradeInfo?.certNumber ||
                                !item.gradeInfo?.grader
                            )
                                return null;

                            const grader =
                                item.gradeInfo.grader?.toUpperCase() || "";
                            const cert = item.gradeInfo.certNumber;
                            const isSupported =
                                grader.includes("PSA") ||
                                grader.includes("CGC") ||
                                grader.includes("BGS") ||
                                grader.includes("BECKETT") ||
                                grader.includes("SGC");

                            if (!isSupported) return null;

                            let certUrl = "";
                            if (grader.includes("CGC"))
                                certUrl = `https://www.cgccards.com/certlookup/${cert}/`;
                            else if (
                                grader.includes("BGS") ||
                                grader.includes("BECKETT")
                            )
                                certUrl = `https://www.beckett.com/grading/card-lookup?item_id=${cert}&item_type=BGS`;
                            else if (grader.includes("PSA"))
                                certUrl = `https://www.psacard.com/cert/${cert}/psa`;
                            else if (grader.includes("SGC"))
                                certUrl = `https://www.gosgc.com/cert-code-lookup`;

                            return (
                                <Group
                                    gap="xs"
                                    bg="gray.1"
                                    px="sm"
                                    py={6}
                                    justify="space-between"
                                    style={{
                                        border: "1px solid var(--mantine-color-gray-3)",
                                        borderRadius:
                                            "var(--mantine-radius-md)",
                                    }}
                                >
                                    <Text
                                        size="xs"
                                        c="dimmed"
                                        fw={800}
                                        tt="uppercase"
                                    >
                                        {item.gradeInfo.grader}
                                    </Text>
                                    <Anchor
                                        href={certUrl}
                                        target="_blank"
                                        size="xs"
                                        fw={700}
                                        c="blue"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        #{cert}
                                    </Anchor>
                                </Group>
                            );
                        })()}

                        <Group
                            justify="space-between"
                            align="flex-end"
                            mt="auto"
                        >
                            <Stack gap={0}>
                                <Group gap={6} align="baseline">
                                    <Text
                                        fw={900}
                                        size="xl"
                                        color="orange.9"
                                        style={{ lineHeight: 1 }}
                                    >
                                        {item.price}
                                    </Text>
                                    <Text size="xs" fw={700} c="dimmed">
                                        {item.currency}
                                    </Text>
                                    {item.bids !== null &&
                                        item.bids !== undefined && (
                                            <Badge
                                                variant="light"
                                                color="gray"
                                                size="xs"
                                            >
                                                {item.bids} Bids
                                            </Badge>
                                        )}
                                </Group>
                                {item.currency === "USD" && (
                                    <Text size="xs" c="dimmed" fw={600} mt={2}>
                                        ≈ ฿
                                        {(
                                            parseFloat(
                                                item.price.replace(/,/g, ""),
                                            ) * 35
                                        ).toLocaleString(undefined, {
                                            maximumFractionDigits: 0,
                                        })}{" "}
                                        THB
                                    </Text>
                                )}
                            </Stack>

                            {item.itemLocation && (
                                <Text
                                    size="10px"
                                    c="dimmed"
                                    ta="right"
                                    style={{ maxWidth: 80, lineHeight: 1.2 }}
                                >
                                    {item.itemLocation}
                                </Text>
                            )}
                        </Group>
                    </Stack>
                </Card>
            </div>
        </Tooltip>
    );
}
