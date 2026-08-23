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

// Strips browser-extension-injected attributes (Bitdefender: bis_skin_checked,
// bis_register, __processed_*) before React hydration so SSR/CSR trees match.
function extensionCleanup() {
  const PREFIXES = ["bis_", "__processed_"] as const;
  function isExt(name: string): boolean {
    const lower = name.toLowerCase();
    return PREFIXES.some((p) => lower.indexOf(p) === 0);
  }
  function strip(el: Element | null): void {
    if (!el || !el.removeAttribute) return;
    for (const attr of Array.from(el.attributes)) {
      if (isExt(attr.name)) el.removeAttribute(attr.name);
    }
  }
  function sweep(root: (Element & { querySelectorAll?: Element["querySelectorAll"] }) | null): void {
    strip(root);
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll("*").forEach(strip);
  }
  sweep(document.documentElement);
  if (document.body) sweep(document.body);
  try {
    const mo = new MutationObserver(function (muts) {
      for (const m of muts) {
        if (m.type === "attributes") {
          strip(m.target as Element);
        } else if (m.type === "childList" && m.addedNodes) {
          m.addedNodes.forEach(function (n) {
            if (n.nodeType === 1) sweep(n as Element);
          });
        }
      }
    });
    mo.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
    setTimeout(function () { mo.disconnect(); }, 15000);
  } catch {}
}

const EXTENSION_CLEANUP =
  "(" +
  extensionCleanup
    .toString()
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ") +
  ")();";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <Script id="extension-artifact-cleanup" strategy="beforeInteractive">
          {EXTENSION_CLEANUP}
        </Script>
        {children}
      </body>
    </html>
  );
}
