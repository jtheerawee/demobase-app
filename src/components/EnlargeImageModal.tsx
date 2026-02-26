"use client";

import { Modal, Image } from "@mantine/core";

interface EnlargeImageModalProps {
    opened: boolean;
    onClose: () => void;
    preview: string | null;
    title?: string;
}

export function EnlargeImageModal({
    opened,
    onClose,
    preview,
    title = "Enlarged Image",
}: EnlargeImageModalProps) {
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={title}
            size="lg"
            centered
            overlayProps={{ blur: 3 }}
        >
            <Image
                src={preview || ""}
                radius="md"
                style={{
                    width: "100%",
                    maxHeight: "70vh",
                    objectFit: "contain",
                }}
            />
        </Modal>
    );
}
