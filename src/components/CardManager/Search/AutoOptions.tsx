"use client";

import {
    ActionIcon,
    Checkbox,
    Group,
    Stack,
    Text,
    Tooltip,
} from "@mantine/core";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { OCR_CONFIG } from "@/constants/ocr";

interface AutoOptionsProps {
    autoAdd?: boolean;
    onAutoAddChange?: (val: boolean) => void;
    autoCapture?: boolean;
    onAutoCaptureChange?: (val: boolean) => void;
    manualCaptureDelay?: number;
    onManualCaptureDelayChange?: (val: number) => void;
    autoCaptureDelay?: number;
    onAutoCaptureDelayChange?: (val: number) => void;
}

function DelayStepper({
    label,
    tooltip,
    value,
    min,
    disabled,
    onChange,
}: {
    label: string;
    tooltip?: string;
    value: number;
    min: number;
    disabled: boolean;
    onChange: (val: number) => void;
}) {
    return (
        <Tooltip
            label={tooltip}
            position="top"
            withArrow
            disabled={!tooltip}
        >
            <Stack gap={2} align="center">
                <Text
                    size="xs"
                    c={disabled ? "dimmed" : "dark"}
                >
                    {label}
                </Text>
                <Group
                    gap={2}
                    wrap="nowrap"
                    bg={disabled ? "gray.1" : "gray.0"}
                    px={4}
                    py={2}
                    style={{
                        borderRadius: "4px",
                        border: `1px solid ${disabled ? "var(--mantine-color-gray-3)" : "var(--mantine-color-gray-2)"}`,
                        opacity: disabled ? 0.6 : 1,
                        pointerEvents: disabled
                            ? "none"
                            : "all",
                    }}
                >
                    <ActionIcon
                        variant="subtle"
                        color="blue"
                        size="xs"
                        onClick={() =>
                            onChange(
                                Math.max(min, value - 1),
                            )
                        }
                        disabled={disabled || value <= min}
                    >
                        <IconMinus size={10} stroke={3} />
                    </ActionIcon>
                    <Text
                        size="11px"
                        fw={700}
                        w={20}
                        ta="center"
                        c={disabled ? "dimmed" : "blue.7"}
                    >
                        {value}s
                    </Text>
                    <ActionIcon
                        variant="subtle"
                        color="blue"
                        size="xs"
                        onClick={() => onChange(value + 1)}
                        disabled={disabled}
                    >
                        <IconPlus size={10} stroke={3} />
                    </ActionIcon>
                </Group>
            </Stack>
        </Tooltip>
    );
}

export function AutoOptions({
    autoAdd = false,
    onAutoAddChange,
    autoCapture = false,
    onAutoCaptureChange,
    manualCaptureDelay = OCR_CONFIG.MANUAL_CAPTURE_DELAY,
    onManualCaptureDelayChange,
    autoCaptureDelay = OCR_CONFIG.AUTO_CAPTURE_DELAY,
    onAutoCaptureDelayChange,
}: AutoOptionsProps) {
    if (!onAutoAddChange) return null;

    return (
        <Group
            justify="center"
            mt="xs"
            gap="md"
            wrap="nowrap"
            align="flex-end"
        >
            {onManualCaptureDelayChange && (
                <DelayStepper
                    label="Manual delay"
                    tooltip="Countdown before each manual scan (when Auto-capture is off)"
                    value={manualCaptureDelay}
                    min={OCR_CONFIG.MANUAL_CAPTURE_DELAY}
                    disabled={false}
                    onChange={onManualCaptureDelayChange}
                />
            )}
            <Tooltip
                label="Automatically add the detected card to your collection after each scan"
                position="bottom"
                withArrow
            >
                <Checkbox
                    label="Auto-add to collection"
                    checked={autoAdd}
                    onChange={(e) =>
                        onAutoAddChange(
                            e.currentTarget.checked,
                        )
                    }
                    size="sm"
                    color="blue"
                />
            </Tooltip>
            {onAutoCaptureChange && (
                <>
                    <Tooltip
                        label="Turning on Auto-capture will also enable Auto-add to collection for a fully automated workflow."
                        position="bottom"
                        withArrow
                    >
                        <Checkbox
                            label="Auto-capture"
                            checked={autoCapture}
                            onChange={(e) =>
                                onAutoCaptureChange(
                                    e.currentTarget.checked,
                                )
                            }
                            size="sm"
                            color="blue"
                        />
                    </Tooltip>
                    {onAutoCaptureDelayChange && (
                        <Tooltip
                            label="Wait time between each auto-capture cycle"
                            position="top"
                            withArrow
                        >
                            <Stack gap={2} align="center">
                                <Text
                                    size="xs"
                                    c={
                                        !autoCapture
                                            ? "dimmed"
                                            : "dark"
                                    }
                                >
                                    Auto delay
                                </Text>
                                <Group
                                    gap={2}
                                    wrap="nowrap"
                                    bg={
                                        !autoCapture
                                            ? "gray.1"
                                            : "gray.0"
                                    }
                                    px={4}
                                    py={2}
                                    style={{
                                        borderRadius: "4px",
                                        border: `1px solid ${!autoCapture ? "var(--mantine-color-gray-3)" : "var(--mantine-color-gray-2)"}`,
                                        opacity:
                                            !autoCapture
                                                ? 0.6
                                                : 1,
                                        pointerEvents:
                                            !autoCapture
                                                ? "none"
                                                : "all",
                                    }}
                                >
                                    <ActionIcon
                                        variant="subtle"
                                        color="blue"
                                        size="xs"
                                        onClick={() =>
                                            onAutoCaptureDelayChange(
                                                Math.max(
                                                    OCR_CONFIG.AUTO_CAPTURE_DELAY,
                                                    autoCaptureDelay -
                                                        1,
                                                ),
                                            )
                                        }
                                        disabled={
                                            !autoCapture ||
                                            autoCaptureDelay <=
                                                OCR_CONFIG.AUTO_CAPTURE_DELAY
                                        }
                                    >
                                        <IconMinus
                                            size={10}
                                            stroke={3}
                                        />
                                    </ActionIcon>
                                    <Text
                                        size="11px"
                                        fw={700}
                                        w={20}
                                        ta="center"
                                        c={
                                            !autoCapture
                                                ? "dimmed"
                                                : "blue.7"
                                        }
                                    >
                                        {autoCaptureDelay}s
                                    </Text>
                                    <ActionIcon
                                        variant="subtle"
                                        color="blue"
                                        size="xs"
                                        onClick={() =>
                                            onAutoCaptureDelayChange(
                                                autoCaptureDelay +
                                                    1,
                                            )
                                        }
                                        disabled={
                                            !autoCapture
                                        }
                                    >
                                        <IconPlus
                                            size={10}
                                            stroke={3}
                                        />
                                    </ActionIcon>
                                </Group>
                            </Stack>
                        </Tooltip>
                    )}
                </>
            )}
        </Group>
    );
}
