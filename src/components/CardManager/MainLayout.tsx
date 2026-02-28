"use client";

import { Card, Grid } from "@mantine/core";
import type { ReactNode } from "react";
import { CARD_MANAGER_CONFIG } from "@/constants/card_manager";

interface MainLayoutProps {
    collection: ReactNode;
    results: ReactNode;
    controls: ReactNode;
}

export function MainLayout({ collection, results, controls }: MainLayoutProps) {
    return (
        <Grid gutter="md" align="flex-start" style={{ height: "calc(100vh - 180px)" }}>
            <Grid.Col
                span={{
                    base: 12,
                    md: CARD_MANAGER_CONFIG.LAYOUT.COLLECTION_SPAN,
                }}
                h="100%"
            >
                <Card withBorder radius="md" padding={0} shadow="sm" h="100%">
                    {collection}
                </Card>
            </Grid.Col>

            <Grid.Col
                span={{
                    base: 12,
                    md: CARD_MANAGER_CONFIG.LAYOUT.RESULTS_SPAN,
                }}
                h="100%"
            >
                <Card withBorder radius="md" padding={0} shadow="sm" h="100%">
                    {results}
                </Card>
            </Grid.Col>

            <Grid.Col
                span={{
                    base: 12,
                    md: CARD_MANAGER_CONFIG.LAYOUT.CONTROLS_SPAN,
                }}
                h="100%"
            >
                <Card withBorder radius="md" padding={0} shadow="sm" h="100%">
                    {controls}
                </Card>
            </Grid.Col>
        </Grid>
    );
}
