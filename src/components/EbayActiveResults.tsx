"use client";

import {
    ActionIcon,
    Badge,
    Button,
    Card,
    Center,
    Group,
    Image,
    Code,
    SimpleGrid,
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

interface EbayActiveResultsProps {
    results: EbayItem[];
    loadingMore: boolean;
    onLoadMore: () => void;
    cols?: number;
}

export function EbayActiveResults({
    results,
    loadingMore,
    onLoadMore,
    cols = 4,
}: EbayActiveResultsProps) {
    if (results.length === 0) return null;

    return (
        <>
            <SimpleGrid cols={{ base: 1, sm: 2, md: cols }} spacing="lg">
                {results.map((item, index) => {
                    const dateStr = item.endTime || (item as any).soldTime || (item as any).soldDate || (item as any).timestamp;
                    const timeLeft = getTimeLeft(dateStr);
                    return (
                        <Tooltip
                            key={`${item.id}-${index}`}
                            label={
                                <div style={{ fontSize: 9, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
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
                                    padding="sm"
                                    radius="md"
                                    withBorder
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        transition: "transform 0.2s ease",
                                        cursor: "pointer",
                                        height: "100%",
                                    }}
                                    className="ebay-card"
                                    onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-5px)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                                >
                                    <Card.Section>
                                        <Center bg="gray.0" h={250} style={{ overflow: "hidden" }}>
                                            <Image
                                                src={item.imageUrl}
                                                alt={item.title}
                                                fit="contain"
                                                height="100%"
                                                fallbackSrc="https://via.placeholder.com/200x250?text=No+Image"
                                                p="xs"
                                            />
                                        </Center>
                                    </Card.Section>

                                    <Stack mt="md" gap="xs" style={{ flex: 1 }}>
                                        <Group justify="flex-end" gap="xs">
                                            {timeLeft && (
                                                <Badge
                                                    color={
                                                        timeLeft.includes("left") && !timeLeft.includes("d")
                                                            ? "red"
                                                            : "gray"
                                                    }
                                                    variant="filled"
                                                    size="xs"
                                                >
                                                    {timeLeft}
                                                </Badge>
                                            )}
                                        </Group>
                                        <Text fw={600} size="sm" lineClamp={2} style={{ height: 40 }}>
                                            {item.title}
                                        </Text>

                                        <Group justify="space-between" align="center" mt="auto">
                                            <Stack gap={0}>
                                                <Text size="xs" c="dimmed" fw={700}>
                                                    PRICE
                                                </Text>
                                                <Text fw={900} size="lg" color="orange.9">
                                                    {item.currency} {item.price}
                                                </Text>
                                            </Stack>
                                            <ActionIcon
                                                color="blue"
                                                variant="light"
                                                component="a"
                                                href={item.itemUrl}
                                                target="_blank"
                                                radius="xl"
                                                size="lg"
                                            >
                                                <IconExternalLink size={20} />
                                            </ActionIcon>
                                        </Group>
                                    </Stack>
                                </Card>
                            </div>
                        </Tooltip>
                    );
                })}
            </SimpleGrid>

            <Center mt="xl">
                <Button
                    variant="subtle"
                    color="orange"
                    onClick={onLoadMore}
                    loading={loadingMore}
                    size="lg"
                    radius="md"
                >
                    Load More Results
                </Button>
            </Center>
        </>
    );
}
