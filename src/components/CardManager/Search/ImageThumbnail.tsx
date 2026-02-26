"use client";

import { Box, Tooltip, Image } from "@mantine/core";
import { IconMaximize } from "@tabler/icons-react";

interface ImageThumbnailProps {
    preview: string | null;
    onEnlarge: () => void;
}

export function ImageThumbnail({ preview, onEnlarge }: ImageThumbnailProps) {
    if (!preview) return null;

    return (
        <Box
            pos="absolute"
            right={0}
            top="50%"
            style={{ transform: "translateY(-50%)" }}
        >
            <Tooltip
                label="Click to enlarge last snapshot"
                position="top"
            >
                <Box
                    pos="relative"
                    onClick={onEnlarge}
                    style={{
                        cursor: "pointer",
                        borderRadius: "4px",
                        overflow: "hidden",
                        border: "2px solid var(--mantine-color-blue-4)",
                        boxShadow: "var(--mantine-shadow-xs)",
                        transition: "transform 0.1s ease",
                        "&:hover": { transform: "scale(1.05)" },
                    }}
                >
                    <Image
                        src={preview}
                        w={48}
                        h={48}
                        fallbackSrc="https://placehold.co/48x48?text=Scan"
                        style={{ objectFit: "cover" }}
                    />
                    <Box
                        pos="absolute"
                        bottom={2}
                        right={2}
                        bg="rgba(0,0,0,0.5)"
                        style={{
                            borderRadius: "2px",
                            display: "flex",
                            padding: 1,
                        }}
                    >
                        <IconMaximize size={8} color="white" />
                    </Box>
                </Box>
            </Tooltip>
        </Box>
    );
}
