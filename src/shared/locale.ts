import { cookies } from "next/headers";
import type { AppLocale } from "@/components/locale-provider";

export async function getLocale(): Promise<AppLocale> {
  return (await cookies()).get("horus_locale")?.value === "ar" ? "ar" : "en";
}

export function localize(locale: AppLocale, english: string, arabic: string) {
  return locale === "ar" ? arabic : english;
}
