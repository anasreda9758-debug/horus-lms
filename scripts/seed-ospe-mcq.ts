import { seedBank } from "./seed-utils";

import { questions as ahe101 } from "./ospe/ahe-ospe";
import { questions as ppg102 } from "./ospe/ppg-ospe";
import { questions as pmb103 } from "./ospe/pmb-ospe";
import { questions as mt104 } from "./ospe/mt-ospe";
import { questions as en105 } from "./ospe/en-ospe";
import { questions as rs201 } from "./ospe/resp-ospe";
import { questions as cvs202 } from "./ospe/cvs-ospe";
import { questions as rau203 } from "./ospe/renal-ospe";
import { questions as ibl204 } from "./ospe/ibl-ospe";
import { questions as uni205 } from "./ospe/uni-ospe";

const banks = [
  { moduleSlug: "ahe-101", bankSlug: "ospe-ahe", bankTitle: "OSPE AEH — Anatomy, Embryology & Histology", questions: ahe101 },
  { moduleSlug: "ppg-102", bankSlug: "ospe-ppg", bankTitle: "OSPE PPG — Pharmacology, Molecular Biology & Physiology", questions: ppg102 },
  { moduleSlug: "pmb-103", bankSlug: "ospe-pmb", bankTitle: "OSPE PMB — Pathology, Microbiology & Biochemistry", questions: pmb103 },
  { moduleSlug: "mt-104", bankSlug: "ospe-mt", bankTitle: "OSPE MT — Medical Terminology", questions: mt104 },
  { moduleSlug: "en-105", bankSlug: "ospe-en", bankTitle: "OSPE EN — English Language", questions: en105 },
  { moduleSlug: "rs-201", bankSlug: "ospe-resp", bankTitle: "OSPE Respiratory — Clinical Identification Stations", questions: rs201 },
  { moduleSlug: "cvs-202", bankSlug: "ospe-cvs", bankTitle: "OSPE CVS — Clinical Identification Stations", questions: cvs202 },
  { moduleSlug: "rau-203", bankSlug: "ospe-renal", bankTitle: "OSPE Renal — Clinical Identification Stations", questions: rau203 },
  { moduleSlug: "ibl-204", bankSlug: "ospe-ibl", bankTitle: "OSPE IBL — Immune, Blood & Lymphatic", questions: ibl204 },
  { moduleSlug: "uni-205", bankSlug: "ospe-uni", bankTitle: "OSPE UNI — Community Health Issues", questions: uni205 },
];

async function main() {
  const overwrite = process.env.SEED_OVERWRITE === "1";

  console.log("[seed-ospe-mcq] Seeding all OSPE question banks...\n");

  let ok = true;
  for (const b of banks) {
    const r = await seedBank({ ...b, overwrite });
    if (!r) ok = false;
  }

  const total = banks.reduce((sum, b) => sum + b.questions.length, 0);
  console.log(`\n[seed-ospe-mcq] Total: ${total} OSPE questions across ${banks.length} banks`);

  if (ok) {
    console.log("[seed-ospe-mcq] All banks seeded successfully.");
  } else {
    console.log("[seed-ospe-mcq] Some banks failed.");
  }

  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error("[seed-ospe-mcq] error:", err);
  process.exit(1);
});
