"use client";

import {
    ActionIcon,
    Badge,
    Box,
    Card,
    CopyButton,
    Group,
    ScrollArea,
    Stack,
    Text,
    Tooltip,
} from "@mantine/core";
import {
    IconAlertCircle,
    IconCheck,
    IconCircleCheck,
    IconCircleDashed,
    IconCopy,
    IconLoader2,
    IconPlayerStop,
} from "@tabler/icons-react";
import { useState } from "react";

import { APP_CONFIG } from "@/constants/app";

interface Step {
    id: string | number;
    message: string;
    status: "pending" | "running" | "completed" | "error";
    timestamp: string;
}

interface CardScraperRunningStepsProps {
    steps?: Step[];
    onStop?: () => void;
}

export function CardScraperRunningSteps({
    steps = [],
    onStop,
}: CardScraperRunningStepsProps) {
    const [copiedId, setCopiedId] = useState<string | number | null>(null);

    const handleCopy = (step: Step) => {
        navigator.clipboard.writeText(`[${step.timestamp}] ${step.message}`);
        setCopiedId(step.id);
        setTimeout(() => setCopiedId(null), 1500);
    };

    // Filter "Deep scraping card" steps to keep only the latest one
    const lastDeepScrapeIdx = steps.reduce((lastIdx, step, idx) => {
        if (step.message.startsWith("Deep scraping card")) {
            return idx;
        }
        return lastIdx;
    }, -1);

    const filteredSteps = steps
        .filter((step, idx) => {
            if (step.message.startsWith("Deep scraping card")) {
                return idx === lastDeepScrapeIdx;
            }
            return true;
        })
        .slice(-APP_CONFIG.SCRAPER_RUNNING_STEPS_LIMIT);

    return (
        <Card withBorder radius="md" padding="md" shadow="sm">
            <Stack gap="sm">
                <Group justify="space-between">
                    <Text fw={600} size="sm">
                        Running Steps
                    </Text>
                    <Group gap="xs">
                        {filteredSteps.some((s) => s.status === "running") && (
                            <Group gap="xs">
                                <Badge variant="dot" color="blue" size="sm">
                                    Active
                                </Badge>
                                {onStop && (
                                    <Tooltip label="Stop Scraping">
                                        <ActionIcon
                                            color="red"
                                            variant="light"
                                            size="sm"
                                            onClick={onStop}
                                        >
                                            <IconPlayerStop size={14} />
                                        </ActionIcon>
                                    </Tooltip>
                                )}
                            </Group>
                        )}
                        {filteredSteps.length > 0 && (
                            <CopyButton
                                value={[...filteredSteps]
                                    .reverse()
                                    .map((s) => `[${s.timestamp}] ${s.message}`)
                                    .join("\n")}
                            >
                                {({ copied, copy }) => (
                                    <Tooltip
                                        label={
                                            copied
                                                ? "Copied all!"
                                                : "Copy all steps"
                                        }
                                    >
                                        <ActionIcon
                                            variant="subtle"
                                            color={copied ? "green" : "gray"}
                                            size="sm"
                                            onClick={copy}
                                        >
                                            {copied ? (
                                                <IconCheck size={14} />
                                            ) : (
                                                <IconCopy size={14} />
                                            )}
                                        </ActionIcon>
                                    </Tooltip>
                                )}
                            </CopyButton>
                        )}
                    </Group>
                </Group>

                <ScrollArea h={400} offsetScrollbars>
                    <Stack gap="xs">
                        {filteredSteps.length > 0 ? (
                            [...filteredSteps].reverse().map((step) => (
                                <Group
                                    key={step.id}
                                    gap="sm"
                                    align="flex-start"
                                    wrap="nowrap"
                                >
                                    <Box mt={2}>
                                        {step.status === "completed" && (
                                            <IconCircleCheck
                                                size={16}
                                                color="var(--mantine-color-green-6)"
                                            />
                                        )}
                                        {step.status === "running" && (
                                            <IconLoader2
                                                size={16}
                                                color="var(--mantine-color-blue-6)"
                                                className="animate-spin"
                                                style={{
                                                    animation:
                                                        "spin 2s linear infinite",
                                                }}
                                            />
                                        )}
                                        {step.status === "pending" && (
                                            <IconCircleDashed
                                                size={16}
                                                color="var(--mantine-color-gray-4)"
                                            />
                                        )}
                                        {step.status === "error" && (
                                            <IconAlertCircle
                                                size={16}
                                                color="var(--mantine-color-red-6)"
                                            />
                                        )}
                                    </Box>
                                    <Stack
                                        gap={0}
                                        style={{
                                            flex: 1,
                                        }}
                                    >
                                        <Text size="xs" fw={500}>
                                            {step.message}
                                        </Text>
                                        <Text size="10px" c="dimmed">
                                            {step.timestamp}
                                        </Text>
                                    </Stack>
                                    <Tooltip
                                        label={
                                            copiedId === step.id
                                                ? "Copied!"
                                                : "Copy"
                                        }
                                        position="left"
                                    >
                                        <ActionIcon
                                            variant="subtle"
                                            color={
                                                copiedId === step.id
                                                    ? "green"
                                                    : "gray"
                                            }
                                            size="xs"
                                            onClick={() => handleCopy(step)}
                                            style={{
                                                opacity: 0.5,
                                                flexShrink: 0,
                                            }}
                                            onMouseEnter={(e) =>
                                                (e.currentTarget.style.opacity =
                                                    "1")
                                            }
                                            onMouseLeave={(e) =>
                                                (e.currentTarget.style.opacity =
                                                    "0.5")
                                            }
                                        >
                                            {copiedId === step.id ? (
                                                <IconCheck size={12} />
                                            ) : (
                                                <IconCopy size={12} />
                                            )}
                                        </ActionIcon>
                                    </Tooltip>
                                </Group>
                            ))
                        ) : (
                            <Text size="xs" c="dimmed" ta="center" py="xl">
                                Waiting for action...
                            </Text>
                        )}
                    </Stack>
                </ScrollArea>
            </Stack>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin {
                    animation: spin 2s linear infinite;
                }
            `}</style>
        </Card>
    );
}
