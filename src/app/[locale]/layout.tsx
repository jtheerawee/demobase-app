import "@mantine/core/styles.css";

import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from "@mantine/core";
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

  return (
    <html lang={locale} {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider>
          <NextIntlClientProvider messages={messages}>
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
