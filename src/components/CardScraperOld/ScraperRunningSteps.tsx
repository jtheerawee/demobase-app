"use client";

import { Group, Paper, ScrollArea, Stack, Text, Title } from "@mantine/core";
import type { ScraperStep } from "./types";

interface ScraperRunningStepsProps {
    steps: ScraperStep[];
}

export function ScraperRunningSteps({ steps }: ScraperRunningStepsProps) {
    return (
        <Stack gap={4}>
            <Title order={6} px="xs" c="gray.7">
                Running Steps
            </Title>
            <Paper withBorder radius="md" p="xs" bg="white">
                <ScrollArea h={180}>
                    <Stack gap={4}>
                        {steps.length > 0 ? (
                            [...steps].reverse().map((step, i) => (
                                <Group key={i} gap="xs" wrap="nowrap" align="flex-start">
                                    <Text size="10px" c="dimmed" mt={2} style={{ whiteSpace: "nowrap" }}>
                                        [{step.timestamp}]
                                    </Text>
                                    <Text size="xs" fw={500} color="gray.8" style={{ lineHeight: 1.4 }}>
                                        {step.message.split(/(<red>.*?<\/red>)/g).map((part, index) => {
                                            if (part.startsWith("<red>") && part.endsWith("</red>")) {
                                                const content = part.replace("<red>", "").replace("</red>", "");
                                                return <Text span key={index} c="red.7" fw={700}>{content}</Text>;
                                            }
                                            return <span key={index}>{part}</span>;
                                        })}
                                    </Text>
                                </Group>
                            ))
                        ) : (
                            <Text size="xs" c="dimmed" ta="center" py="md">
                                Waiting for action...
                            </Text>
                        )}
                    </Stack>
                </ScrollArea>
            </Paper>
        </Stack>
    );
}
