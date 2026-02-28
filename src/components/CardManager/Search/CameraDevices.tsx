import { Box, Select } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { useState } from "react";
import { CARD_MANAGER_CONFIG } from "@/constants/card_manager";

interface CameraDevicesProps {
    devices: { value: string; label: string }[];
    selectedDeviceId: string | null;
    onDeviceChange: (deviceId: string | null) => void;
}

export function CameraDevices({ devices, selectedDeviceId, onDeviceChange }: CameraDevicesProps) {
    if (devices.length <= 1) return null;

    return (
        <Box pos="absolute" top={10} left={10} w={CARD_MANAGER_CONFIG.CAMERA_DEVICES_WIDTH} style={{ zIndex: 10 }}>
            <Select
                size="xs"
                placeholder="Select Camera"
                data={devices}
                value={selectedDeviceId}
                onChange={onDeviceChange}
                styles={{
                    input: {
                        backgroundColor: "rgba(255,255,255,0.8)",
                        backdropFilter: "blur(4px)",
                        borderColor: "transparent",
                    },
                }}
            />
        </Box>
    );
}

const STORAGE_KEY = "preferred-camera-device";

export function useCameraDevices() {
    const [devices, setDevices] = useState<{ value: string; label: string }[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useLocalStorage<string | null>({
        key: STORAGE_KEY,
        defaultValue: null,
    });

    // Read saved device directly from localStorage — guaranteed to be available immediately,
    // even before React state hydration completes.
    const getSavedDeviceId = () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? (JSON.parse(raw) as string) : null;
        } catch {
            return null;
        }
    };

    const loadDevices = async () => {
        try {
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = allDevices
                .filter((device) => device.kind === "videoinput" && device.deviceId)
                .map((device) => ({
                    value: device.deviceId,
                    label: device.label || `Camera ${device.deviceId.slice(0, 5)}...`,
                }));
            setDevices(videoDevices);

            // Only fall back to first device if nothing is saved
            setSelectedDeviceId((prev) => {
                if (prev && videoDevices.some((d) => d.value === prev)) return prev;
                if (!prev && videoDevices.length > 0) return videoDevices[0].value;
                return prev;
            });
        } catch (err) {
            console.error("Error loading devices:", err);
        }
    };

    return {
        devices,
        selectedDeviceId,
        setSelectedDeviceId,
        loadDevices,
        getSavedDeviceId,
    };
}
