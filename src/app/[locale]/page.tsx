import { Container, SimpleGrid, Stack } from "@mantine/core";
import { WidgetCard } from "@/components/WidgetCard";

export default async function HomePage() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
          <WidgetCard title="eBay" href="/ebay" />
          <WidgetCard title="eBay Active" href="/ebay/active" />
          <WidgetCard title="eBay Sold" href="/ebay/sold" />
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
