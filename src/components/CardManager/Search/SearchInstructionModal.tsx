"use client";

import { Modal, Stack, Text } from "@mantine/core";
import type { SearchMode } from "./SearchModeSwitcher";

interface SearchInstructionModalProps {
    opened: boolean;
    onClose: () => void;
    searchMode: SearchMode;
}

export function SearchInstructionModal({
    opened,
    onClose,
    searchMode,
}: SearchInstructionModalProps) {
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                searchMode === "text"
                    ? "How to use Text Search"
                    : "How to use Camera Scan"
            }
            size="lg"
            centered
        >
            {searchMode === "text" ? (
                <Stack gap="sm">
                    <Text fw={700}>Text Search Guide</Text>
                    <Text size="sm">
                        Enter the card name, set, or number to find cards in our
                        database. You can use the franchise and language filters
                        to narrow down your results.
                    </Text>
                </Stack>
            ) : (
                <Stack gap="sm">
                    <Text fw={700}>Camera Scan Guide</Text>
                    <Text size="sm">
                        Use your camera to identify cards instantly. Dual modes
                        allow for either precise OCR text detection or visual
                        matching. Enable "Auto-capture" for a faster workflow.
                    </Text>
                </Stack>
            )}
        </Modal>
    );
}
