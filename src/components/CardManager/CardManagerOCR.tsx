"use client";

import { useState } from "react";
import { Group, Text, Stack, Image, Button, Loader, ActionIcon, Box, Select, LoadingOverlay, Checkbox, Badge } from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE, FileWithPath } from "@mantine/dropzone";
import { IconPhoto, IconUpload, IconX, IconScan, IconCamera, IconRefresh, IconSpace, IconPlayerStop } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { APP_CONFIG } from "@/constants/app";

import { useRef, useEffect } from "react";

interface CardManagerOCRProps {
    mode: "vision" | "text" | "camera";
    onScan?: (ids: string[]) => void;
    onTextResult?: (query: string) => void;
    onClear?: () => void;
    autoAdd?: boolean;
    onAutoAddChange?: (val: boolean) => void;
    autoCapture?: boolean;
    onAutoCaptureChange?: (val: boolean) => void;
    paused?: boolean;
    loopActive?: boolean;
    onLoopActiveChange?: (val: boolean) => void;
}

export function CardManagerOCR({ mode, onScan, onTextResult, onClear, autoAdd, onAutoAddChange, autoCapture, onAutoCaptureChange, paused, loopActive, onLoopActiveChange }: CardManagerOCRProps) {
    const [file, setFile] = useState<FileWithPath | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const [devices, setDevices] = useState<{ value: string; label: string }[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Stop camera when component unmounts or mode changes
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [mode]);

    // Reset loopActive when autoCapture is turned off
    useEffect(() => {
        if (!autoCapture) {
            onLoopActiveChange?.(false);
        }
    }, [autoCapture]);

    // Auto-start camera when mode is "camera"
    useEffect(() => {
        if (mode === "camera" && !preview && !cameraActive) {
            startCamera();
        }
    }, [mode, preview, cameraActive]);

    // Attach stream to video element when it becomes available
    useEffect(() => {
        if (cameraActive && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [cameraActive, selectedDeviceId]);

    // Handle Auto-capture timer and countdown
    useEffect(() => {
        let interval: NodeJS.Timeout;
        let countdownInterval: NodeJS.Timeout;

        if (autoCapture && loopActive && cameraActive && !preview && !loading && !paused && mode === "camera") {
            setCountdown(APP_CONFIG.AUTO_CAPTURE_INTERVAL);

            countdownInterval = setInterval(() => {
                setCountdown(prev => (prev !== null && prev > 1) ? prev - 1 : prev);
            }, 1000);

            interval = setInterval(() => {
                capturePhoto();
            }, APP_CONFIG.AUTO_CAPTURE_INTERVAL * 1000);
        } else {
            setCountdown(null);
        }

        return () => {
            if (interval) clearInterval(interval);
            if (countdownInterval) clearInterval(countdownInterval);
        };
    }, [autoCapture, loopActive, cameraActive, preview, loading, paused, mode]);

    // Auto-return to live view after scan if auto-capture is on
    useEffect(() => {
        if (autoCapture && !loading && preview && mode === "camera") {
            const timer = setTimeout(() => {
                handleClear();
            }, 2000); // Give user 2 seconds to see the result
            return () => clearTimeout(timer);
        }
    }, [autoCapture, loading, preview, mode]);

    // Handle Space key to capture or re-scan
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === " ") {
                if (cameraActive && !preview) {
                    e.preventDefault();
                    capturePhoto();
                } else if (preview && mode === "camera") {
                    e.preventDefault();
                    handleClear();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [cameraActive, preview, mode]);

    // Load available camera devices
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

            // Auto-select first device if none selected
            if (videoDevices.length > 0 && !selectedDeviceId) {
                setSelectedDeviceId(videoDevices[0].value);
            }
        } catch (err) {
            console.error("Error loading devices:", err);
        }
    };

    const startCamera = async (deviceId?: string) => {
        // Stop any existing stream first
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

            // Re-load devices to get labels (labels are often empty until permission is granted)
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

    const handleDeviceChange = (deviceId: string | null) => {
        if (deviceId) {
            setSelectedDeviceId(deviceId);
            startCamera(deviceId);
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

    const capturePhoto = () => {
        if (!videoRef.current) return;

        // Start the auto-capture loop if enabled
        if (autoCapture && !loopActive) {
            onLoopActiveChange?.(true);
        }

        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0);
            canvas.toBlob((blob) => {
                if (blob) {
                    const capturedFile = new File([blob], "camera-capture.jpg", { type: "image/jpeg" }) as FileWithPath;
                    setFile(capturedFile);
                    setPreview(URL.createObjectURL(capturedFile));
                    stopCamera();
                    // Automatically trigger scan after capture
                    handleScan(capturedFile);
                }
            }, "image/jpeg", 0.9);
        }
    };

    const handleDrop = (files: FileWithPath[]) => {
        const droppedFile = files[0];
        setFile(droppedFile);
        setPreview(URL.createObjectURL(droppedFile));
        // Automatically trigger scan after drop
        handleScan(droppedFile);
    };

    const handleClear = () => {
        setFile(null);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(null);
        onClear?.();
    };

    const handleScan = async (manualFile?: FileWithPath) => {
        const fileToUse = manualFile || file;
        if (!fileToUse) return;

        setLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

        try {
            const formData = new FormData();

            if (mode === "vision") {
                // CLIP / Image Matching API
                formData.append("fileA", fileToUse);
                formData.append("model", APP_CONFIG.OCR_MODEL);
                formData.append("score", APP_CONFIG.OCR_SCORE_THRESHOLD.toString());
                formData.append("limit", APP_CONFIG.OCR_LIMIT.toString());
                formData.append("workers", APP_CONFIG.OCR_WORKERS.toString());

                const res = await fetch(APP_CONFIG.OCR_API_URL, {
                    method: "POST",
                    body: formData,
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);

                if (!res.ok) throw new Error("Vision Service failed");
                const data = await res.json();

                // Show raw JSON response for debugging
                notifications.show({
                    title: "Vision Debug: Server Response",
                    message: (
                        <Box component="pre" style={{ margin: 0, fontSize: '10px', maxHeight: '150px', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                            {JSON.stringify(data, null, 2)}
                        </Box>
                    ),
                    color: "blue",
                    autoClose: 8000,
                });

                const matches = data.results || [];
                const scanIds = matches.map((m: any) => {
                    const filename = m.path.split("/").pop()?.split(".").shift() || "";
                    const match = filename.match(/\[(.*?)\]-([^-]+)/);
                    if (match) return `${match[1]}:${match[2]}`;
                    return null;
                }).filter(Boolean);

                if (scanIds.length > 0) {
                    onScan?.(scanIds);
                    notifications.show({
                        title: "Scan Completed",
                        message: `Found ${matches.length} matches.`,
                        color: "green",
                    });
                } else {
                    throw new Error("No clear match found");
                }
            } else {
                // Text-only OCR API (PaddleOCR)
                // Note: PaddleOCR expects 'file' not 'fileA'
                formData.append("file", fileToUse);

                const res = await fetch(APP_CONFIG.OCR_TEXT_API_URL, {
                    method: "POST",
                    body: formData,
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);

                if (!res.ok) throw new Error("OCR Text Service failed");
                const data = await res.json();

                if (data.text) {
                    const text = data.text;
                    const lines = text.split(/\n/).map((l: string) => l.trim()).filter(Boolean);
                    const potentialName = lines[0] || "Unknown";

                    console.log("[OCR Text Recognition]", { name: potentialName, raw: text });

                    // 1. Extract Set Code (e.g., WOE from WOE-EN)
                    const setMatch = text.match(/\b([A-Z0-9]{3,5})-(?:[A-Z]{2,})\b/i);
                    const setCode = setMatch ? setMatch[1].toUpperCase() : null;

                    // 2. Extract Card Number (e.g., 180 from U0180)
                    const noMatch = text.match(/\b[A-Z]?0*([1-9][0-9]{2,3})\b/) ||
                        text.match(/(?<!\/)\b[A-Z]?0*([1-9][0-9]{0,1})\b(?!\/)/);

                    const cardNo = noMatch ? noMatch[1] : null;

                    if (setCode && cardNo) {
                        onScan?.([`${setCode}:${cardNo}`]);
                        notifications.show({
                            title: "Card Identified via " + (mode === "camera" ? "Camera" : "Text"),
                            message: (
                                <Stack gap={4}>
                                    <Text size="sm" fw={700}>{potentialName}</Text>
                                    <Text size="xs" c="dimmed">Set: {setCode} | No: {cardNo}</Text>
                                </Stack>
                            ),
                            color: "green",
                            autoClose: 3000,
                        });
                    } else {
                        onTextResult?.(text);
                        notifications.show({
                            title: "Text Recognized",
                            message: (
                                <Stack gap="xs">
                                    <Box style={{ whiteSpace: 'pre-wrap', fontSize: '13px', backgroundColor: 'rgba(0,0,0,0.05)', padding: '8px', borderRadius: '4px', maxHeight: '200px', overflow: 'auto' }}>
                                        {text}
                                    </Box>
                                    <Text size="xs" c="dimmed">Raw JSON available in console</Text>
                                </Stack>
                            ),
                            color: "green",
                            autoClose: 10000,
                        });
                    }
                } else {
                    throw new Error("No text found on card");
                }
            }
        } catch (err: any) {
            console.error("OCR Precise Error:", err);
            if (err.stack) console.error("OCR Stack:", err.stack);

            const isTimeout = err.name === 'AbortError';

            notifications.show({
                title: isTimeout ? "Request Timed Out" : "Scan Failed",
                message: isTimeout
                    ? "The vision server took too long to respond. Please try again."
                    : (err.message || "Failed to process image"),
                color: "red",
                icon: <IconX size={18} />,
            });

            // If auto-capture is on, we MUST tell the parent that scanning failed/found nothing
            // so it can increment the 'consecutiveNoCard' counter and stop the loop if needed.
            if (autoCapture) {
                onScan?.([]);
            }
        } finally {
            setLoading(false);
        }
    };


    return (
        <Stack gap="md" maw={APP_CONFIG.OCR_SCAN_MAX_WIDTH} w={APP_CONFIG.OCR_SCAN_WIDTH} mx="auto">
            {!preview ? (
                mode === "camera" ? (
                    <Box
                        style={{
                            border: '2px dashed var(--mantine-color-gray-3)',
                            borderRadius: 'var(--mantine-radius-md)',
                            backgroundColor: 'var(--mantine-color-gray-0)',
                            overflow: 'hidden',
                            position: 'relative',
                            height: APP_CONFIG.CAMERA_VIEW_HEIGHT
                        }}
                    >
                        {!cameraActive ? (
                            <Stack align="center" justify="center" p="xl" mih={APP_CONFIG.CAMERA_VIEW_HEIGHT}>
                                <Loader size="md" />
                                <Text fw={700}>Starting Camera...</Text>
                                <Text size="xs" c="dimmed">Please allow camera access if prompted</Text>
                            </Stack>
                        ) : (
                            <Box pos="relative">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    style={{
                                        width: '100%',
                                        height: APP_CONFIG.CAMERA_VIEW_HEIGHT,
                                        display: 'block',
                                        objectFit: 'contain',
                                        backgroundColor: '#000'
                                    }}
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

                                <Group justify="center" pos="absolute" bottom={10} left={0} right={0} gap="xs">
                                    <Button
                                        color="blue"
                                        radius="xl"
                                        size="md"
                                        leftSection={<IconCamera size={20} />}
                                        onClick={capturePhoto}
                                    >
                                        Scan (<IconSpace size={16} style={{ verticalAlign: 'middle', display: 'inline-block' }} /> Space)
                                    </Button>

                                    {autoCapture && loopActive && (
                                        <Button
                                            color="red"
                                            radius="xl"
                                            size="md"
                                            leftSection={<IconPlayerStop size={20} />}
                                            onClick={() => {
                                                onLoopActiveChange?.(false);
                                                onClear?.(); // Trigger clear on parent to reset waitingForSelection state
                                            }}
                                        >
                                            Stop
                                        </Button>
                                    )}
                                </Group>

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
                        )}
                    </Box>
                ) : (
                    <Dropzone
                        onDrop={handleDrop}
                        onReject={(files) => console.log('rejected files', files)}
                        maxSize={5 * 1024 ** 2}
                        accept={IMAGE_MIME_TYPE}
                        multiple={false}
                        loading={loading}
                        styles={{
                            root: {
                                border: '2px dashed var(--mantine-color-gray-3)',
                                borderRadius: 'var(--mantine-radius-md)',
                                backgroundColor: 'var(--mantine-color-gray-0)',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer',
                                '&:hover': {
                                    backgroundColor: 'var(--mantine-color-gray-1)',
                                    borderColor: 'var(--mantine-color-blue-4)',
                                }
                            }
                        }}
                    >
                        <Group justify="center" gap="xl" mih={140} style={{ pointerEvents: 'none' }}>
                            <Dropzone.Accept>
                                <IconUpload size={52} color="var(--mantine-color-blue-6)" stroke={1.5} />
                            </Dropzone.Accept>
                            <Dropzone.Reject>
                                <IconX size={52} color="var(--mantine-color-red-6)" stroke={1.5} />
                            </Dropzone.Reject>
                            <Dropzone.Idle>
                                <Stack align="center" gap={4}>
                                    {mode === "vision" ? <IconScan size={48} color="var(--mantine-color-blue-6)" stroke={1.5} /> : <IconPhoto size={48} color="var(--mantine-color-blue-6)" stroke={1.5} />}
                                    <Text size="xl" inline fw={700}>
                                        {mode === "vision" ? "Drop Card for Vision Match" : "Drop Card for Text OCR"}
                                    </Text>
                                    <Text size="sm" c="dimmed" inline mt={7}>
                                        Upload a photo of your physical card
                                    </Text>
                                </Stack>
                            </Dropzone.Idle>
                        </Group>
                    </Dropzone>
                )
            ) : (
                <Box pos="relative" style={{ borderRadius: 'var(--mantine-radius-md)', overflow: 'hidden' }}>
                    <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} loaderProps={{ size: 'md' }} />
                    <Image
                        src={preview}
                        alt="Preview"
                        radius="md"
                        style={{ height: APP_CONFIG.CAMERA_VIEW_HEIGHT, objectFit: "contain", backgroundColor: '#000' }}
                    />
                    <Group justify="center" pos="absolute" bottom={10} left={0} right={0}>
                        <Button
                            variant="filled"
                            color="blue"
                            radius="xl"
                            size="md"
                            leftSection={<IconRefresh size={18} />}
                            onClick={handleClear}
                            disabled={loading}
                        >
                            Re-scan{mode === "camera" && (
                                <> (<IconSpace size={16} style={{ verticalAlign: 'middle', display: 'inline-block' }} /> Space)</>
                            )}
                        </Button>
                    </Group>

                    {autoCapture && paused && (
                        <Badge
                            pos="absolute"
                            top={10}
                            right={10}
                            size="xl"
                            variant="filled"
                            color="orange"
                            style={{ zIndex: 11 }}
                        >
                            Waiting for response...
                        </Badge>
                    )}
                </Box>
            )}

            {onAutoAddChange && (
                <Group justify="center" mt="xs" gap="xl">
                    <Checkbox
                        label="Auto-add to collection"
                        checked={autoAdd}
                        onChange={(e) => onAutoAddChange(e.currentTarget.checked)}
                        size="sm"
                        color="blue"
                    />
                    {mode === "camera" && onAutoCaptureChange && (
                        <Checkbox
                            label={`Auto-capture (${APP_CONFIG.AUTO_CAPTURE_INTERVAL}s)`}
                            checked={autoCapture}
                            onChange={(e) => onAutoCaptureChange(e.currentTarget.checked)}
                            size="sm"
                            color="blue"
                        />
                    )}
                </Group>
            )}
        </Stack>
    );
}
