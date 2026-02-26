"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    Text,
    Stack,
    Loader,
    Box,
    LoadingOverlay,
    Center,
} from "@mantine/core";
import { FileWithPath } from "@mantine/dropzone";
import { notifications } from "@mantine/notifications";
import { APP_CONFIG } from "@/constants/app";
import { OCR_CONFIG } from "@/constants/ocr";
import { ImageThumbnail } from "./ImageThumbnail";
import { ImagePreviewModal } from "@/components/ImagePreviewModal";
import { AutoOptions } from "./AutoOptions";
import { CameraStatus } from "./CameraStatus";
import { CameraShutter, useAutoCapture } from "./CameraShutter";
import { CameraDevices, useCameraDevices } from "./CameraDevices";

interface CameraViewProps {
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

export function CameraView({
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
    setPreview,
}: CameraViewProps) {
    const [cameraActive, setCameraActive] = useState(false);
    const { devices, selectedDeviceId, setSelectedDeviceId, loadDevices } = useCameraDevices();
    const [isEnlarged, setIsEnlarged] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const loopActiveRef = useRef(loopActive);

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
                    : { facingMode: "environment" },
            };

            const stream =
                await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            setCameraActive(true);
            loadDevices();
        } catch (err) {
            console.error("Camera error:", err);
            notifications.show({
                title: "Camera Error",
                message: "Could not access camera. Please check permissions.",
                color: "red",
                autoClose: APP_CONFIG.NOTIFICATION_AUTO_CLOSE,
            });
        }
    };

    const capturePhoto = useCallback(() => {
        if (!videoRef.current) return;
        if (autoCapture && !loopActiveRef.current) {
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
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const capturedFile = new File(
                            [blob],
                            `capture-${Date.now()}.jpg`,
                            { type: "image/jpeg" },
                        ) as FileWithPath;
                        const url = URL.createObjectURL(capturedFile);
                        setPreview(url);
                        onCapture(capturedFile);
                    }
                },
                "image/jpeg",
                0.9,
            );
        }
    }, [autoCapture, onLoopActiveChange, preview, setPreview, onScanStart, onCapture]);

    const handleDeviceChange = (deviceId: string | null) => {
        if (deviceId) {
            setSelectedDeviceId(deviceId);
            startCamera(deviceId);
        }
    };

    useEffect(() => {
        loopActiveRef.current = loopActive;
    }, [loopActive]);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    useEffect(() => {
        if (cameraActive && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [cameraActive, selectedDeviceId]);

    const countdown = useAutoCapture({
        autoCapture,
        loopActive,
        cameraActive,
        paused,
        autoCaptureInterval,
        onCapture: capturePhoto,
    });

    return (
        <Stack gap="md" w="100%">
            <Box
                style={{
                    borderRadius: "var(--mantine-radius-md)",
                    overflow: "hidden",
                    position: "relative",
                    height: OCR_CONFIG.CAMERA_VIEW_HEIGHT,
                    backgroundColor: "#000",
                }}
            >
                <LoadingOverlay
                    visible={loading}
                    overlayProps={{ blur: 2 }}
                    loaderProps={{ size: "md" }}
                />

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
                            style={{
                                width: "100%",
                                height: "100%",
                                display: "block",
                                objectFit: "contain",
                            }}
                        />
                        <CameraDevices
                            devices={devices}
                            selectedDeviceId={selectedDeviceId}
                            onDeviceChange={handleDeviceChange}
                        />
                    </>
                )}

                <CameraStatus
                    autoCapture={autoCapture}
                    countdown={countdown}
                    paused={paused}
                    loopActive={loopActive}
                />
            </Box>

            <Box pos="relative" w="100%">
                <CameraShutter
                    loading={loading}
                    cameraActive={cameraActive}
                    autoCapture={autoCapture}
                    loopActive={loopActive}
                    onCapture={capturePhoto}
                    onLoopActiveChange={onLoopActiveChange}
                    onClear={onClear}
                />

                <ImageThumbnail
                    preview={preview || null}
                    onEnlarge={() => setIsEnlarged(true)}
                />
            </Box>

            <ImagePreviewModal
                opened={isEnlarged}
                onClose={() => setIsEnlarged(false)}
                src={preview || null}
                title="Last Captured Snapshot"
            />

            <AutoOptions
                autoAdd={autoAdd}
                onAutoAddChange={onAutoAddChange}
                autoCapture={autoCapture}
                onAutoCaptureChange={onAutoCaptureChange}
                autoCaptureInterval={autoCaptureInterval}
                onAutoCaptureIntervalChange={onAutoCaptureIntervalChange}
            />
        </Stack>
    );
}
