"use client";

import { useEffect, useState } from "react";
import { Tooltip, Button, Center, Group } from "@mantine/core";
import { IconCamera, IconPlayerStop } from "@tabler/icons-react";

interface CameraShutterProps {
    loading: boolean;
    cameraActive: boolean;
    autoCapture?: boolean;
    loopActive?: boolean;
    onCapture: () => void;
    onLoopActiveChange?: (val: boolean) => void;
    onClear?: () => void;
}

export function CameraShutter({
    loading,
    cameraActive,
    autoCapture,
    loopActive,
    onCapture,
    onLoopActiveChange,
    onClear,
}: CameraShutterProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === " ") {
                if (cameraActive && !loading) {
                    e.preventDefault();
                    onCapture();
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [cameraActive, loading, onCapture]);

    return (
        <Center>
            <Group gap="xs">
                <Tooltip
                    label="Press Space to scan"
                    position="top"
                    withArrow
                >
                    <Button
                        color="blue"
                        radius="xl"
                        size="md"
                        leftSection={<IconCamera size={20} />}
                        onClick={onCapture}
                        disabled={loading || !cameraActive}
                    >
                        Scan
                    </Button>
                </Tooltip>

                {/* Stop Button */}
                {autoCapture && loopActive && (
                    <Button
                        color="red"
                        radius="xl"
                        size="md"
                        leftSection={<IconPlayerStop size={20} />}
                        onClick={() => {
                            onLoopActiveChange?.(false);
                            onClear?.();
                        }}
                    >
                        Stop
                    </Button>
                )}
            </Group>
        </Center>
    );
}

interface UseAutoCaptureProps {
    autoCapture?: boolean;
    loopActive?: boolean;
    cameraActive: boolean;
    paused?: boolean;
    autoCaptureInterval: number;
    onCapture: () => void;
}

export function useAutoCapture({
    autoCapture,
    loopActive,
    cameraActive,
    paused,
    autoCaptureInterval,
    onCapture,
}: UseAutoCaptureProps) {
    const [countdown, setCountdown] = useState<number | null>(null);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        let countdownInterval: NodeJS.Timeout;

        if (autoCapture && loopActive && cameraActive && !paused) {
            setCountdown(autoCaptureInterval);
            countdownInterval = setInterval(() => {
                setCountdown((prev) => {
                    if (prev === null) return null;
                    if (prev <= 1) return autoCaptureInterval;
                    return prev - 1;
                });
            }, 1000);
            interval = setInterval(() => {
                onCapture();
            }, autoCaptureInterval * 1000);
        } else {
            setCountdown(null);
        }

        return () => {
            if (interval) clearInterval(interval);
            if (countdownInterval) clearInterval(countdownInterval);
        };
    }, [autoCapture, loopActive, cameraActive, paused, autoCaptureInterval, onCapture]);

    return countdown;
}
