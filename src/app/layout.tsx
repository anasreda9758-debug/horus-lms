import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import { cookies } from "next/headers";
import { LocaleProvider, type AppLocale } from "@/components/locale-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Horus MED — Medical Learning Platform",
  description: "A structured learning platform for medical students: lectures, practice, and study tools.",
};

// NOTE: the extension-artifact cleanup lives in public/ext-cleanup.js and is
// loaded below with next/script beforeInteractive. An inline <Script> body
// triggers React's "script tag while rendering" dev error, so it must stay
// external.

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const locale: AppLocale = cookieStore.get("horus_locale")?.value === "ar" ? "ar" : "en";
  const theme = cookieStore.get("horus_theme")?.value === "light" ? "light" : "dark";
  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={`h-full antialiased ${theme === "dark" ? "dark" : ""}`}
      style={{ colorScheme: theme }}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <Script src="/ext-cleanup.js" strategy="beforeInteractive" />
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
