"use client";

import { useState } from "react";
import { Modal, Stack, Image, Badge } from "@mantine/core";
import { APP_CONFIG } from "@/constants/app";

interface ImagePreviewModalProps {
    opened: boolean;
    onClose: () => void;
    src: string | null;
}

export function ImagePreviewModal({
    opened,
    onClose,
    src,
}: ImagePreviewModalProps) {
    const [imgDimensions, setImgDimensions] = useState<{
        w: number;
        h: number;
    } | null>(null);

    const handleClose = () => {
        setImgDimensions(null);
        onClose();
    };

    if (!src) return null;

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            size="auto"
            padding={0}
            centered
            withCloseButton={false}
            overlayProps={{
                backgroundOpacity: 0.55,
                blur: 3,
            }}
        >
            <Stack gap={0} align="center" pos="relative">
                <Image
                    src={src}
                    alt="Image Preview"
                    style={{
                        width: APP_CONFIG.PREVIEW_IMAGE_WIDTH,
                        height: "auto",
                        cursor: "pointer",
                    }}
                    onClick={handleClose}
                    onLoad={(e) => {
                        const img = e.currentTarget;
                        setImgDimensions({
                            w: img.naturalWidth,
                            h: img.naturalHeight,
                        });
                    }}
                />
                {imgDimensions && (
                    <Badge
                        variant="filled"
                        color="dark"
                        size="sm"
                        radius="xs"
                        pos="absolute"
                        bottom={8}
                        right={8}
                        style={{ opacity: 0.8, pointerEvents: "none" }}
                    >
                        {imgDimensions.w} × {imgDimensions.h} px
                    </Badge>
                )}
            </Stack>
        </Modal>
    );
}
