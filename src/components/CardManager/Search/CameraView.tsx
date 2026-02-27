"use client";

import {
    useState,
    useRef,
    useEffect,
    useCallback,
} from "react";
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
import { CameraShutter } from "./CameraShutter";
import {
    CameraDevices,
    useCameraDevices,
} from "./CameraDevices";

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
    manualCaptureDelay?: number;
    onManualCaptureDelayChange?: (val: number) => void;
    autoCaptureDelay?: number;
    onAutoCaptureDelayChange?: (val: number) => void;
    onClear?: () => void;
    preview?: string | null;
    setPreview: (url: string | null) => void;
}

function useDelayCapture(
    delaySeconds: number,
    onCapture: () => void,
) {
    const [delayCount, setDelayCount] = useState<
        number | null
    >(null);
    const [fading, setFading] = useState(false);
    const cancelRef = useRef(false);

    const trigger = useCallback(() => {
        if (delaySeconds <= 0) {
            onCapture();
            return;
        }
        cancelRef.current = false;
        setDelayCount(delaySeconds);
        setFading(false);

        let current = delaySeconds;
        const tick = () => {
            if (cancelRef.current) return;
            setFading(true);
            setTimeout(() => {
                if (cancelRef.current) return;
                current -= 1;
                if (current <= 0) {
                    setDelayCount(null);
                    setFading(false);
                    onCapture();
                } else {
                    setDelayCount(current);
                    setFading(false);
                    setTimeout(tick, 50);
                }
            }, 700);
        };
        setTimeout(tick, 50);
    }, [delaySeconds, onCapture]);

    const cancel = useCallback(() => {
        cancelRef.current = true;
        setDelayCount(null);
        setFading(false);
    }, []);

    return { delayCount, fading, trigger, cancel };
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
    manualCaptureDelay = OCR_CONFIG.MANUAL_CAPTURE_DELAY,
    onManualCaptureDelayChange,
    autoCaptureDelay = OCR_CONFIG.AUTO_CAPTURE_DELAY,
    onAutoCaptureDelayChange,
    onClear,
    preview,
    setPreview,
}: CameraViewProps) {
    const [cameraActive, setCameraActive] = useState(false);
    const {
        devices,
        selectedDeviceId,
        setSelectedDeviceId,
        loadDevices,
        getSavedDeviceId,
    } = useCameraDevices();
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
                await navigator.mediaDevices.getUserMedia(
                    constraints,
                );
            streamRef.current = stream;
            setCameraActive(true);
            loadDevices();
        } catch (err) {
            console.error("Camera error:", err);
            notifications.show({
                title: "Camera Error",
                message:
                    "Could not access camera. Please check permissions.",
                color: "red",
                autoClose:
                    APP_CONFIG.NOTIFICATION_AUTO_CLOSE,
            });
        }
    };

    const playShutterSound = useCallback(() => {
        const ctx = new AudioContext();
        const t = ctx.currentTime;

        // Click: short sine burst
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(
            400,
            t + 0.04,
        );
        oscGain.gain.setValueAtTime(0.4, t);
        oscGain.gain.exponentialRampToValueAtTime(
            0.001,
            t + 0.05,
        );
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.05);

        // Tail: white noise burst
        const bufferSize = ctx.sampleRate * 0.08;
        const buffer = ctx.createBuffer(
            1,
            bufferSize,
            ctx.sampleRate,
        );
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++)
            data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.15, t + 0.01);
        noiseGain.gain.exponentialRampToValueAtTime(
            0.001,
            t + 0.09,
        );
        noise.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(t + 0.01);

        osc.onended = () => ctx.close();
    }, []);

    const capturePhoto = useCallback(() => {
        if (!videoRef.current) return;
        if (autoCapture && !loopActiveRef.current) {
            onLoopActiveChange?.(true);
        }

        playShutterSound();

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
                        const url =
                            URL.createObjectURL(
                                capturedFile,
                            );
                        setPreview(url);
                        onCapture(capturedFile);
                    }
                },
                "image/jpeg",
                0.9,
            );
        }
    }, [
        autoCapture,
        onLoopActiveChange,
        preview,
        setPreview,
        onScanStart,
        onCapture,
        playShutterSound,
    ]);

    const handleDeviceChange = (
        deviceId: string | null,
    ) => {
        if (deviceId) {
            setSelectedDeviceId(deviceId);
            startCamera(deviceId);
        }
    };

    useEffect(() => {
        loopActiveRef.current = loopActive;
    }, [loopActive]);

    useEffect(() => {
        startCamera(getSavedDeviceId() ?? undefined);
        return () => stopCamera();
    }, []);

    useEffect(() => {
        if (
            cameraActive &&
            videoRef.current &&
            streamRef.current
        ) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [cameraActive, selectedDeviceId]);

    const {
        delayCount: manualDelayCount,
        fading: manualFading,
        trigger: triggerManual,
        cancel: cancelManual,
    } = useDelayCapture(manualCaptureDelay, capturePhoto);
    const {
        delayCount: autoDelayCount,
        fading: autoFading,
        trigger: triggerAuto,
        cancel: cancelAuto,
    } = useDelayCapture(autoCaptureDelay, capturePhoto);

    const delayCount = autoCapture
        ? autoDelayCount
        : manualDelayCount;
    const fading = autoCapture ? autoFading : manualFading;

    // Cancel delays when loop stops
    useEffect(() => {
        if (!loopActive) {
            cancelManual();
            cancelAuto();
        }
    }, [loopActive, cancelManual, cancelAuto]);

    // Re-trigger auto delay after each scan completes if loop is active and not paused
    const prevLoadingRef = useRef(loading);
    useEffect(() => {
        const wasLoading = prevLoadingRef.current;
        prevLoadingRef.current = loading;
        if (
            wasLoading &&
            !loading &&
            loopActive &&
            !paused &&
            cameraActive
        ) {
            triggerAuto();
        }
    }, [
        loading,
        loopActive,
        paused,
        cameraActive,
        triggerAuto,
    ]);

    return (
        <Stack gap="md" w="100%">
            <Box
                style={{
                    borderRadius:
                        "var(--mantine-radius-md)",
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
                    <Center
                        h="100%"
                        bg="var(--mantine-color-gray-0)"
                    >
                        <Stack align="center" gap="sm">
                            <Loader size="md" />
                            <Text fw={700}>
                                Starting Camera...
                            </Text>
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
                            selectedDeviceId={
                                selectedDeviceId
                            }
                            onDeviceChange={
                                handleDeviceChange
                            }
                        />
                    </>
                )}

                {delayCount !== null && (
                    <Center
                        style={{
                            position: "absolute",
                            inset: 0,
                            zIndex: 12,
                            pointerEvents: "none",
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 120,
                                fontWeight: 900,
                                color: "#fff",
                                lineHeight: 1,
                                textShadow:
                                    "0 0 40px rgba(0,0,0,0.8)",
                                transition: fading
                                    ? "opacity 0.65s ease-out, transform 0.65s ease-out"
                                    : "none",
                                opacity: fading ? 0 : 1,
                                transform: fading
                                    ? "scale(1.5)"
                                    : "scale(1)",
                            }}
                        >
                            {delayCount}
                        </Text>
                    </Center>
                )}
            </Box>

            <Box pos="relative" w="100%">
                <CameraShutter
                    loading={loading}
                    cameraActive={cameraActive}
                    autoCapture={autoCapture}
                    loopActive={loopActive}
                    onCapture={
                        autoCapture
                            ? triggerAuto
                            : triggerManual
                    }
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
                manualCaptureDelay={manualCaptureDelay}
                onManualCaptureDelayChange={
                    onManualCaptureDelayChange
                }
                autoCaptureDelay={autoCaptureDelay}
                onAutoCaptureDelayChange={
                    onAutoCaptureDelayChange
                }
            />
        </Stack>
    );
}
