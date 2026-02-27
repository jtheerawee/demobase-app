"use client";

import {
    Button,
    Group,
    Image,
    Modal,
    Select,
    Stack,
    Text,
} from "@mantine/core";
import { CONDITIONS } from "@/constants/conditions";
import { VARIANTS } from "@/constants/variants";
import type { CollectedCard } from "./CollectedCard";

interface AddNewCardModalProps {
    card: CollectedCard | null;
    onClose: () => void;
    variant: string;
    onVariantChange: (value: string) => void;
    condition: string;
    onConditionChange: (value: string) => void;
    onAdd: () => void;
    adding: boolean;
    onImageClick?: (url: string) => void;
}

export function AddNewCardModal({
    card,
    onClose,
    variant,
    onVariantChange,
    condition,
    onConditionChange,
    onAdd,
    adding,
    onImageClick,
}: AddNewCardModalProps) {
    return (
        <Modal
            opened={!!card}
            onClose={onClose}
            title="Add Variant / Condition"
            centered
            size="sm"
            overlayProps={{
                backgroundOpacity: 0.45,
                blur: 3,
            }}
        >
            {card && (
                <Stack gap="md">
                    <Group gap="md" wrap="nowrap">
                        <Image
                            src={card.imageUrl}
                            w={50}
                            h={70}
                            radius="xs"
                            style={{
                                objectFit: "contain",
                                flexShrink: 0,
                                cursor: onImageClick
                                    ? "pointer"
                                    : "default",
                            }}
                            onClick={() =>
                                onImageClick?.(
                                    card.imageUrl,
                                )
                            }
                        />
                        <Stack gap={4}>
                            <Text fw={700} size="sm">
                                {card.name}
                            </Text>
                            <Text size="xs" c="dimmed">
                                {card.collectionName}
                            </Text>
                            <Group gap={6}>
                                <Text
                                    size="xs"
                                    fw={600}
                                    c="blue.7"
                                    bg="blue.0"
                                    px={4}
                                    style={{
                                        borderRadius: "2px",
                                    }}
                                >
                                    #{card.cardNo}
                                </Text>
                                <Text
                                    size="xs"
                                    fw={500}
                                    bg="gray.1"
                                    px={4}
                                    style={{
                                        borderRadius: "2px",
                                    }}
                                >
                                    {card.rarity}
                                </Text>
                            </Group>
                        </Stack>
                    </Group>
                    <Select
                        label="Variant"
                        value={variant}
                        onChange={(v) =>
                            onVariantChange(v || "nf")
                        }
                        data={VARIANTS}
                        size="sm"
                    />
                    <Select
                        label="Condition"
                        value={condition}
                        onChange={(v) =>
                            onConditionChange(v || "nm")
                        }
                        data={CONDITIONS}
                        size="sm"
                    />
                    <Group justify="flex-end" gap="xs">
                        <Button
                            variant="default"
                            size="sm"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            color="green"
                            loading={adding}
                            onClick={onAdd}
                        >
                            Add Entry
                        </Button>
                    </Group>
                </Stack>
            )}
        </Modal>
    );
}
