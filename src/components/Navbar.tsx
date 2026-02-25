import { createClient } from "@/utils/supabase/server";
import { Link } from "@/i18n/navigation";
import { Box, Button, Container, Group, Text, Avatar, Badge } from "@mantine/core";
import { IconNetwork } from "@tabler/icons-react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { SignInButton } from "./SignInButton";
import { DevTokenBadge } from "./DevTokenBadge";

import os from "os";

async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/");
}

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name] || []) {
            if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
            }
        }
    }
    return null;
}

export async function Navbar() {
    const localIp = getLocalIp();
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    const t = await getTranslations("Navbar");

    let accessToken: string | undefined;
    if (process.env.NEXT_PUBLIC_DEVELOPER_MODE === "true" && user) {
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
                    <Group gap="lg">
                        <Link href="/" style={{ textDecoration: "none" }}>
                            <Text
                                fw={900}
                                c="orange"
                                style={{
                                    fontSize: "1.875rem",
                                    fontFamily: `'${process.env.NEXT_PUBLIC_FONT_FAMILY ?? "Kanit"}', sans-serif`,
                                }}
                            >
                                {process.env.NEXT_PUBLIC_APP_NAME ?? "DemoBase"}
                            </Text>
                        </Link>

                        {localIp && process.env.NEXT_PUBLIC_DEVELOPER_MODE === "true" && (
                            <Badge
                                variant="light"
                                color="blue"
                                size="lg"
                                leftSection={<IconNetwork size={14} />}
                                radius="sm"
                                style={{ textTransform: 'none' }}
                            >
                                {localIp}:3001
                            </Badge>
                        )}
                    </Group>

                    <Group gap="sm">
                        {accessToken && <DevTokenBadge token={accessToken} />}

                        {user && (
                            <Avatar
                                src={user.user_metadata?.avatar_url}
                                alt={
                                    user.user_metadata?.full_name ??
                                    user.email ??
                                    ""
                                }
                                radius="xl"
                                size="sm"
                            />
                        )}

                        {user ? (
                            <form action={signOut}>
                                <Button
                                    type="submit"
                                    variant="light"
                                    color="red"
                                    size="sm"
                                >
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
