"use client";

import { createClient } from "@/utils/supabase/client";
import {
    Anchor,
    Badge,
    Button,
    Card,
    Container,
    Grid,
    Group,
    Image,
    Loader,
    Stack,
    Text,
    TextInput,
    Title,
} from "@mantine/core";
import { useState } from "react";
import { ApiDebugPanel } from "@/components/EbayAssistance/ApiDebugPanel";

interface EbayItem {
    itemId: string;
    title: string;
    price: { value: string; currency: string };
    condition: string;
    conditionId: string;
    itemWebUrl: string;
    image: { imageUrl: string };
    seller: {
        username: string;
        feedbackPercentage: string;
        feedbackScore: number;
    };
    shippingOptions: {
        shippingServiceCode: string;
        shippingCost: { value: string; currency: string };
    }[];
}

export default function EbayPage() {
    const [itemId, setItemId] = useState("306761544440");
    const [item, setItem] = useState<EbayItem | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSearch() {
        const id = itemId.trim();
        if (!id) return;

        setLoading(true);
        setError("");
        setItem(null);

        try {
            const supabase = createClient();
            const {
                data: { session },
            } = await supabase.auth.getSession();

            const res = await fetch(
                `/api/ebay/${encodeURIComponent(id)}`,
                {
                    headers: {
                        Authorization: `Bearer ${session?.access_token ?? ""}`,
                    },
                },
            );

            if (!res.ok) {
                const body = await res
                    .json()
                    .catch(() => ({}));
                throw new Error(
                    body.error ?? `Error ${res.status}`,
                );
            }

            setItem(await res.json());
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unknown error",
            );
        } finally {
            setLoading(false);
        }
    }

    const shipping = item?.shippingOptions?.[0];

    return (
        <Container size="lg" py="xl">
            <Stack gap="xl">
                <Title order={1}>eBay</Title>

                <Group align="flex-end">
                    <TextInput
                        label="Item ID"
                        placeholder="e.g. 306761544440"
                        value={itemId}
                        onChange={(e) =>
                            setItemId(e.currentTarget.value)
                        }
                        onKeyDown={(e) =>
                            e.key === "Enter" &&
                            handleSearch()
                        }
                        style={{ flex: 1 }}
                    />
                    <Button
                        onClick={handleSearch}
                        loading={loading}
                    >
                        Search
                    </Button>
                </Group>

                {error && (
                    <Text c="red" size="sm">
                        {error}
                    </Text>
                )}

                {loading && (
                    <Group justify="center" py="xl">
                        <Loader />
                    </Group>
                )}

                {item &&
                    process.env
                        .NEXT_PUBLIC_DEVELOPER_MODE ===
                        "true" && (
                        <ApiDebugPanel
                            data={item}
                            label={`GET /api/ebay/${item.itemId}`}
                        />
                    )}

                {item && (
                    <Card
                        withBorder
                        radius="md"
                        padding="xl"
                    >
                        <Grid gutter="xl">
                            <Grid.Col
                                span={{ base: 12, sm: 4 }}
                            >
                                <Image
                                    src={
                                        item.image?.imageUrl
                                    }
                                    alt={item.title}
                                    radius="md"
                                    fallbackSrc="https://placehold.co/300x300?text=No+Image"
                                />
                            </Grid.Col>

                            <Grid.Col
                                span={{ base: 12, sm: 8 }}
                            >
                                <Stack gap="sm">
                                    <Anchor
                                        href={
                                            item.itemWebUrl
                                        }
                                        target="_blank"
                                        size="lg"
                                        fw={600}
                                    >
                                        {item.title}
                                    </Anchor>

                                    <Group gap="sm">
                                        <Text
                                            size="xl"
                                            fw={700}
                                        >
                                            {
                                                item.price
                                                    .currency
                                            }{" "}
                                            {
                                                item.price
                                                    .value
                                            }
                                        </Text>
                                        <Badge variant="light">
                                            {item.condition}
                                        </Badge>
                                    </Group>

                                    <Stack gap={4}>
                                        <Text
                                            size="sm"
                                            c="dimmed"
                                            fw={600}
                                        >
                                            Seller
                                        </Text>
                                        <Text size="sm">
                                            {
                                                item.seller
                                                    .username
                                            }{" "}
                                            ·{" "}
                                            {
                                                item.seller
                                                    .feedbackPercentage
                                            }
                                            % positive (
                                            {item.seller.feedbackScore.toLocaleString()}{" "}
                                            feedback)
                                        </Text>
                                    </Stack>

                                    {shipping && (
                                        <Stack gap={4}>
                                            <Text
                                                size="sm"
                                                c="dimmed"
                                                fw={600}
                                            >
                                                Shipping
                                            </Text>
                                            <Text size="sm">
                                                {
                                                    shipping.shippingServiceCode
                                                }{" "}
                                                ·{" "}
                                                {Number(
                                                    shipping
                                                        .shippingCost
                                                        .value,
                                                ) === 0
                                                    ? "Free"
                                                    : `${shipping.shippingCost.currency} ${shipping.shippingCost.value}`}
                                            </Text>
                                        </Stack>
                                    )}

                                    <Text
                                        size="xs"
                                        c="dimmed"
                                        mt="xs"
                                    >
                                        ID: {item.itemId}
                                    </Text>
                                </Stack>
                            </Grid.Col>
                        </Grid>
                    </Card>
                )}
            </Stack>
        </Container>
    );
}
