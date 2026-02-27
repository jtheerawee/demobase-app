"use client";

import {
    Button,
    Center,
    Group,
    Tooltip,
} from "@mantine/core";
import {
    IconCamera,
    IconPlayerStop,
} from "@tabler/icons-react";
import { useEffect } from "react";

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
        return () =>
            window.removeEventListener(
                "keydown",
                handleKeyDown,
            );
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
                        leftSection={
                            <IconCamera size={20} />
                        }
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
                        leftSection={
                            <IconPlayerStop size={20} />
                        }
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
