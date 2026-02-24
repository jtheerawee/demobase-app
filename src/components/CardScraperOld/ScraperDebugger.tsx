"use client";

import {
    ActionIcon,
    Button,
    Code,
    CopyButton,
    Divider,
    Group,
    Paper,
    ScrollArea,
    Stack,
    Text,
    Title,
    Tooltip,
} from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import type { DebugInfo } from "./types";

interface ScraperDebuggerProps {
    opened: boolean;
    debugInfo: DebugInfo | null;
}

export function ScraperDebugger({ opened: _opened, debugInfo }: ScraperDebuggerProps) {
    const fullDebugString = JSON.stringify(debugInfo, null, 2);

    return (
        <Paper withBorder p="md" bg="gray.0" pos="relative">
            <Group justify="space-between" mb="xs">
                <Title order={5} size="sm">
                    Scraper Debugger
                </Title>
                <CopyButton value={fullDebugString} timeout={2000}>
                    {({ copied, copy }) => (
                        <Button
                            color={copied ? "teal" : "gray"}
                            variant="light"
                            size="compact-xs"
                            leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                            onClick={copy}
                        >
                            {copied ? "Copied" : "Copy All JSON"}
                        </Button>
                    )}
                </CopyButton>
            </Group>

            <ScrollArea h={320} type="always">
                <Stack gap="xs">
                    <Group justify="space-between">
                        <Text size="xs" fw={700}>
                            Request Body:
                        </Text>
                        <CopyButton value={JSON.stringify(debugInfo?.request, null, 2)}>
                            {({ copied, copy }) => (
                                <Tooltip label={copied ? "Copied" : "Copy request"} withArrow position="left">
                                    <ActionIcon
                                        color={copied ? "teal" : "gray"}
                                        variant="subtle"
                                        onClick={copy}
                                        size="xs"
                                    >
                                        {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                    </ActionIcon>
                                </Tooltip>
                            )}
                        </CopyButton>
                    </Group>
                    <Code block style={{ fontSize: "10px" }}>
                        {JSON.stringify(debugInfo?.request, null, 2)}
                    </Code>

                    <Divider />

                    <Text size="xs" fw={700}>
                        Response Status: {debugInfo?.responseStatus}
                    </Text>

                    <Divider />

                    <Group justify="space-between">
                        <Text size="xs" fw={700}>
                            Response Body:
                        </Text>
                        <CopyButton
                            value={
                                typeof debugInfo?.responseBody === "object"
                                    ? JSON.stringify(debugInfo.responseBody, null, 2)
                                    : String(debugInfo?.responseBody)
                            }
                        >
                            {({ copied, copy }) => (
                                <Tooltip label={copied ? "Copied" : "Copy response"} withArrow position="left">
                                    <ActionIcon
                                        color={copied ? "teal" : "gray"}
                                        variant="subtle"
                                        onClick={copy}
                                        size="sm"
                                    >
                                        {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                    </ActionIcon>
                                </Tooltip>
                            )}
                        </CopyButton>
                    </Group>
                    <Code block style={{ fontSize: "10px" }}>
                        {typeof debugInfo?.responseBody === "object"
                            ? JSON.stringify(debugInfo.responseBody, null, 2)
                            : debugInfo?.responseBody || "No response body"}
                    </Code>

                    {debugInfo?.error && (
                        <>
                            <Divider />
                            <Group justify="space-between">
                                <Text size="xs" fw={700} color="red">
                                    Caught Error:
                                </Text>
                                <CopyButton value={debugInfo.error}>
                                    {({ copied, copy }) => (
                                        <Tooltip label={copied ? "Copied" : "Copy error"} withArrow position="left">
                                            <ActionIcon
                                                color={copied ? "teal" : "gray"}
                                                variant="subtle"
                                                onClick={copy}
                                                size="sm"
                                            >
                                                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                            </ActionIcon>
                                        </Tooltip>
                                    )}
                                </CopyButton>
                            </Group>
                            <Code color="red.1" block style={{ fontSize: "10px" }}>
                                {debugInfo.error}
                            </Code>
                        </>
                    )}
                </Stack>
            </ScrollArea>
        </Paper>
    );
}
