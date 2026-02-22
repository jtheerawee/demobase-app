import { Container, Title, Text, Button, Group, Stack } from "@mantine/core";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/utils/supabase/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Container size="md" py="xl">
      <Stack gap="md">
        <Title>{t("title")}</Title>
        <Text c="dimmed">{t("subtitle")}</Text>
        <Group>
          {user ? (
            <form action={`/${locale}/auth/signout`} method="post">
              <Button type="submit" variant="outline">
                Sign Out
              </Button>
            </form>
          ) : (
            <Link href="/auth/signin">
              <Button>Sign In with Google</Button>
            </Link>
          )}
        </Group>
        {user && (
          <Text size="sm" c="dimmed">
            Signed in as {user.email}
          </Text>
        )}
      </Stack>
    </Container>
  );
}
