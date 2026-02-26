"use client";

import {
    Card,
    Group,
    Image,
    Stack,
    Text,
    ActionIcon,
    Box,
    Badge,
    Menu,
    Tooltip,
} from "@mantine/core";
import { IconTrash, IconPlus, IconMinus } from "@tabler/icons-react";

export const CONDITIONS = [
    { value: "NM", label: "Near Mint" },
    { value: "LP", label: "Lightly Played" },
    { value: "MP", label: "Moderately Played" },
    { value: "HP", label: "Heavily Played" },
    { value: "DMG", label: "Damaged" },
];
export const VARIANTS = ["NF", "F"];

export interface CollectedCard {
    id: number;
    cardId: number;
    collectionId?: number;
    name: string;
    imageUrl: string;
    cardNo: string;
    rarity: string;
    collectionName: string;
    franchise?: string;
    quantity: number;
    variant?: string;
    condition?: string;
}

interface CollectedCardProps {
    card: CollectedCard;
    onImageClick?: (url: string) => void;
    onUpdateQuantity: (id: number, newQuantity: number) => void;
    onUpdateCondition: (id: number, newCondition: string) => void;
    onUpdateVariant: (id: number, newVariant: string) => void;
    onDelete: (id: number) => void;
    onAddEntry: (card: CollectedCard) => void;
}

export function CollectedCard({
    card,
    onImageClick,
    onUpdateQuantity,
    onUpdateCondition,
    onUpdateVariant,
    onDelete,
    onAddEntry,
}: CollectedCardProps) {
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
                        w={60}
                        h={85}
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
                    <Text
                        size="xs"
                        fw={700}
                        lineClamp={1}
                        style={{ lineHeight: 1.2 }}
                    >
                        {card.name}
                    </Text>
                    <Text size="10px" c="dimmed" lineClamp={1}>
                        {card.franchise
                            ? `${card.franchise.toUpperCase()} • `
                            : ""}
                        {card.collectionName}
                    </Text>

                    <Group gap={6} mt={2} align="center">
                        <Text
                            size="10px"
                            fw={600}
                            c="blue.7"
                            bg="blue.0"
                            px={4}
                            style={{ borderRadius: "2px" }}
                        >
                            #{card.cardNo}
                        </Text>
                        <Text
                            size="10px"
                            fw={500}
                            bg="gray.1"
                            px={4}
                            style={{ borderRadius: "2px" }}
                        >
                            {card.rarity}
                        </Text>
                    </Group>

                    <Group gap={4} mt={4} align="center" wrap="nowrap">
                        <Group
                            gap={2}
                            wrap="nowrap"
                            bg="gray.1"
                            px={4}
                            py={2}
                            style={{ borderRadius: "4px" }}
                        >
                            <ActionIcon
                                size="xs"
                                variant="subtle"
                                color="gray"
                                onClick={() =>
                                    onUpdateQuantity(card.id, card.quantity - 1)
                                }
                                disabled={card.quantity <= 1}
                            >
                                <IconMinus size={10} />
                            </ActionIcon>
                            <Text size="10px" fw={700} w={14} ta="center">
                                {card.quantity}
                            </Text>
                            <ActionIcon
                                size="xs"
                                variant="subtle"
                                color="gray"
                                onClick={() =>
                                    onUpdateQuantity(card.id, card.quantity + 1)
                                }
                            >
                                <IconPlus size={10} />
                            </ActionIcon>
                        </Group>

                        <Menu shadow="md">
                            <Menu.Target>
                                <Badge
                                    size="9px"
                                    h={18}
                                    px={6}
                                    variant="outline"
                                    color="orange"
                                    style={{ cursor: "pointer" }}
                                >
                                    {card.variant || "NF"}
                                </Badge>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Label>Variant</Menu.Label>
                                {VARIANTS.map((v) => (
                                    <Menu.Item
                                        key={v}
                                        onClick={() =>
                                            onUpdateVariant(card.id, v)
                                        }
                                        style={{ fontSize: "10px" }}
                                    >
                                        {v === "NF" ? "Non-Foil" : "Foil"}
                                    </Menu.Item>
                                ))}
                            </Menu.Dropdown>
                        </Menu>

                        <Menu shadow="md">
                            <Menu.Target>
                                <Badge
                                    size="9px"
                                    h={18}
                                    px={6}
                                    variant="outline"
                                    color="gray"
                                    style={{ cursor: "pointer" }}
                                >
                                    {card.condition || "NM"}
                                </Badge>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Label>Condition</Menu.Label>
                                {CONDITIONS.map((cond) => (
                                    <Menu.Item
                                        key={cond.value}
                                        onClick={() =>
                                            onUpdateCondition(
                                                card.id,
                                                cond.value,
                                            )
                                        }
                                        style={{ fontSize: "10px" }}
                                    >
                                        {cond.label}
                                    </Menu.Item>
                                ))}
                            </Menu.Dropdown>
                        </Menu>
                    </Group>
                </Stack>
                <Stack gap={4}>
                    <Tooltip
                        label="Add new variant/condition entry"
                        position="left"
                        withArrow
                    >
                        <ActionIcon
                            variant="subtle"
                            color="green"
                            size="sm"
                            onClick={() => onAddEntry(card)}
                        >
                            <IconPlus size={14} />
                        </ActionIcon>
                    </Tooltip>
                    <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={() => onDelete(card.id)}
                    >
                        <IconTrash size={14} />
                    </ActionIcon>
                </Stack>
            </Group>
        </Card>
    );
}
