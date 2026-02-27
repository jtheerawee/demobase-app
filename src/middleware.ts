import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import {
    type NextRequest,
    NextResponse,
} from "next/server";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

export async function middleware(request: NextRequest) {
    // Run next-intl routing first
    let response = handleI18nRouting(request);

    // Refresh Supabase session so it doesn't expire mid-visit
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    for (const {
                        name,
                        value,
                    } of cookiesToSet) {
                        request.cookies.set(name, value);
                    }
                    response = NextResponse.next({
                        request,
                    });
                    for (const {
                        name,
                        value,
                        options,
                    } of cookiesToSet) {
                        response.cookies.set(
                            name,
                            value,
                            options,
                        );
                    }
                },
            },
        },
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Restricted routes check
    const { pathname } = request.nextUrl;
    const isRestrictedTarget =
        pathname.includes("/card-scraper") ||
        pathname.includes("/ebay");

    if (isRestrictedTarget) {
        let isAdmin = false;

        if (user) {
            const { data: profile } = await supabase
                .from("users")
                .select("role")
                .eq("id", user.id)
                .single();

            if (profile?.role === 2) {
                isAdmin = true;
            }
        }

        if (!isAdmin) {
            // Redirect to home if not admin
            const url = request.nextUrl.clone();
            url.pathname = "/";
            return NextResponse.redirect(url);
        }
    }

    return response;
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};
