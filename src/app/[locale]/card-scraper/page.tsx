import { Container, Stack } from "@mantine/core";
import { PageHeader } from "@/components/PageHeader";
import { IconDatabaseExport } from "@tabler/icons-react";

export default function CardScraperPage() {
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
                {/* Content will go here */}
            </Stack>
        </Container>
    );
}
