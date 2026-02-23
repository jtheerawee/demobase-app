"use client";

import { Code, Paper, ScrollArea, Stack, Tabs, Text } from "@mantine/core";
import { IconBug } from "@tabler/icons-react";

interface EbayApiInspectorProps {
    activeRaw: any;
    soldRaw: any;
}

export function EbayApiInspector({
    activeRaw,
    soldRaw,
}: EbayApiInspectorProps) {
    if (!activeRaw && !soldRaw) return null;

    return (
        <Paper
            withBorder
            radius="md"
            p="md"
            bg="rgba(0, 0, 0, 0.02)"
            style={{ backdropFilter: "blur(10px)" }}
        >
            <Stack gap="xs">
                <Text
                    size="xs"
                    fw={700}
                    c="dimmed"
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                >
                    <IconBug size={14} /> API INSPECTOR (RAW RESPONSE)
                </Text>

                <Tabs
                    color="orange"
                    defaultValue="active"
                    variant="outline"
                    styles={{
                        tab: { fontSize: 10, padding: "4px 8px" },
                    }}
                >
                    <Tabs.List>
                        <Tabs.Tab value="active">
                            Active (
                            {Array.isArray(activeRaw)
                                ? activeRaw.length
                                : activeRaw?.items?.length || 0}
                            )
                        </Tabs.Tab>
                        <Tabs.Tab value="sold">
                            Sold (
                            {Array.isArray(soldRaw)
                                ? soldRaw.length
                                : soldRaw?.items?.length || 0}
                            )
                        </Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="active" pt="xs">
                        <ScrollArea h={300} type="always" offsetScrollbars>
                            <Code block style={{ fontSize: 10 }}>
                                {JSON.stringify(activeRaw, null, 2)}
                            </Code>
                        </ScrollArea>
                    </Tabs.Panel>

                    <Tabs.Panel value="sold" pt="xs">
                        <ScrollArea h={300} type="always" offsetScrollbars>
                            <Code block style={{ fontSize: 10 }}>
                                {JSON.stringify(soldRaw, null, 2)}
                            </Code>
                        </ScrollArea>
                    </Tabs.Panel>
                </Tabs>
            </Stack>
        </Paper>
    );
}
