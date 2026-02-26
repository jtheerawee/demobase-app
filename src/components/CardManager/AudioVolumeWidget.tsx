"use client";

import { Card, Group, Text, Progress, ActionIcon, Stack, Select, Tooltip } from "@mantine/core";
import { IconMicrophone, IconMicrophoneOff } from "@tabler/icons-react";
import { useState, useEffect, useRef } from "react";
import { useLocalStorage } from "@mantine/hooks";

export function AudioVolumeWidget() {
    const [isListening, setIsListening] = useState(false);
    const [volume, setVolume] = useState(0);
    const [devices, setDevices] = useState<{ value: string; label: string }[]>([]);
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
                setVolume(Math.min(100, (max / 128) * 100 * 2.5));
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

                <Progress
                    value={volume}
                    color={volume > 80 ? "red" : volume > 50 ? "yellow" : "blue"}
                    size="xl"
                    radius="xl"
                    striped={isListening}
                    animated={isListening}
                />
            </Stack>
        </Card>
    );
}
