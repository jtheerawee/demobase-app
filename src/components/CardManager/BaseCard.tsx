"use client";

import { Box, Card, Group, Image, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

export interface BaseCardData {
    name: string;
    imageUrl: string;
    cardNo: string;
    rarity: string;
    collectionName: string;
    collectionCode: string;
    franchise: string;
}

export interface BaseCardProps {
    card: BaseCardData;
    onImageClick?: (url: string) => void;
    topRightActions?: ReactNode;
    rightActions?: ReactNode;
    bottomLeftActions?: ReactNode;
}

export function BaseCard({ card, onImageClick, topRightActions, rightActions, bottomLeftActions }: BaseCardProps) {
    return (
        <Card
            shadow="none"
            withBorder={false}
            padding={0}
            style={{
                transition: "background-color 0.2s ease",
                cursor: "default",
                backgroundColor: "transparent",
            }}
            className="base-card-item"
        >
            <Group gap="sm" wrap="nowrap" align="center" px="sm" py="sm">
                <Box
                    w={85}
                    style={{
                        display: "flex",
                        justifyContent: "center",
                    }}
                >
                    <Image
                        src={card.imageUrl}
                        fallbackSrc="https://placehold.co/100x140?text=No+Image"
                        w={80}
                        h={112}
                        radius="xs"
                        style={{
                            objectFit: "contain",
                            cursor: "pointer",
                            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
                        }}
                        onClick={() => onImageClick?.(card.imageUrl)}
                    />
                </Box>

                <Stack
                    gap={2}
                    style={{
                        flex: 1,
                        minWidth: 0,
                        height: "100%",
                        justifyContent: "center",
                    }}
                >
                    <Group justify="space-between" wrap="nowrap" gap={4}>
                        <Text size="xs" fw={700} lineClamp={1} style={{ lineHeight: 1.2 }}>
                            {card.name}
                        </Text>
                        {topRightActions && <Group gap={2}>{topRightActions}</Group>}
                    </Group>

                    <Text size="10px" c="dimmed" lineClamp={1}>
                        {card.franchise ? `${card.franchise.toUpperCase()} • ` : ""}
                        {card.collectionName}
                    </Text>

                    <Group gap={6} mt={2} align="center">
                        {card.collectionCode && (
                            <Text
                                size="10px"
                                fw={600}
                                c="grape.7"
                                bg="grape.0"
                                px={4}
                                style={{
                                    borderRadius: "2px",
                                }}
                            >
                                {card.collectionCode}
                            </Text>
                        )}
                        <Text size="10px" fw={600} c="blue.7" bg="blue.0" px={4} style={{ borderRadius: "2px" }}>
                            #{card.cardNo || "---"}
                        </Text>
                        <Text size="10px" fw={500} bg="gray.1" px={4} style={{ borderRadius: "2px" }}>
                            {card.rarity || "---"}
                        </Text>
                    </Group>

                    {bottomLeftActions && (
                        <Group gap={4} mt={4} align="center" wrap="nowrap">
                            {bottomLeftActions}
                        </Group>
                    )}
                </Stack>

                {rightActions && (
                    <Stack
                        gap={4}
                        pt={5}
                        style={{
                            height: "100%",
                            justifyContent: "flex-start",
                        }}
                    >
                        {rightActions}
                    </Stack>
                )}
            </Group>
        </Card>
    );
}
