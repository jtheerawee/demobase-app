"use client";

import { Container, SimpleGrid, Stack } from "@mantine/core";
import { PageHeader } from "@/components/PageHeader";
import { CardScraperCollectionList } from "@/components/CardScraper/CardScraperCollectionList";
import { CardScraperInputs } from "@/components/CardScraper/CardScraperInputs";
import { CardScraperRunningSteps } from "@/components/CardScraper/CardScraperRunningSteps";
import { CardScraperCardList } from "@/components/CardScraper/CardScraperCardList";
import { IconDatabaseExport } from "@tabler/icons-react";
import { useState } from "react";

export default function CardScraperPage() {
    const [selectedFranchise, setSelectedFranchise] = useState<string | null>(null);

    return (
        <Container size="xl" py="md">
            <Stack gap="lg">
                <PageHeader
                    title="Card Scraper"
                    description="Scrape and import cards from various sources"
                    icon={
                        <IconDatabaseExport
                            size={32}
                            color="var(--mantine-color-blue-6)"
                        />
                    }
                />

                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                    <Stack gap="md">
                        <CardScraperInputs
                            value={selectedFranchise}
                            onChange={setSelectedFranchise}
                        />
                        <CardScraperRunningSteps />
                    </Stack>

                    <div>
                        <CardScraperCollectionList
                            selectedFranchise={selectedFranchise}
                        />
                    </div>

                    <div>
                        <CardScraperCardList />
                    </div>
                </SimpleGrid>
            </Stack>
        </Container>
    );
}
