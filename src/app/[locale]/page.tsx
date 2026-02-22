import { createClient } from "@/utils/supabase/server";
import { getTranslations } from "next-intl/server";
import { Container, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { WidgetCard } from "@/components/WidgetCard";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = await getTranslations("HomePage");

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Stack gap="xs">
          <Title order={1}>{t("title")}</Title>
          {user && (
            <Text c="dimmed">
              {t("welcome", { name: user.user_metadata?.full_name ?? user.email })}
            </Text>
          )}
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
          <WidgetCard title="eBay" href="/ebay" />
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
