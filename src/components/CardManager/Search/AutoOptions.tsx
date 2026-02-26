"use client";

import { Group, Checkbox, Tooltip, ActionIcon, Text } from "@mantine/core";
import { IconMinus, IconPlus } from "@tabler/icons-react";

interface AutoOptionsProps {
    autoAdd?: boolean;
    onAutoAddChange?: (val: boolean) => void;
    autoCapture?: boolean;
    onAutoCaptureChange?: (val: boolean) => void;
    autoCaptureInterval?: number;
    onAutoCaptureIntervalChange?: (val: number) => void;
}

export function AutoOptions({
    autoAdd = false,
    onAutoAddChange,
    autoCapture = false,
    onAutoCaptureChange,
    autoCaptureInterval = 5,
    onAutoCaptureIntervalChange,
}: AutoOptionsProps) {
    if (!onAutoAddChange) return null;

    return (
        <Group justify="center" mt="xs" gap="md" wrap="nowrap">
            <Checkbox
                label="Auto-add to collection"
                checked={autoAdd}
                onChange={(e) => onAutoAddChange(e.currentTarget.checked)}
                size="sm"
                color="blue"
            />
            {onAutoCaptureChange && (
                <Group gap={4} wrap="nowrap" align="center">
                    <Tooltip
                        label="Turning on Auto-capture will also enable Auto-add to collection for a fully automated workflow."
                        position="bottom"
                        withArrow
                    >
                        <Checkbox
                            label="Auto-capture"
                            checked={autoCapture}
                            onChange={(e) =>
                                onAutoCaptureChange(e.currentTarget.checked)
                            }
                            size="sm"
                            color="blue"
                        />
                    </Tooltip>
                    <Group
                        gap={2}
                        wrap="nowrap"
                        ml={2}
                        bg={autoCapture ? "gray.0" : "gray.1"}
                        px={4}
                        style={{
                            borderRadius: "4px",
                            border: `1px solid ${autoCapture ? "var(--mantine-color-gray-2)" : "var(--mantine-color-gray-3)"}`,
                            opacity: autoCapture ? 1 : 0.6,
                            pointerEvents: autoCapture ? "all" : "none",
                        }}
                    >
                        <ActionIcon
                            variant="subtle"
                            color="blue"
                            size="xs"
                            onClick={() =>
                                onAutoCaptureIntervalChange?.(
                                    Math.max(5, autoCaptureInterval - 1),
                                )
                            }
                            disabled={!autoCapture || autoCaptureInterval <= 5}
                        >
                            <IconMinus size={10} stroke={3} />
                        </ActionIcon>
                        <Text
                            size="11px"
                            fw={700}
                            w={20}
                            ta="center"
                            c={autoCapture ? "blue.7" : "dimmed"}
                        >
                            {autoCaptureInterval}s
                        </Text>
                        <ActionIcon
                            variant="subtle"
                            color="blue"
                            size="xs"
                            onClick={() =>
                                onAutoCaptureIntervalChange?.(
                                    autoCaptureInterval + 1,
                                )
                            }
                            disabled={!autoCapture}
                        >
                            <IconPlus size={10} stroke={3} />
                        </ActionIcon>
                    </Group>
                </Group>
            )}
        </Group>
    );
}
