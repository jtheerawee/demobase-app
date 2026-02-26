"use client";

import { Grid, Card, Stack } from "@mantine/core";
import { APP_CONFIG } from "@/constants/app";
import { ReactNode } from "react";

interface MainLayoutProps {
    collection: ReactNode;
    results: ReactNode;
    controls: ReactNode;
}

export function MainLayout({ collection, results, controls }: MainLayoutProps) {
    return (
        <Grid
            gutter="md"
            align="flex-start"
            style={{ height: "calc(100vh - 180px)" }}
        >
            <Grid.Col
                span={{
                    base: 12,
                    md: APP_CONFIG.CARD_MANAGER_LAYOUT.COLLECTION_SPAN,
                }}
                h="100%"
            >
                <Card withBorder radius="md" padding="md" shadow="sm" h="100%">
                    <Stack gap="md" h="100%">
                        {collection}
                    </Stack>
                </Card>
            </Grid.Col>

            <Grid.Col
                span={{
                    base: 12,
                    md: APP_CONFIG.CARD_MANAGER_LAYOUT.RESULTS_SPAN,
                }}
                h="100%"
            >
                <Card withBorder radius="md" padding="md" shadow="sm" h="100%">
                    <Stack gap="md" h="100%">
                        {results}
                    </Stack>
                </Card>
            </Grid.Col>

            <Grid.Col
                span={{
                    base: 12,
                    md: APP_CONFIG.CARD_MANAGER_LAYOUT.CONTROLS_SPAN,
                }}
                h="100%"
            >
                <Card withBorder radius="md" padding="md" shadow="sm" h="100%">
                    <Stack gap="md" h="100%">
                        {controls}
                    </Stack>
                </Card>
            </Grid.Col>
        </Grid>
    );
}
