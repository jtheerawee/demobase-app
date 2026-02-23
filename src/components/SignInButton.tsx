"use client";

import { createClient } from "@/utils/supabase/client";
import { Button } from "@mantine/core";

export function SignInButton({ label }: { label: string }) {
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
        <Button size="sm" onClick={handleSignIn}>
            {label}
        </Button>
    );
}
