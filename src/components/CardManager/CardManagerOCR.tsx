"use client";

import { useState } from "react";
import { Group, Text, Stack, Image, Button, Loader, ActionIcon, Box } from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE, FileWithPath } from "@mantine/dropzone";
import { IconPhoto, IconUpload, IconX, IconScan, IconTrash, IconCamera } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { APP_CONFIG } from "@/constants/app";

import { useRef, useEffect } from "react";

interface CardManagerOCRProps {
    mode: "vision" | "text" | "camera";
    onScan?: (ids: string[]) => void;
    onTextResult?: (query: string) => void;
    onClear?: () => void;
}

export function CardManagerOCR({ mode, onScan, onTextResult, onClear }: CardManagerOCRProps) {
    const [file, setFile] = useState<FileWithPath | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Stop camera when component unmounts or mode changes
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [mode]);

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
    }, [cameraActive]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }
            });
            streamRef.current = stream;
            setCameraActive(true);
        } catch (err) {
            console.error("Camera error:", err);
            notifications.show({
                title: "Camera Error",
                message: "Could not access camera. Please check permissions.",
                color: "red"
            });
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
                            minHeight: 220
                        }}
                    >
                        {!cameraActive ? (
                            <Stack align="center" justify="center" p="xl" mih={220}>
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
                                        height: 'auto',
                                        display: 'block',
                                        minHeight: '220px',
                                        backgroundColor: '#000'
                                    }}
                                />
                                <Group justify="center" pos="absolute" bottom={10} left={0} right={0}>
                                    <Button
                                        color="blue"
                                        radius="xl"
                                        size="md"
                                        leftSection={<IconCamera size={20} />}
                                        onClick={capturePhoto}
                                    >
                                        Capture Card
                                    </Button>
                                    <Button
                                        color="red"
                                        variant="light"
                                        radius="xl"
                                        onClick={stopCamera}
                                    >
                                        Close
                                    </Button>
                                </Group>
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
                <Box pos="relative">
                    <Image
                        src={preview}
                        alt="Preview"
                        radius="md"
                        style={{ maxHeight: 300, objectFit: "contain" }}
                    />
                    <Stack gap="xs" mt="md">
                        <Group grow>
                            <Button
                                variant="filled"
                                color="blue"
                                leftSection={loading ? <Loader size="xs" /> : <IconScan size={18} />}
                                onClick={() => handleScan()}
                                disabled={loading}
                            >
                                {loading ? "Scanning..." : (mode === "vision" ? "Find Identity" : "Read Text")}
                            </Button>
                            <Button
                                variant="light"
                                color="red"
                                leftSection={<IconTrash size={18} />}
                                onClick={handleClear}
                                disabled={loading}
                            >
                                Clear
                            </Button>
                        </Group>
                    </Stack>
                </Box>
            )}
        </Stack>
    );
}
