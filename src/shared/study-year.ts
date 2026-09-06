import { cookies } from "next/headers";

export async function getSelectedStudyYear(): Promise<number> {
  const value = Number((await cookies()).get("horus_study_year")?.value);
  return Number.isInteger(value) && value > 0 ? value : 1;
}

export function getStudyYearLabel(year: number, locale: "en" | "ar") {
  return locale === "ar" ? `السنة الدراسية ${year}` : `Academic year ${year}`;
}
