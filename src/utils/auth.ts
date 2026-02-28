import { createClient } from "./supabase/server";

export async function getUserRole() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return 0;

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();

    return profile?.role ?? 0;
}

export async function isAdmin() {
    const role = await getUserRole();
    return role === 2;
}
