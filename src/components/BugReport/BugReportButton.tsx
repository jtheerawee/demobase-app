"use client";

import { ActionIcon, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBug } from "@tabler/icons-react";
import html2canvas from "html2canvas";
import { useState } from "react";
import { BugReportModal } from "./BugReportModal";

export function BugReportButton() {
    const [opened, setOpened] = useState(false);
    const [screenshot, setScreenshot] = useState<
        string | null
    >(null);
    const [isCapturing, setIsCapturing] = useState(false);

    const handleOpen = async () => {
        setIsCapturing(true);
        try {
            // Wait a tiny bit to ensure tooltips/hovers are gone if possible
            await new Promise((resolve) =>
                setTimeout(resolve, 100),
            );

            const canvas = await html2canvas(
                document.body,
                {
                    logging: false,
                    useCORS: true,
                    allowTaint: true,
                    scale: 1, // Full size
                },
            );

            const dataUrl = canvas.toDataURL("image/png");
            setScreenshot(dataUrl);
            setOpened(true);
        } catch (error) {
            console.error(
                "Failed to capture screenshot:",
                error,
            );
            notifications.show({
                title: "Capture Failed",
                message:
                    "Could not capture a screenshot, but you can still report the bug.",
                color: "orange",
            });
            setScreenshot(null);
            setOpened(true);
        } finally {
            setIsCapturing(false);
        }
    };

    return (
        <>
            <Tooltip label="Report a Bug">
                <ActionIcon
                    variant="light"
                    color="red"
                    size="lg"
                    radius="md"
                    onClick={handleOpen}
                    loading={isCapturing}
                >
                    <IconBug size={20} />
                </ActionIcon>
            </Tooltip>

            <BugReportModal
                opened={opened}
                onClose={() => setOpened(false)}
                screenshot={screenshot}
            />
        </>
    );
}
