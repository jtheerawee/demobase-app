"use client";

import { ActionIcon, Tooltip } from "@mantine/core";
import { IconPlayerStop } from "@tabler/icons-react";

interface StopScraperButtonProps {
    onStop?: () => void;
    loading?: boolean;
}

export function StopScraperButton({ onStop, loading }: StopScraperButtonProps) {
    if (!onStop) return null;

    return (
        <Tooltip label="Stop Scraping">
            <ActionIcon
                color="red"
                variant="light"
                size="sm"
                onClick={onStop}
                loading={loading}
            >
                <IconPlayerStop size={14} />
            </ActionIcon>
        </Tooltip>
    );
}
