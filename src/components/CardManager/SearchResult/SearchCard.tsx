"use client";

import {
    Card,
    Group,
    Image,
    Stack,
    Text,
    ActionIcon,
    Box,
    Tooltip,
} from "@mantine/core";
import { IconExternalLink, IconPlus } from "@tabler/icons-react";
import { SearchedCard } from "./SearchResultWidget";

interface SearchCardProps {
    card: SearchedCard;
    addingId: number | null;
    collectedCardIds: Set<number>;
    onAddToCollection: (card: SearchedCard) => void;
    onImageClick: (url: string) => void;
}

export function SearchCard({
    card,
    addingId,
    collectedCardIds,
    onAddToCollection,
    onImageClick,
}: SearchCardProps) {
    const isCollected = collectedCardIds.has(card.id);

    return (
        <Card
            withBorder
            padding="xs"
            radius="sm"
            h={115}
            style={{
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                cursor: "default",
            }}
        >
            <Group gap="sm" wrap="nowrap" h="100%" align="center">
                <Box
                    w={65}
                    style={{ display: "flex", justifyContent: "center" }}
                >
                    <Image
                        src={card.imageUrl}
                        fallbackSrc="https://placehold.co/100x140?text=No+Image"
                        w={60}
                        h={85}
                        radius="xs"
                        style={{
                            objectFit: "contain",
                            cursor: "pointer",
                            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
                        }}
                        onClick={() => onImageClick(card.imageUrl)}
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
                        <Text
                            size="xs"
                            fw={700}
                            lineClamp={1}
                            style={{ lineHeight: 1.2 }}
                        >
                            {card.name}
                        </Text>
                        <Group gap={2}>
                            <ActionIcon
                                variant="subtle"
                                color="blue"
                                size="xs"
                                component="a"
                                href={card.cardUrl}
                                target="_blank"
                            >
                                <IconExternalLink size={12} />
                            </ActionIcon>
                            <Tooltip
                                label={
                                    isCollected
                                        ? "Already in your collection"
                                        : "Add to collection"
                                }
                                position="top"
                                withArrow
                            >
                                <ActionIcon
                                    variant="light"
                                    color={isCollected ? "gray" : "green"}
                                    size="xs"
                                    disabled={isCollected}
                                    onClick={() => onAddToCollection(card)}
                                    loading={addingId === card.id}
                                >
                                    <IconPlus size={12} />
                                </ActionIcon>
                            </Tooltip>
                        </Group>
                    </Group>

                    <Text size="10px" c="dimmed" lineClamp={1}>
                        {card.collectionName}
                    </Text>

                    <Group gap={6} mt={2} align="center">
                        <Text
                            size="10px"
                            fw={600}
                            c="grape.7"
                            bg="grape.0"
                            px={4}
                            style={{ borderRadius: "2px" }}
                        >
                            {card.collectionCode || "---"}
                        </Text>
                        <Text
                            size="10px"
                            fw={600}
                            c="blue.7"
                            bg="blue.0"
                            px={4}
                            style={{ borderRadius: "2px" }}
                        >
                            #{card.cardNo || "---"}
                        </Text>
                        <Text
                            size="10px"
                            fw={500}
                            bg="gray.1"
                            px={4}
                            style={{ borderRadius: "2px" }}
                        >
                            {card.rarity || "---"}
                        </Text>
                    </Group>
                </Stack>
            </Group>
        </Card>
    );
}
