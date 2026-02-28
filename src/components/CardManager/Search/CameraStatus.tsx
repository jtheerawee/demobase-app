"use client";

import { Badge } from "@mantine/core";

interface CameraStatusProps {
    autoCapture?: boolean;
    countdown: number | null;
    paused?: boolean;
    loopActive?: boolean;
}

export function CameraStatus({ autoCapture = false, countdown, paused, loopActive }: CameraStatusProps) {
    if (!autoCapture || (countdown === null && !paused) || !loopActive) {
        return null;
    }

    return (
        <Badge
            pos="absolute"
            top={10}
            right={10}
            size="xl"
            variant="filled"
            color={paused ? "orange" : "blue"}
            style={{ zIndex: 11 }}
        >
            {paused ? "Waiting for response..." : `Auto-capturing in ${countdown}s...`}
        </Badge>
    );
}
