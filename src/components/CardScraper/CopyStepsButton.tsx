"use client";

import { ActionIcon, CopyButton, Tooltip } from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";

interface CopyStepsButtonProps {
    value: string;
    hasSteps: boolean;
}

export function CopyStepsButton({ value, hasSteps }: CopyStepsButtonProps) {
    if (!hasSteps) return null;

    return (
        <CopyButton value={value}>
            {({ copied, copy }) => (
                <Tooltip label={copied ? "Copied all!" : "Copy all steps"}>
                    <ActionIcon
                        variant="subtle"
                        color={copied ? "green" : "gray"}
                        size="sm"
                        onClick={copy}
                    >
                        {copied ? (
                            <IconCheck size={14} />
                        ) : (
                            <IconCopy size={14} />
                        )}
                    </ActionIcon>
                </Tooltip>
            )}
        </CopyButton>
    );
}
