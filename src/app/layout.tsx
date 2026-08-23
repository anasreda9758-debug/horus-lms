import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "منصة التعلم الذكية",
  description: "منصة تعليمية ذكية لطلاب الطب — منهج منظّم، محاضرات، اختبارات، ومساعد ذكي",
};

// NOTE: the extension-artifact cleanup lives in public/ext-cleanup.js and is
// loaded below with next/script beforeInteractive. An inline <Script> body
// triggers React's "script tag while rendering" dev error, so it must stay
// external.

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <Script src="/ext-cleanup.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
