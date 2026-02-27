"use client";

import {
    ActionIcon,
    Badge,
    Group,
    Menu,
    Text,
    Tooltip,
} from "@mantine/core";
import {
    IconExternalLink,
    IconMinus,
    IconPlus,
    IconTrash,
} from "@tabler/icons-react";
import { CONDITIONS } from "@/constants/conditions";
import { VARIANTS } from "@/constants/variants";
import { BaseCard } from "../BaseCard";

export interface CollectedCard {
    id: number;
    cardId: number;
    collectionId?: number;
    name: string;
    imageUrl: string;
    cardUrl?: string;
    cardNo: string;
    rarity: string;
    collectionName: string;
    collectionCode?: string;
    franchise?: string;
    quantity: number;
    variant?: string;
    condition?: string;
}

interface CollectedCardProps {
    card: CollectedCard;
    onImageClick?: (url: string) => void;
    onUpdateQuantity: (
        id: number,
        newQuantity: number,
    ) => void;
    onUpdateCondition: (
        id: number,
        newCondition: string,
    ) => void;
    onUpdateVariant: (
        id: number,
        newVariant: string,
    ) => void;
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
        <BaseCard
            card={{
                name: card.name,
                imageUrl: card.imageUrl,
                cardNo: card.cardNo || "",
                rarity: card.rarity || "",
                collectionName: card.collectionName || "",
                collectionCode: card.collectionCode || "",
                franchise: card.franchise || "",
            }}
            onImageClick={onImageClick}
            bottomLeftActions={
                <>
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
                                onUpdateQuantity(
                                    card.id,
                                    card.quantity - 1,
                                )
                            }
                            disabled={card.quantity <= 1}
                        >
                            <IconMinus size={10} />
                        </ActionIcon>
                        <Text
                            size="10px"
                            fw={700}
                            w={14}
                            ta="center"
                        >
                            {card.quantity}
                        </Text>
                        <ActionIcon
                            size="xs"
                            variant="subtle"
                            color="gray"
                            onClick={() =>
                                onUpdateQuantity(
                                    card.id,
                                    card.quantity + 1,
                                )
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
                                style={{
                                    cursor: "pointer",
                                }}
                            >
                                {(
                                    card.variant || "nf"
                                ).toUpperCase()}
                            </Badge>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Label>Variant</Menu.Label>
                            {VARIANTS.map((v) => (
                                <Menu.Item
                                    key={v.value}
                                    onClick={() =>
                                        onUpdateVariant(
                                            card.id,
                                            v.value,
                                        )
                                    }
                                    style={{
                                        fontSize: "10px",
                                    }}
                                >
                                    {v.label}
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
                                style={{
                                    cursor: "pointer",
                                }}
                            >
                                {(
                                    card.condition || "nm"
                                ).toUpperCase()}
                            </Badge>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Label>
                                Condition
                            </Menu.Label>
                            {CONDITIONS.map((cond) => (
                                <Menu.Item
                                    key={cond.value}
                                    onClick={() =>
                                        onUpdateCondition(
                                            card.id,
                                            cond.value,
                                        )
                                    }
                                    style={{
                                        fontSize: "10px",
                                    }}
                                >
                                    {cond.label}
                                </Menu.Item>
                            ))}
                        </Menu.Dropdown>
                    </Menu>
                </>
            }
            rightActions={
                <>
                    {card.cardUrl && (
                        <ActionIcon
                            variant="subtle"
                            color="blue"
                            size="sm"
                            component="a"
                            href={card.cardUrl}
                            target="_blank"
                        >
                            <IconExternalLink size={14} />
                        </ActionIcon>
                    )}
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
                </>
            }
        />
    );
}
