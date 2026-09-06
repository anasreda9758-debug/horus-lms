import type { AppLocale } from "@/components/locale-provider";

const englishDescriptions: Record<string, string> = {
  "aeh-101": "Integrated anatomy, embryology, and histology for the first term.",
  "ppg-102": "Core pharmacology, molecular biology, and physiology for the first term.",
  "pmb-103": "Foundations of pathology, microbiology, and biochemistry.",
  "mt-104": "Medical terminology and professional communication.",
  "en-105": "English for medical study and clinical communication.",
  "rs-201": "Respiratory system structure, function, and clinical integration.",
  "cvs-202": "Cardiovascular system anatomy, physiology, and clinical concepts.",
  "rau-203": "Renal and urinary system development, anatomy, and physiology.",
  "ibl-204": "Immune, blood, and lymphatic systems with applied physiology.",
  "uni-205": "Community medicine and university requirements.",
};

export function moduleDescription(slug: string, fallback: string | null, locale: AppLocale) {
  return locale === "en" ? englishDescriptions[slug] ?? fallback : fallback;
}
