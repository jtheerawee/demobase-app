"use client";

import { createClient } from "@/utils/supabase/client";
import {
    Button,
    Container,
    Stack,
    Title,
} from "@mantine/core";
import { useTranslations } from "next-intl";

export default function SignInPage() {
    const t = useTranslations("SignInPage");

    async function handleSignIn() {
        const supabase = createClient();
        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${location.origin}/auth/callback`,
            },
        });
    }

    return (
        <Container size="xs" py="xl">
            <Stack gap="lg" align="center">
                <Title order={2}>{t("title")}</Title>
                <Button size="md" onClick={handleSignIn}>
                    {t("signInWithGoogle")}
                </Button>
            </Stack>
        </Container>
    );
}
