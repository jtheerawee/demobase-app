"use client";

import { useState, useEffect } from "react";
import {
    Group,
    Text,
    Stack,
    Image,
    Button,
    Box,
    LoadingOverlay,
    Center,
} from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE, FileWithPath } from "@mantine/dropzone";
import { IconPhoto, IconX, IconScan, IconRefresh } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { OCR_CONFIG } from "@/constants/ocr";
import { APP_CONFIG } from "@/constants/app";
import { APP_MESSAGES } from "@/constants/messages";
import { CameraView } from "./CameraView";

interface CardManagerOCRProps {
    mode: "vision" | "text" | "camera";
    onScan?: (ids: string[]) => void;
    onScanStart?: () => void;
    onResultInfo?: (info: string) => void;
    onClear?: () => void;
    autoAdd?: boolean;
    onAutoAddChange?: (val: boolean) => void;
    autoCapture?: boolean;
    onAutoCaptureChange?: (val: boolean) => void;
    paused?: boolean;
    loopActive?: boolean;
    onLoopActiveChange?: (val: boolean) => void;
    manualCaptureDelay?: number;
    onManualCaptureDelayChange?: (val: number) => void;
    autoCaptureDelay?: number;
    onAutoCaptureDelayChange?: (val: number) => void;
    resetTrigger?: number;
    voiceTrigger?: number;
}

export function CardManagerOCR({
    mode,
    onScan,
    onScanStart,
    onResultInfo,
    onClear,
    autoAdd,
    onAutoAddChange,
    autoCapture,
    onAutoCaptureChange,
    paused,
    loopActive,
    onLoopActiveChange,
    manualCaptureDelay,
    onManualCaptureDelayChange,
    autoCaptureDelay,
    onAutoCaptureDelayChange,
    resetTrigger,
    voiceTrigger,
}: CardManagerOCRProps) {
    const [file, setFile] = useState<FileWithPath | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

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
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        try {
            const formData = new FormData();

            if (mode === "vision") {
                formData.append("fileA", fileToUse);
                formData.append("model", OCR_CONFIG.OCR_MODEL);
                formData.append(
                    "score",
                    OCR_CONFIG.OCR_SCORE_THRESHOLD.toString(),
                );
                formData.append("limit", OCR_CONFIG.OCR_LIMIT.toString());
                formData.append("workers", OCR_CONFIG.OCR_WORKERS.toString());

                const res = await fetch(OCR_CONFIG.OCR_API_URL, {
                    method: "POST",
                    body: formData,
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);

                if (!res.ok) throw new Error("Vision Service failed");
                const data = await res.json();

                notifications.show({
                    title: "Vision Debug: Server Response",
                    message: (
                        <Box
                            component="pre"
                            style={{
                                margin: 0,
                                fontSize: "10px",
                                maxHeight: "150px",
                                overflow: "auto",
                                whiteSpace: "pre-wrap",
                            }}
                        >
                            {JSON.stringify(data, null, 2)}
                        </Box>
                    ),
                    color: "blue",
                    autoClose: APP_CONFIG.NOTIFICATION_AUTO_CLOSE,
                });

                const matches = data.results || [];
                const scanIds = matches
                    .map((m: any) => {
                        const filename =
                            m.path.split("/").pop()?.split(".").shift() || "";
                        const match = filename.match(/\[(.*?)\]-([^-]+)/);
                        if (match) return `${match[1]}:${match[2]}`;
                        return null;
                    })
                    .filter(Boolean);

                if (scanIds.length > 0) {
                    onScan?.(scanIds);
                } else {
                    throw new Error(APP_MESSAGES.NO_MATCH_FOUND);
                }
            } else {
                formData.append("file", fileToUse);
                const res = await fetch(OCR_CONFIG.OCR_TEXT_API_URL, {
                    method: "POST",
                    body: formData,
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);

                if (!res.ok) throw new Error("OCR Text Service failed");
                const data = await res.json();

                if (data.text) {
                    const text = data.text;
                    const lines = text
                        .split(/\n/)
                        .map((l: string) => l.trim())
                        .filter(Boolean);
                    const potentialName = lines[0] || "Unknown";

                    const setMatch = text.match(
                        /\b([A-Z0-9]{3,5})-(?:[A-Z]{2,})\b/i,
                    );
                    const setCode = setMatch ? setMatch[1].toUpperCase() : null;

                    const noMatch =
                        text.match(/\b[A-Z]?0*([1-9][0-9]{2,3})\b/) ||
                        text.match(
                            /(?<!\/)\b[A-Z]?0*([1-9][0-9]{0,1})\b(?!\/)/,
                        );

                    const cardNo = noMatch ? noMatch[1] : null;

                    if (setCode && cardNo) {
                        onScan?.([`${setCode}:${cardNo}`]);
                    } else {
                        onResultInfo?.(text);
                        onScan?.([]);
                    }
                } else {
                    throw new Error(APP_MESSAGES.NO_TEXT_FOUND);
                }
            }
        } catch (err: any) {
            console.error("OCR Precise Error:", err);
            const isNoMatch =
                err.message === APP_MESSAGES.NO_MATCH_FOUND ||
                err.message === APP_MESSAGES.NO_TEXT_FOUND;
            if (!isNoMatch) {
                notifications.show({
                    title:
                        err.name === "AbortError"
                            ? "Request Timed Out"
                            : "Scan Failed",
                    message: err.message || "Failed to process image",
                    color: "red",
                    icon: <IconX size={18} />,
                    autoClose: APP_CONFIG.NOTIFICATION_AUTO_CLOSE,
                });
            } else {
                if (err.message === APP_MESSAGES.NO_TEXT_FOUND) {
                    onResultInfo?.(APP_MESSAGES.NO_TEXT_FOUND);
                }
            }
            onScan?.([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (resetTrigger && resetTrigger > 0) {
            handleClear();
        }
    }, [resetTrigger]);

    const handleDrop = (files: FileWithPath[]) => {
        const droppedFile = files[0];
        setFile(droppedFile);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(URL.createObjectURL(droppedFile));
        handleScan(droppedFile);
    };

    if (mode === "camera") {
        return (
            <Box maw={OCR_CONFIG.OCR_SCAN_MAX_WIDTH} mx="auto" w="100%">
                <CameraView
                    onCapture={(capturedFile) => {
                        setFile(capturedFile);
                        handleScan(capturedFile);
                    }}
                    onScanStart={onScanStart}
                    loading={loading}
                    paused={paused}
                    autoAdd={autoAdd}
                    onAutoAddChange={onAutoAddChange}
                    autoCapture={autoCapture}
                    onAutoCaptureChange={onAutoCaptureChange}
                    loopActive={loopActive}
                    onLoopActiveChange={onLoopActiveChange}
                    manualCaptureDelay={manualCaptureDelay}
                    onManualCaptureDelayChange={onManualCaptureDelayChange}
                    autoCaptureDelay={autoCaptureDelay}
                    onAutoCaptureDelayChange={onAutoCaptureDelayChange}
                    onClear={handleClear}
                    preview={preview}
                    setPreview={setPreview}
                    voiceTrigger={voiceTrigger}
                />
            </Box>
        );
    }

    return (
        <Stack gap="md" maw={OCR_CONFIG.OCR_SCAN_MAX_WIDTH} w="100%" mx="auto">
            <Box
                style={{
                    borderRadius: "var(--mantine-radius-md)",
                    overflow: "hidden",
                    position: "relative",
                    height: OCR_CONFIG.CAMERA_VIEW_HEIGHT,
                    backgroundColor: preview ? "#000" : "transparent",
                    border: preview
                        ? "none"
                        : "2px dashed var(--mantine-color-gray-3)",
                }}
            >
                <LoadingOverlay
                    visible={loading}
                    overlayProps={{ blur: 2 }}
                    loaderProps={{ size: "md" }}
                />

                {!preview ? (
                    <Dropzone
                        onDrop={handleDrop}
                        maxSize={5 * 1024 ** 2}
                        accept={IMAGE_MIME_TYPE}
                        multiple={false}
                        loading={loading}
                        h="100%"
                        styles={{
                            root: {
                                border: "none",
                                borderRadius: 0,
                                backgroundColor: "var(--mantine-color-gray-0)",
                                transition: "all 0.2s ease",
                                cursor: "pointer",
                                "&:hover": {
                                    backgroundColor:
                                        "var(--mantine-color-gray-1)",
                                },
                            },
                        }}
                    >
                        <Center h="100%">
                            <Stack
                                align="center"
                                gap={4}
                                style={{ pointerEvents: "none" }}
                            >
                                {mode === "vision" ? (
                                    <IconScan
                                        size={48}
                                        color="var(--mantine-color-blue-6)"
                                        stroke={1.5}
                                    />
                                ) : (
                                    <IconPhoto
                                        size={48}
                                        color="var(--mantine-color-blue-6)"
                                        stroke={1.5}
                                    />
                                )}
                                <Text size="lg" inline fw={700}>
                                    {mode === "vision"
                                        ? "Drop for Vision Scan"
                                        : "Drop for Text OCR"}
                                </Text>
                                <Text size="xs" c="dimmed" inline mt={7}>
                                    Click or drag image here
                                </Text>
                            </Stack>
                        </Center>
                    </Dropzone>
                ) : (
                    <Image
                        src={preview}
                        alt="Preview"
                        style={{
                            height: "100%",
                            width: "100%",
                            objectFit: "contain",
                        }}
                    />
                )}
            </Box>

            {preview && (
                <Center>
                    <Button
                        color="blue"
                        radius="xl"
                        size="md"
                        leftSection={<IconRefresh size={20} />}
                        onClick={handleClear}
                        disabled={loading}
                    >
                        Change Image
                    </Button>
                </Center>
            )}
        </Stack>
    );
}
