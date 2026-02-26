import { Container, SimpleGrid, Stack } from "@mantine/core";
import { WidgetCard } from "@/components/WidgetCard";
import {
    IconDatabaseExport,
    IconLayoutDashboard,
    IconShoppingCart,
} from "@tabler/icons-react";

export default async function HomePage() {
    return (
        <Container size="xl" py="xl">
            <Stack gap="xl">
                <SimpleGrid
                    cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
                    spacing="md"
                >
                    <WidgetCard
                        title="eBay Assistance"
                        href="/ebay/assistance"
                        icon={
                            <IconShoppingCart
                                size={24}
                                color="var(--mantine-color-orange-6)"
                            />
                        }
                    />
                    <WidgetCard
                        title="Card Scraper"
                        href="/card-scraper"
                        icon={
                            <IconDatabaseExport
                                size={24}
                                color="var(--mantine-color-blue-6)"
                            />
                        }
                    />
                    <WidgetCard
                        title="Card Manager"
                        href="/card-manager"
                        icon={
                            <IconLayoutDashboard
                                size={24}
                                color="var(--mantine-color-grape-6)"
                            />
                        }
                    />
                </SimpleGrid>
            </Stack>
        </Container>
    );
}
