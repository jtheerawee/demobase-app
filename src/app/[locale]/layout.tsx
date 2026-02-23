import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

import {
    ColorSchemeScript,
    MantineProvider,
    mantineHtmlProps,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
    title: "demobase-app",
    description: "Next.js + Mantine + Supabase + next-intl",
};

export default async function LocaleLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const messages = await getMessages();
    const fontFamily = process.env.NEXT_PUBLIC_FONT_FAMILY ?? "Kanit";
    const fontUrl = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, "+")}:wght@400;700;900&display=swap`;

    return (
        <html lang={locale} {...mantineHtmlProps}>
            <head>
                <ColorSchemeScript />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link
                    rel="preconnect"
                    href="https://fonts.gstatic.com"
                    crossOrigin=""
                />
                <link href={fontUrl} rel="stylesheet" />
            </head>
            <body>
                <MantineProvider
                    theme={{ fontFamily: `'${fontFamily}', sans-serif` }}
                >
                    <NextIntlClientProvider messages={messages}>
                        <Notifications />
                        <div style={{ maxWidth: "80%", margin: "0 auto" }}>
                            <Navbar />
                            {children}
                        </div>
                    </NextIntlClientProvider>
                </MantineProvider>
            </body>
        </html>
    );
}
