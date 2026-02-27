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
} from "@tabler/icons-react";
import { useState } from "react";

import {
    CARD_SCRAPER_CONFIG,
    SCRAPER_STEP_STATUS,
    type ScraperStepStatus,
} from "@/constants/card_scraper";
import { RunningStepIcons } from "./RunningStepIcons";
import { CopyStepsButton } from "./CopyStepsButton";
import { WidgetHeader } from "../WidgetHeader";
import { StopScraperButton } from "./StopScraperButton";

interface Step {
    id: string | number;
    message: string;
    status: ScraperStepStatus;
    timestamp: string;
}

interface CardScraperRunningStepsProps {
    steps?: Step[];
    workerCount?: number;
    onStop?: () => void;
}

export function CardScraperRunningSteps({
    steps = [],
    workerCount = 0,
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
        .slice(-CARD_SCRAPER_CONFIG.RUNNING_STEPS_LIMIT);

    const isRunning = filteredSteps.some(
        (s) => s.status === SCRAPER_STEP_STATUS.RUNNING,
    );

    return (
        <Card
            withBorder
            radius="sm"
            shadow="sm"
            padding={0}
            style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
            }}
        >
            <WidgetHeader
                title={
                    <>
                        Running Steps{" "}
                        <Text component="span" fw={400} c="dimmed" size="xs">
                            (Limit to {CARD_SCRAPER_CONFIG.RUNNING_STEPS_LIMIT})
                        </Text>
                    </>
                }
                actions={
                    <Group gap="xs">
                        {isRunning && <StopScraperButton onStop={onStop} />}
                        <CopyStepsButton
                            hasSteps={filteredSteps.length > 0}
                            value={[...filteredSteps]
                                .reverse()
                                .map((s) => `[${s.timestamp}] ${s.message}`)
                                .join("\n")}
                        />
                    </Group>
                }
            />
            <Stack gap="xs" style={{ flex: 1, minHeight: 0 }} p="sm">
                <Group justify="flex-end">
                    <RunningStepIcons
                        isActive={isRunning}
                        workerCount={workerCount}
                    />
                </Group>

                <ScrollArea style={{ flex: 1, minHeight: 0 }} offsetScrollbars>
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
                                        {step.status === SCRAPER_STEP_STATUS.COMPLETED && (
                                            <IconCircleCheck
                                                size={16}
                                                color="var(--mantine-color-green-6)"
                                            />
                                        )}
                                        {step.status === SCRAPER_STEP_STATUS.RUNNING && (
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
                                        {step.status === SCRAPER_STEP_STATUS.PENDING && (
                                            <IconCircleDashed
                                                size={16}
                                                color="var(--mantine-color-gray-4)"
                                            />
                                        )}
                                        {step.status === SCRAPER_STEP_STATUS.ERROR && (
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
