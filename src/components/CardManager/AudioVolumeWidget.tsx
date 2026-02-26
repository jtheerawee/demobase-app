"use client";

import { Card, Group, Text, Progress, ActionIcon, Stack, Select, Tooltip, Slider, Box } from "@mantine/core";
import { IconMicrophone, IconMicrophoneOff } from "@tabler/icons-react";
import { useState, useEffect, useRef } from "react";
import { useLocalStorage } from "@mantine/hooks";

interface AudioVolumeWidgetProps {
    onTrigger?: () => void;
}

export function AudioVolumeWidget({ onTrigger }: AudioVolumeWidgetProps) {
    const [isListening, setIsListening] = useState(false);
    const [volume, setVolume] = useState(0);
    const [devices, setDevices] = useState<{ value: string; label: string }[]>([]);

    // Threshold for voice trigger (0-100)
    const [threshold, setThreshold] = useLocalStorage<number>({
        key: "voice-trigger-threshold",
        defaultValue: 60,
    });

    const lastTriggerTime = useRef(0);
    const TRIGGER_COOLDOWN = 3000; // 3 seconds cooldown between voice triggers
    const [selectedDeviceId, setSelectedDeviceId] = useLocalStorage<string>({
        key: "preferred-microphone-device",
        defaultValue: "default",
    });

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number | null>(null);
    const activeRef = useRef(false);

    const loadDevices = async () => {
        const all = await navigator.mediaDevices.enumerateDevices();
        const mics = all.filter(d => d.kind === "audioinput");
        setDevices(mics.map(d => ({
            value: d.deviceId || "default",
            label: d.label || (d.deviceId === "default" ? "Default Microphone" : `Microphone ${d.deviceId.slice(0, 6)}…`),
        })));
    };

    const stop = () => {
        activeRef.current = false;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        streamRef.current?.getTracks().forEach(t => t.stop());
        audioContextRef.current?.close();
        streamRef.current = null;
        audioContextRef.current = null;
        analyserRef.current = null;
        setIsListening(false);
        setVolume(0);
    };

    const start = async (deviceId: string) => {
        stop();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: deviceId && deviceId !== "default" ? { deviceId: { exact: deviceId } } : true,
            });
            streamRef.current = stream;
            loadDevices(); // refresh labels after permission granted

            const ctx = new AudioContext();
            if (ctx.state === "suspended") await ctx.resume();
            audioContextRef.current = ctx;

            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;
            ctx.createMediaStreamSource(stream).connect(analyser);

            activeRef.current = true;
            setIsListening(true);

            const tick = () => {
                if (!activeRef.current || !analyserRef.current) return;
                const buf = new Uint8Array(analyserRef.current.fftSize);
                analyserRef.current.getByteTimeDomainData(buf);
                const max = Math.max(...buf.map(v => Math.abs(v - 128)));
                const currentVolume = Math.min(100, (max / 128) * 100 * 3.0); // Slightly boosted for trigger sensitivity
                setVolume(currentVolume);

                // Voice trigger check
                if (currentVolume >= threshold) {
                    const now = Date.now();
                    if (now - lastTriggerTime.current > TRIGGER_COOLDOWN) {
                        lastTriggerTime.current = now;
                        onTrigger?.();
                    }
                }

                rafRef.current = requestAnimationFrame(tick);
            };
            tick();
        } catch (err) {
            console.error("Microphone error:", err);
        }
    };

    // Auto-start on mount
    useEffect(() => {
        start(selectedDeviceId);
        navigator.mediaDevices.addEventListener("devicechange", loadDevices);
        return () => {
            stop();
            navigator.mediaDevices.removeEventListener("devicechange", loadDevices);
        };
    }, []);

    const handleDeviceChange = (val: string | null) => {
        if (!val) return;
        setSelectedDeviceId(val);
        start(val);
    };

    return (
        <Card withBorder radius="md" padding="sm" shadow="sm">
            <Stack gap="sm">
                <Group justify="space-between">
                    <Text fw={700} size="sm">Microphone Volume</Text>
                    <Tooltip label={isListening ? "Stop" : "Start"} withArrow position="left">
                        <ActionIcon
                            variant={isListening ? "light" : "subtle"}
                            color={isListening ? "red" : "gray"}
                            onClick={() => isListening ? stop() : start(selectedDeviceId)}
                        >
                            {isListening ? <IconMicrophone size={18} /> : <IconMicrophoneOff size={18} />}
                        </ActionIcon>
                    </Tooltip>
                </Group>

                {devices.length > 0 && (
                    <Select
                        size="xs"
                        data={devices}
                        value={selectedDeviceId}
                        onChange={handleDeviceChange}
                        placeholder="Select microphone"
                        allowDeselect={false}
                    />
                )}

                <Box pos="relative" pt={4}>
                    <Progress
                        value={volume}
                        color={volume > 80 ? "red" : volume > 50 ? "yellow" : "blue"}
                        size="xl"
                        radius="xl"
                        striped={isListening}
                        animated={isListening}
                    />
                    {/* Threshold marker */}
                    <Box
                        pos="absolute"
                        top={0}
                        bottom={0}
                        left={`${threshold}%`}
                        w={2}
                        bg="red"
                        style={{ zIndex: 1, opacity: 0.6, pointerEvents: "none" }}
                    />
                </Box>

                <Stack gap={2}>
                    <Group justify="space-between">
                        <Text size="xs" c="dimmed">Voice Trigger Level</Text>
                        <Text size="xs" fw={700} color={volume >= threshold ? "red" : "dimmed"}>
                            {threshold}%
                        </Text>
                    </Group>
                    <Slider
                        size="xs"
                        value={threshold}
                        onChange={setThreshold}
                        min={10}
                        max={100}
                        label={null}
                        color="red"
                    />
                </Stack>
            </Stack>
        </Card>
    );
}
