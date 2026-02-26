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
