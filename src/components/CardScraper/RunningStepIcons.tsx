"use client";

import { Badge, Group } from "@mantine/core";
import { ActiveBadge } from "./ActiveBadge";

interface RunningStepIconsProps {
    isActive: boolean;
    workerCount: number;
}

export function RunningStepIcons({ isActive, workerCount }: RunningStepIconsProps) {
    if (!isActive) return null;

    return (
        <Group gap="xs">
            {workerCount > 0 && (
                <Badge variant="outline" color="blue" size="sm">
                    {workerCount} {workerCount === 1 ? "Worker" : "Workers"}
                </Badge>
            )}
            <ActiveBadge />
        </Group>
    );
}
