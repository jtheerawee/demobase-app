import {
    Avatar,
    Badge,
    Box,
    Button,
    Container,
    Group,
    Text,
    Tooltip,
} from "@mantine/core";
import {
    IconNetwork,
    IconWorld,
} from "@tabler/icons-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import os from "os";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/utils/supabase/server";
import { DevTokenBadge } from "./DevTokenBadge";
import { SignInButton } from "./SignInButton";

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
            if (
                iface.family === "IPv4" &&
                !iface.internal
            ) {
                return iface.address;
            }
        }
    }
    return null;
}

import { BugReportButton } from "./BugReport/BugReportButton";

export async function Navbar() {
    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for");
    const clientIp = forwarded
        ? forwarded.split(",")[0].trim()
        : headerList.get("x-real-ip") || "127.0.0.1";

    const localIp = getLocalIp();
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    const t = await getTranslations("Navbar");

    let accessToken: string | undefined;
    if (
        process.env.NEXT_PUBLIC_DEVELOPER_MODE === "true" &&
        user
    ) {
        const {
            data: { session },
        } = await supabase.auth.getSession();
        accessToken = session?.access_token;
    }

    return (
        <Box
            component="nav"
            style={{
                borderBottom:
                    "1px solid var(--mantine-color-gray-3)",
            }}
        >
            <Container size="xl">
                <Group justify="space-between" h={60}>
                    <Group gap="lg">
                        <Link
                            href="/"
                            style={{
                                textDecoration: "none",
                            }}
                        >
                            <Text
                                fw={900}
                                c="orange"
                                style={{
                                    fontSize: "1.875rem",
                                    fontFamily: `'${process.env.NEXT_PUBLIC_FONT_FAMILY ?? "Kanit"}', sans-serif`,
                                }}
                            >
                                {process.env
                                    .NEXT_PUBLIC_APP_NAME ??
                                    "DemoBase"}
                            </Text>
                        </Link>

                        {/* {localIp && process.env.NEXT_PUBLIC_DEVELOPER_MODE === "true" && (
                            <Group gap={4}>
                                <Tooltip label="Local Server IP">
                                    <Badge
                                        variant="light"
                                        color="blue"
                                        size="sm"
                                        leftSection={<IconNetwork size={12} />}
                                        radius="sm"
                                        style={{ textTransform: 'none' }}
                                    >
                                        {localIp}:3001
                                    </Badge>
                                </Tooltip>

                                <Tooltip label="Your Public IP (Client)">
                                    <Badge
                                        variant="light"
                                        color="teal"
                                        size="sm"
                                        leftSection={<IconWorld size={12} />}
                                        radius="sm"
                                        style={{ textTransform: 'none' }}
                                    >
                                        {clientIp}
                                    </Badge>
                                </Tooltip>
                            </Group>
                        )} */}
                    </Group>

                    <Group gap="sm">
                        {/* {accessToken && <DevTokenBadge token={accessToken} />} */}

                        <BugReportButton />

                        {user && (
                            <Avatar
                                src={
                                    user.user_metadata
                                        ?.avatar_url
                                }
                                alt={
                                    user.user_metadata
                                        ?.full_name ??
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
                            <SignInButton
                                label={t("signIn")}
                            />
                        )}
                    </Group>
                </Group>
            </Container>
        </Box>
    );
}
