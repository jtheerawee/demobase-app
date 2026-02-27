"use client";

import { ActionIcon, Badge, CopyButton, Group, Tooltip } from "@mantine/core";
import { IconCheck, IconCopy, IconPlayerStop } from "@tabler/icons-react";
import { ActiveBadge } from "./ActiveBadge";

interface RunningStepIconsProps {
    isActive: boolean;
    workerCount: number;
    onStop?: () => void;
    copyValue: string;
    hasSteps: boolean;
}

export function RunningStepIcons({
    isActive,
    workerCount,
    onStop,
    copyValue,
    hasSteps,
}: RunningStepIconsProps) {
    return (
        <Group gap="xs">
            {isActive && (
                <Group gap="xs">
                    <ActiveBadge />
                    {workerCount > 0 && (
                        <Badge variant="outline" color="blue" size="sm">
                            {workerCount} {workerCount === 1 ? "Worker" : "Workers"}
                        </Badge>
                    )}
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
            {hasSteps && (
                <CopyButton value={copyValue}>
                    {({ copied, copy }) => (
                        <Tooltip
                            label={copied ? "Copied all!" : "Copy all steps"}
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
    );
}
