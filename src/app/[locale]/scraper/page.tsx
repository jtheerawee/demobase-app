"use client";

import { Button, Container, Paper, Stack, Text } from "@mantine/core";
import { IconDatabaseExport } from "@tabler/icons-react";
import { PageHeader } from "@/components/PageHeader";
import { useTranslations } from "next-intl";

export default function CardScraperPage() {
    return (
        <Container size="lg" py="xl">
            <Stack gap="xl">
                <PageHeader
                    title="Card Scraper"
                    description="Extract and process card data from various sources."
                    icon={
                        <IconDatabaseExport
                            size={32}
                            stroke={1.5}
                            color="var(--mantine-color-blue-6)"
                        />
                    }
                />

                <Paper withBorder p="xl" radius="md" style={{ textAlign: "center" }}>
                    <Text size="lg" fw={500} mb="md">Initialize Scraper</Text>
                    <Text c="dimmed" mb="xl">
                        This module will allow you to scrape card data. Integration is currently in progress.
                    </Text>
                    <Button variant="light" color="blue" disabled>
                        Coming Soon
                    </Button>
                </Paper>
            </Stack>
        </Container>
    );
}
