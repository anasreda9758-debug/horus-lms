import type { Metadata } from "next";
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
const EXTENSION_CLEANUP = `(function () {
  var PREFIXES = ["bis_", "__processed_"];
  function isExt(name) {
    name = name.toLowerCase();
    for (var i = 0; i < PREFIXES.length; i++) {
      if (name.indexOf(PREFIXES[i]) === 0) return true;
    }
    return false;
  }
  function strip(el) {
    if (!el || !el.attributes || !el.removeAttribute) return;
    var attrs = [].slice.call(el.attributes);
    for (var i = 0; i < attrs.length; i++) {
      if (isExt(attrs[i].name)) el.removeAttribute(attrs[i].name);
    }
  }
  function sweep(root) {
    strip(root);
    if (!root || !root.querySelectorAll) return;
    var els = root.querySelectorAll("*");
    for (var i = 0; i < els.length; i++) strip(els[i]);
  }
  sweep(document.documentElement);
  if (document.body) sweep(document.body);
  try {
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === "attributes") {
          strip(m.target);
        } else if (m.type === "childList" && m.addedNodes) {
          for (var j = 0; j < m.addedNodes.length; j++) sweep(m.addedNodes[j]);
        }
      }
    });
    mo.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
    setTimeout(function () { mo.disconnect(); }, 15000);
  } catch (e) {}
})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: EXTENSION_CLEANUP }} />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
