import { createClient } from "@/utils/supabase/server";
import { Link } from "@/i18n/navigation";
import { Box, Button, Container, Group, Text } from "@mantine/core";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { SignInButton } from "./SignInButton";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = await getTranslations("Navbar");

  return (
    <Box
      component="nav"
      style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}
    >
      <Container size="xl">
        <Group justify="space-between" h={60}>
          <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
            <Text fw={700} size="lg">
              demobase-app
            </Text>
          </Link>

          <Group gap="sm">
            {user ? (
              <form action={signOut}>
                <Button type="submit" variant="light" color="red" size="sm">
                  {t("signOut")}
                </Button>
              </form>
            ) : (
              <SignInButton label={t("signIn")} />
            )}
          </Group>
        </Group>
      </Container>
    </Box>
  );
}
