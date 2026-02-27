"use client";

import {
    ActionIcon,
    CopyButton,
    Group,
    Text,
    Tooltip,
} from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";

export function DevTokenBadge({
    token,
}: {
    token: string;
}) {
    return (
        <Group
            gap={4}
            style={{
                background: "var(--mantine-color-orange-0)",
                border: "1px solid var(--mantine-color-orange-3)",
                borderRadius: "var(--mantine-radius-sm)",
                padding: "2px 8px",
            }}
        >
            <Text size="xs" c="orange" fw={700}>
                DEV
            </Text>
            <Text
                size="xs"
                ff="monospace"
                style={{
                    maxWidth: 140,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                }}
            >
                {token}
            </Text>
            <CopyButton value={token}>
                {({ copied, copy }) => (
                    <Tooltip
                        label={
                            copied
                                ? "Copied!"
                                : "Copy token"
                        }
                        withArrow
                    >
                        <ActionIcon
                            size="xs"
                            variant="subtle"
                            color={
                                copied ? "teal" : "orange"
                            }
                            onClick={copy}
                        >
                            {copied ? (
                                <IconCheck size={12} />
                            ) : (
                                <IconCopy size={12} />
                            )}
                        </ActionIcon>
                    </Tooltip>
                )}
            </CopyButton>
        </Group>
    );
}
