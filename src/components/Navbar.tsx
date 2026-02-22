import { createClient } from "@/utils/supabase/server";
import { Link } from "@/i18n/navigation";
import { Box, Button, Container, Group, Text } from "@mantine/core";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { SignInButton } from "./SignInButton";
import { DevTokenBadge } from "./DevTokenBadge";

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

  let accessToken: string | undefined;
  if (process.env.DEVELOPER_MODE === "true" && user) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    accessToken = session?.access_token;
  }

  return (
    <Box
      component="nav"
      style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}
    >
      <Container size="xl">
        <Group justify="space-between" h={60}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <Text fw={900} style={{ fontSize: "1.875rem" }} c="orange">
              {process.env.NEXT_PUBLIC_APP_NAME ?? "DemoBase"}
            </Text>
          </Link>

          <Group gap="sm">
            {accessToken && <DevTokenBadge token={accessToken} />}

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
