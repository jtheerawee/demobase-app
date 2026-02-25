"use client";

import { useState, useRef, useEffect } from "react";
import { Group, Text, Stack, Image, Button, Loader, ActionIcon, Box, Select, LoadingOverlay, Checkbox, Badge, Tooltip, Center, Modal } from "@mantine/core";
import { FileWithPath } from "@mantine/dropzone";
import { IconCamera, IconRefresh, IconPlayerStop, IconPlus, IconMinus, IconMaximize } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { APP_CONFIG } from "@/constants/app";

interface CardManagerCameraProps {
    onCapture: (file: FileWithPath) => void;
    onScanStart?: () => void;
    loading: boolean;
    paused?: boolean;
    autoAdd?: boolean;
    onAutoAddChange?: (val: boolean) => void;
    autoCapture?: boolean;
    onAutoCaptureChange?: (val: boolean) => void;
    loopActive?: boolean;
    onLoopActiveChange?: (val: boolean) => void;
    autoCaptureInterval?: number;
    onAutoCaptureIntervalChange?: (val: number) => void;
    onClear?: () => void;
    preview?: string | null;
    setPreview: (url: string | null) => void;
}

export function CardManagerCamera({
    onCapture,
    onScanStart,
    loading,
    paused,
    autoAdd,
    onAutoAddChange,
    autoCapture,
    onAutoCaptureChange,
    loopActive,
    onLoopActiveChange,
    autoCaptureInterval = 5,
    onAutoCaptureIntervalChange,
    onClear,
    preview,
    setPreview
}: CardManagerCameraProps) {
    const [cameraActive, setCameraActive] = useState(false);
    const [devices, setDevices] = useState<{ value: string; label: string }[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [isEnlarged, setIsEnlarged] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const loadDevices = async () => {
        try {
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = allDevices
                .filter(device => device.kind === 'videoinput')
                .map(device => ({
                    value: device.deviceId,
                    label: device.label || `Camera ${device.deviceId.slice(0, 5)}...`
                }));
            setDevices(videoDevices);

            if (videoDevices.length > 0 && !selectedDeviceId) {
                setSelectedDeviceId(videoDevices[0].value);
            }
        } catch (err) {
            console.error("Error loading devices:", err);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            for (const track of streamRef.current.getTracks()) {
                track.stop();
            }
            streamRef.current = null;
        }
        setCameraActive(false);
    };

    const startCamera = async (deviceId?: string) => {
        stopCamera();
        try {
            const constraints: MediaStreamConstraints = {
                video: deviceId
                    ? { deviceId: { exact: deviceId } }
                    : { facingMode: "environment" }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            setCameraActive(true);
            loadDevices();
        } catch (err) {
            console.error("Camera error:", err);
            notifications.show({
                title: "Camera Error",
                message: "Could not access camera. Please check permissions.",
                color: "red"
            });
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;
        if (autoCapture && !loopActive) {
            onLoopActiveChange?.(true);
        }

        // Clear snapshot and results immediately before async blob creation
        if (preview) URL.revokeObjectURL(preview);
        setPreview(null);
        onScanStart?.();

        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0);
            canvas.toBlob((blob) => {
                if (blob) {
                    const capturedFile = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" }) as FileWithPath;
                    const url = URL.createObjectURL(capturedFile);
                    setPreview(url);
                    onCapture(capturedFile);
                }
            }, "image/jpeg", 0.9);
        }
    };

    const handleDeviceChange = (deviceId: string | null) => {
        if (deviceId) {
            setSelectedDeviceId(deviceId);
            startCamera(deviceId);
        }
    };

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    useEffect(() => {
        if (cameraActive && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [cameraActive, selectedDeviceId]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        let countdownInterval: NodeJS.Timeout;

        if (autoCapture && loopActive && cameraActive && !loading && !paused) {
            setCountdown(autoCaptureInterval);
            countdownInterval = setInterval(() => {
                setCountdown(prev => (prev !== null && prev > 1) ? prev - 1 : prev);
            }, 1000);
            interval = setInterval(() => {
                capturePhoto();
            }, autoCaptureInterval * 1000);
        } else {
            setCountdown(null);
        }

        return () => {
            if (interval) clearInterval(interval);
            if (countdownInterval) clearInterval(countdownInterval);
        };
    }, [autoCapture, loopActive, cameraActive, loading, paused, autoCaptureInterval]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === " ") {
                if (cameraActive) {
                    e.preventDefault();
                    capturePhoto();
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [cameraActive]);

    return (
        <Stack gap="md" w="100%">
            <Box
                style={{
                    borderRadius: 'var(--mantine-radius-md)',
                    overflow: 'hidden',
                    position: 'relative',
                    height: APP_CONFIG.CAMERA_VIEW_HEIGHT,
                    backgroundColor: '#000'
                }}
            >
                <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} loaderProps={{ size: 'md' }} />

                {!cameraActive ? (
                    <Center h="100%" bg="var(--mantine-color-gray-0)">
                        <Stack align="center" gap="sm">
                            <Loader size="md" />
                            <Text fw={700}>Starting Camera...</Text>
                        </Stack>
                    </Center>
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
                        />
                        {devices.length > 1 && (
                            <Box pos="absolute" top={10} left={10} right={10} style={{ zIndex: 10 }}>
                                <Select
                                    size="xs"
                                    placeholder="Select Camera"
                                    data={devices}
                                    value={selectedDeviceId}
                                    onChange={handleDeviceChange}
                                    styles={{
                                        input: {
                                            backgroundColor: 'rgba(255,255,255,0.8)',
                                            backdropFilter: 'blur(4px)',
                                            borderColor: 'transparent'
                                        }
                                    }}
                                />
                            </Box>
                        )}
                    </>
                )}

                {autoCapture && (countdown !== null || paused) && loopActive && (
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
                )}
            </Box>

            <Box pos="relative" w="100%">
                {/* Main Action (Centered) */}
                <Center>
                    <Group gap="xs">
                        <Tooltip label="Press Space to scan" position="top" withArrow>
                            <Button
                                color="blue"
                                radius="xl"
                                size="md"
                                leftSection={<IconCamera size={20} />}
                                onClick={capturePhoto}
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

                {/* Snapshot Thumbnail (Right-aligned) */}
                {preview && (
                    <Box pos="absolute" right={0} top="50%" style={{ transform: 'translateY(-50%)' }}>
                        <Tooltip label="Click to enlarge last snapshot" position="top">
                            <Box
                                pos="relative"
                                onClick={() => setIsEnlarged(true)}
                                style={{
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                    border: '2px solid var(--mantine-color-blue-4)',
                                    boxShadow: 'var(--mantine-shadow-xs)',
                                    transition: 'transform 0.1s ease',
                                    '&:hover': { transform: 'scale(1.05)' }
                                }}
                            >
                                <Image src={preview} w={48} h={48} fallbackSrc="https://placehold.co/48x48?text=Scan" style={{ objectFit: 'cover' }} />
                                <Box pos="absolute" bottom={2} right={2} bg="rgba(0,0,0,0.5)" style={{ borderRadius: '2px', display: 'flex', padding: 1 }}>
                                    <IconMaximize size={8} color="white" />
                                </Box>
                            </Box>
                        </Tooltip>
                    </Box>
                )}
            </Box>

            <Modal opened={isEnlarged} onClose={() => setIsEnlarged(false)} title="Last Captured Snapshot" size="lg" centered overlayProps={{ blur: 3 }}>
                <Image src={preview || ""} radius="md" style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
            </Modal>

            {onAutoAddChange && (
                <Group justify="center" mt="xs" gap="md" wrap="nowrap">
                    <Checkbox label="Auto-add to collection" checked={autoAdd} onChange={(e) => onAutoAddChange(e.currentTarget.checked)} size="sm" color="blue" />
                    {onAutoCaptureChange && (
                        <Group gap={4} wrap="nowrap" align="center">
                            <Tooltip label="Turning on Auto-capture will also enable Auto-add to collection for a fully automated workflow." position="bottom" withArrow>
                                <Checkbox label="Auto-capture" checked={autoCapture} onChange={(e) => onAutoCaptureChange(e.currentTarget.checked)} size="sm" color="blue" />
                            </Tooltip>
                            <Group gap={2} wrap="nowrap" ml={2} bg={autoCapture ? "gray.0" : "gray.1"} px={4} style={{ borderRadius: '4px', border: `1px solid ${autoCapture ? 'var(--mantine-color-gray-2)' : 'var(--mantine-color-gray-3)'}`, opacity: autoCapture ? 1 : 0.6, pointerEvents: autoCapture ? 'all' : 'none' }}>
                                <ActionIcon variant="subtle" color="blue" size="xs" onClick={() => onAutoCaptureIntervalChange?.(Math.max(5, (autoCaptureInterval || 5) - 1))} disabled={!autoCapture || autoCaptureInterval <= 5}><IconMinus size={10} stroke={3} /></ActionIcon>
                                <Text size="11px" fw={700} w={20} ta="center" c={autoCapture ? "blue.7" : "dimmed"}>{(autoCaptureInterval || 5)}s</Text>
                                <ActionIcon variant="subtle" color="blue" size="xs" onClick={() => onAutoCaptureIntervalChange?.((autoCaptureInterval || 5) + 1)} disabled={!autoCapture}><IconPlus size={10} stroke={3} /></ActionIcon>
                            </Group>
                        </Group>
                    )}
                </Group>
            )}
        </Stack>
    );
}
