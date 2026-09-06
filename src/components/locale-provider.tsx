"use client";

import { createContext, useContext } from "react";

export type AppLocale = "en" | "ar";

const LocaleContext = createContext<AppLocale>("en");

export function LocaleProvider({ locale, children }: { locale: AppLocale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const locale = useContext(LocaleContext);
  return {
    locale,
    isArabic: locale === "ar",
    t: (english: string, arabic: string) => (locale === "ar" ? arabic : english),
  };
}
