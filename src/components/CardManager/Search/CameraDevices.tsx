import { useState } from "react";
import { Box, Select } from "@mantine/core";
import { APP_CONFIG } from "@/constants/app";

interface CameraDevicesProps {
    devices: { value: string; label: string }[];
    selectedDeviceId: string | null;
    onDeviceChange: (deviceId: string | null) => void;
}

export function CameraDevices({
    devices,
    selectedDeviceId,
    onDeviceChange,
}: CameraDevicesProps) {
    if (devices.length <= 1) return null;

    return (
        <Box pos="absolute" top={10} left={10} w={APP_CONFIG.CAMERA_DEVICES_WIDTH} style={{ zIndex: 10 }}>
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

export function useCameraDevices() {
    const [devices, setDevices] = useState<{ value: string; label: string }[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

    const loadDevices = async () => {
        try {
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = allDevices
                .filter((device) => device.kind === "videoinput")
                .map((device) => ({
                    value: device.deviceId,
                    label: device.label || `Camera ${device.deviceId.slice(0, 5)}...`,
                }));
            setDevices(videoDevices);

            if (videoDevices.length > 0 && !selectedDeviceId) {
                setSelectedDeviceId(videoDevices[0].value);
            }
        } catch (err) {
            console.error("Error loading devices:", err);
        }
    };

    return { devices, selectedDeviceId, setSelectedDeviceId, loadDevices };
}
