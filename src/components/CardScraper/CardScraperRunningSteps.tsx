"use client";

import { Card, Stack, Text, Group, Badge, ScrollArea, Box } from "@mantine/core";
import { IconCircleCheck, IconCircleDashed, IconLoader2, IconAlertCircle } from "@tabler/icons-react";

interface Step {
    id: string;
    message: string;
    status: "pending" | "running" | "completed" | "error";
    timestamp: string;
}

const MOCK_STEPS: Step[] = [
    { id: "1", message: "Initializing scraper engine...", status: "completed", timestamp: "10:43:01" },
    { id: "2", message: "Connecting to franchise database...", status: "completed", timestamp: "10:43:05" },
    { id: "3", message: "Fetching card metadata...", status: "running", timestamp: "10:43:10" },
    { id: "4", message: "Downloading image assets (0/156)", status: "pending", timestamp: "10:43:10" },
];

export function CardScraperRunningSteps() {
    return (
        <Card withBorder radius="md" padding="md" shadow="sm">
            <Stack gap="sm">
                <Group justify="space-between">
                    <Text fw={600} size="sm">Running Steps</Text>
                    <Badge variant="dot" color="blue" size="sm">Active</Badge>
                </Group>

                <ScrollArea h={200} offsetScrollbars>
                    <Stack gap="xs">
                        {MOCK_STEPS.map((step) => (
                            <Group key={step.id} gap="sm" align="flex-start" wrap="nowrap">
                                <Box mt={2}>
                                    {step.status === "completed" && <IconCircleCheck size={16} color="var(--mantine-color-green-6)" />}
                                    {step.status === "running" && <IconLoader2 size={16} color="var(--mantine-color-blue-6)" className="animate-spin" style={{ animation: 'spin 2s linear infinite' }} />}
                                    {step.status === "pending" && <IconCircleDashed size={16} color="var(--mantine-color-gray-4)" />}
                                    {step.status === "error" && <IconAlertCircle size={16} color="var(--mantine-color-red-6)" />}
                                </Box>
                                <Stack gap={0} style={{ flex: 1 }}>
                                    <Text size="xs" fw={500} lineClamp={1}>
                                        {step.message}
                                    </Text>
                                    <Text size="10px" c="dimmed">
                                        {step.timestamp}
                                    </Text>
                                </Stack>
                            </Group>
                        ))}
                    </Stack>
                </ScrollArea>
            </Stack>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin {
                    animation: spin 2s linear infinite;
                }
            `}</style>
        </Card>
    );
}
